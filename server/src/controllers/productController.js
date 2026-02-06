const prisma = require('../utils/prisma');
const cache = require('../utils/cache');

exports.getProducts = async (req, res, next) => {
  try {
    const {
      search,
      vehicleMake,
      vehicleModel,
      category,
      page = 1,
      limit = 50,
    } = req.query;

    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (vehicleMake) where.vehicleMake = vehicleMake;
    if (vehicleModel) where.vehicleModel = vehicleModel;
    if (category) where.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // CRITICAL: Get branchId from authenticated user
    const branchId = req.user?.branchId;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          // CRITICAL: Include inventory filtered by user's branch
          inventory: branchId ? {
            where: {
              branchId: branchId,
            },
          } : true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        inventory: {
          include: { branch: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * Create Product with Smart Distribution
 * Supports creating a product with initial inventory across multiple branches
 * in a single atomic transaction
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { distribution, supplierId, buyingPrice, ...productData } = req.body;

    // Validate required product fields
    if (!productData.name || !productData.partNumber) {
      return res.status(400).json({
        success: false,
        message: 'Product name and part number are required',
      });
    }

    // Validate distribution array if provided
    if (distribution && !Array.isArray(distribution)) {
      return res.status(400).json({
        success: false,
        message: 'Distribution must be an array',
      });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // STEP 1: Create the Product with global defaults
      const product = await tx.product.create({
        data: {
          name: productData.name,
          partNumber: productData.partNumber,
          vehicleMake: productData.vehicleMake || null,
          vehicleModel: productData.vehicleModel || null,
          vehicleEngine: productData.vehicleEngine || null,
          description: productData.description || null,
          category: productData.category || 'GENERAL',
          costPrice: Number(productData.costPrice) || 0,
          sellingPrice: Number(productData.sellingPrice) || 0,
          minPrice: Number(productData.minPrice) || Number(productData.costPrice) || 0,
          lowStockThreshold: Number(productData.lowStockThreshold) || 5,
          isActive: productData.isActive !== false, // Default to true
        },
      });

      // STEP 2: Create Inventory Records for each branch in distribution
      const inventoryRecords = [];

      if (distribution && distribution.length > 0) {
        for (const dist of distribution) {
          // Only create inventory if branch is active in distribution
          if (dist.isActive !== false && dist.branchId) {
            // Validate branchId exists
            const branchExists = await tx.branch.findUnique({
              where: { id: dist.branchId },
            });

            if (!branchExists) {
              throw new Error(`Branch with ID ${dist.branchId} not found`);
            }

            // Create inventory record with branch-specific values
            const inventory = await tx.inventory.create({
              data: {
                productId: product.id,
                branchId: dist.branchId,
                quantity: Number(dist.quantity) || 0,
                // Use branch-specific price if provided, otherwise use global
                sellingPrice: dist.sellingPrice !== undefined && dist.sellingPrice !== null
                  ? Number(dist.sellingPrice)
                  : null,
                // Use branch-specific threshold if provided
                lowStockThreshold: dist.lowStockThreshold !== undefined && dist.lowStockThreshold !== null
                  ? Number(dist.lowStockThreshold)
                  : null,
                lastRestockAt: Number(dist.quantity) > 0 ? new Date() : null,
              },
              include: {
                branch: true,
              },
            });

            inventoryRecords.push(inventory);
          }
        }
      }

      // STEP 3: Create SupplierProduct record if supplier info is provided
      let supplierProductCreated = false;
      if (supplierId && buyingPrice !== undefined && buyingPrice !== null) {
        // Validate supplierId exists
        const supplierExists = await tx.supplier.findUnique({
          where: { id: supplierId },
        });

        if (supplierExists) {
          await tx.supplierProduct.create({
            data: {
              supplierId: supplierId,
              productId: product.id,
              wholesalePrice: Number(buyingPrice),
              currency: 'KES', // Default currency
              isAvailable: true,
              notes: 'Auto-linked from Global Inventory',
            },
          });
          supplierProductCreated = true;
          console.log(`✅ SupplierProduct created: ${product.name} -> ${supplierExists.name}`);
        } else {
          console.warn(`⚠️ Supplier ${supplierId} not found, skipping SupplierProduct creation`);
        }
      }

      // Fetch the complete product with all inventory and supplier relations
      const completeProduct = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          inventory: {
            include: {
              branch: true,
            },
          },
          supplierProducts: {
            include: {
              supplier: true,
            },
          },
        },
      });

      return {
        product: completeProduct,
        inventoryCreated: inventoryRecords.length,
        supplierProductCreated,
      };
    });

    // Create audit log (outside transaction for performance)
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: result.product.id,
        newValue: result.product,
        ipAddress: req.ipAddress,
      },
    });

    // Clear cache
    await cache.delPattern('products:*');

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Product created successfully with distribution',
      data: result.product,
      meta: {
        inventoryRecordsCreated: result.inventoryCreated,
        supplierProductCreated: result.supplierProductCreated,
      },
    });
  } catch (error) {
    // Log detailed error for debugging
    console.error('❌ Product creation error:', error);

    // Send sanitized error to client
    res.status(500).json({
      success: false,
      message: 'Unable to create product. Please check your inputs and try again.',
    });
  }
};

const { uploadImage, deleteImage } = require('../config/cloudinary');

exports.updateProduct = async (req, res, next) => {
  try {
    const { inventoryUpdates, supplierId, buyingPrice, imageData, ...productData } = req.body;

    console.log('📦 Product Update Request:', {
      productId: req.params.id,
      productData,
      inventoryUpdates,
      supplierId,
      buyingPrice,
      hasImageData: !!imageData,
      userId: req.user?.id,
    });

    // Fetch old product for audit trail
    const oldProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        inventory: true,
      },
    });

    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // ✨ NEW: Handle Cloudinary image upload
    if (imageData) {
      try {
        console.log('📸 Uploading image to Cloudinary...');
        
        // Delete old image from Cloudinary if it exists
        if (oldProduct.imageUrl && oldProduct.imageUrl.includes('cloudinary.com')) {
          console.log('🗑️ Deleting old image from Cloudinary...');
          await deleteImage(oldProduct.imageUrl);
        }

        // Generate custom filename from part number or product name
        const customFilename = (productData.partNumber || oldProduct.partNumber || productData.name || oldProduct.name)
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase()
          .substring(0, 50);

        // Upload new image to Cloudinary
        const cloudinaryUrl = await uploadImage(
          imageData,
          'products', // folder name
          customFilename // custom filename
        );

        // Update productData with Cloudinary URL
        productData.imageUrl = cloudinaryUrl;
        
        console.log('✅ Image uploaded to Cloudinary:', cloudinaryUrl);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload failed:', uploadError);
        // Don't fail the entire request, just log the error
        // The product will update without the image
      }
    }

    // Use transaction for atomic updates with audit trail
    const result = await prisma.$transaction(async (tx) => {
      // STEP 1: Update product fields (standard fields like name, costPrice, sellingPrice)
      const product = await tx.product.update({
        where: { id: req.params.id },
        data: productData,
      });

      // STEP 2: Handle inventory updates (branch-specific quantities and visibility)
      if (inventoryUpdates && Array.isArray(inventoryUpdates)) {
        console.log('📊 Processing inventory updates:', inventoryUpdates.length);

        for (const update of inventoryUpdates) {
          const { branchId, quantityChange, isActive, sellingPrice, lowStockThreshold } = update;

          // Find existing inventory record
          const existingInventory = await tx.inventory.findUnique({
            where: {
              productId_branchId: {
                productId: req.params.id,
                branchId: branchId,
              },
            },
          });

          if (existingInventory) {
            // Calculate new quantity
            const currentQty = existingInventory.quantity || 0;
            const changeAmount = quantityChange || 0;
            const newQuantity = Math.max(0, currentQty + changeAmount);

            // Update existing inventory
            await tx.inventory.update({
              where: {
                productId_branchId: {
                  productId: req.params.id,
                  branchId: branchId,
                },
              },
              data: {
                quantity: newQuantity,
                isActive: isActive !== undefined ? isActive : existingInventory.isActive,
                sellingPrice: sellingPrice !== undefined ? sellingPrice : existingInventory.sellingPrice,
                lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : existingInventory.lowStockThreshold,
                lastRestockAt: changeAmount > 0 ? new Date() : existingInventory.lastRestockAt,
              },
            });

            // Create stock movement record if quantity changed
            if (changeAmount !== 0) {
              await tx.stockMovement.create({
                data: {
                  productId: req.params.id,
                  branchId: branchId,
                  quantity: changeAmount,
                  type: changeAmount > 0 ? 'IN' : 'OUT',
                  reason: changeAmount > 0 ? 'RESTOCK' : 'ADJUSTMENT',
                  userId: req.user?.id,
                },
              });
            }
          } else {
            // Create new inventory record for this branch
            await tx.inventory.create({
              data: {
                productId: req.params.id,
                branchId: branchId,
                quantity: Math.max(0, quantityChange || 0),
                isActive: isActive !== undefined ? isActive : true,
                sellingPrice: sellingPrice,
                lowStockThreshold: lowStockThreshold,
              },
            });
          }
        }
      }

      // STEP 3: Handle supplier product relationship
      if (supplierId && buyingPrice) {
        console.log('🔗 Updating supplier relationship...');

        const existingSupplierProduct = await tx.supplierProduct.findUnique({
          where: {
            supplierId_productId: {
              supplierId: supplierId,
              productId: req.params.id,
            },
          },
        });

        if (existingSupplierProduct) {
          await tx.supplierProduct.update({
            where: {
              supplierId_productId: {
                supplierId: supplierId,
                productId: req.params.id,
              },
            },
            data: {
              wholesalePrice: buyingPrice,
              lastUpdated: new Date(),
            },
          });
        } else {
          await tx.supplierProduct.create({
            data: {
              supplierId: supplierId,
              productId: req.params.id,
              wholesalePrice: buyingPrice,
            },
          });
        }
      }

      // STEP 4: Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'UPDATE_PRODUCT',
          entityType: 'Product',
          entityId: req.params.id,
          changes: {
            before: oldProduct,
            after: product,
          },
        },
      });

      return product;
    });

    console.log('✅ Product updated successfully:', result.id);

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: result,
    });
  } catch (error) {
    console.error('❌ Product update failed:', error);
    next(error);
  }
};
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PRODUCT_DELETED',
        entityType: 'Product',
        entityId: product.id,
        oldValue: product,
        ipAddress: req.ipAddress,
      },
    });

    await cache.delPattern('products:*');

    res.json({ message: 'Product deactivated' });
  } catch (error) {
    next(error);
  }
};

/**
 * Global Inventory Dashboard API
 * Fetches all products with global inventory distribution across branches
 */
exports.getGlobalProducts = async (req, res, next) => {
  try {
    const { search, lowStock, branchId } = req.query;

    // Build where clause
    const where = { isActive: true };

    // Search filter (name, partNumber, or vehicleMake)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { vehicleMake: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Branch-specific filter: Only show products that exist in this branch
    if (branchId) {
      where.inventory = {
        some: {
          branchId: branchId,
          OR: [
            { quantity: { gt: 0 } }, // Has stock in this branch
            { sellingPrice: { not: null } }, // Has custom price override
            { lowStockThreshold: { not: null } }, // Has custom threshold override
          ],
        },
      };
    }

    // Build inventory include clause
    const inventoryInclude = {
      include: {
        branch: true,
      },
    };

    // If filtering by branch, only include that branch's inventory
    if (branchId) {
      inventoryInclude.where = {
        branchId: branchId,
      };
    }

    // Fetch all products with inventory and branch relations
    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        inventory: inventoryInclude,
      },
    });

    // Data transformation - The Map
    const transformedProducts = products.map((product) => {
      // Calculate global quantity (sum of all inventory quantities)
      const globalQuantity = product.inventory.reduce(
        (sum, inv) => sum + Number(inv.quantity || 0),
        0
      );

      // Create distribution array with branch-specific data
      const distribution = product.inventory.map((inv) => ({
        branchId: inv.branch.id,
        branch: inv.branch.name,
        quantity: Number(inv.quantity || 0),
        sellingPrice: inv.sellingPrice ? Number(inv.sellingPrice) : null,
        lowStockThreshold: inv.lowStockThreshold !== null ? Number(inv.lowStockThreshold) : null,
        isActive: inv.isActive !== undefined ? Boolean(inv.isActive) : true,
      }));

      // Calculate low stock status
      const lowStockStatus = globalQuantity <= Number(product.lowStockThreshold || 0);

      // Calculate profit margin (using global selling price)
      const profitMargin = Number(product.sellingPrice || 0) - Number(product.costPrice || 0);

      return {
        id: product.id,
        name: product.name,
        partNumber: product.partNumber,
        vehicleMake: product.vehicleMake,
        vehicleModel: product.vehicleModel,
        category: product.category,
        imageUrl: product.imageUrl,
        costPrice: Number(product.costPrice || 0),
        sellingPrice: Number(product.sellingPrice || 0),
        lowStockThreshold: Number(product.lowStockThreshold || 0),
        globalQuantity,
        distribution,
        lowStockStatus,
        profitMargin,
        updatedAt: product.updatedAt,
        isActive: product.isActive,
      };
    });

    // Apply low stock filter if requested
    let filteredProducts = transformedProducts;
    if (lowStock === 'true') {
      filteredProducts = transformedProducts.filter((p) => p.lowStockStatus === true);
    }

    res.json({
      data: filteredProducts,
      total: filteredProducts.length,
    });
  } catch (error) {
    console.error('❌ Global products fetch error:', error);
    res.status(500).json({
      message: 'Failed to fetch global inventory',
      error: error.message,
    });
  }
};