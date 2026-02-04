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

exports.updateProduct = async (req, res, next) => {
  try {
    const { inventoryUpdates, supplierId, buyingPrice, ...productData } = req.body;

    console.log('📦 Product Update Request:', {
      productId: req.params.id,
      productData,
      inventoryUpdates,
      supplierId,
      buyingPrice,
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

    // Use transaction for atomic updates with audit trail
    const result = await prisma.$transaction(async (tx) => {
      // STEP 1: Update product fields (standard fields like name, costPrice, sellingPrice)
      const product = await tx.product.update({
        where: { id: req.params.id },
        data: productData,
      });

      console.log('✅ Product updated:', product.id);

      // STEP 2: Handle inventory updates with audit trail
      if (inventoryUpdates && Array.isArray(inventoryUpdates)) {
        console.log(`📊 Processing ${inventoryUpdates.length} inventory updates`);

        for (const update of inventoryUpdates) {
          const { branchId, quantity, sellingPrice, lowStockThreshold, isActive } = update;

          if (!branchId) {
            console.warn('⚠️ Skipping update with no branchId');
            continue; // Skip invalid updates
          }

          console.log(`🔄 Processing branch ${branchId}:`, update);

          // Fetch current inventory record for this branch
          const currentInventory = await tx.inventory.findUnique({
            where: {
              productId_branchId: {
                productId: req.params.id,
                branchId: branchId,
              },
            },
          });

          console.log('📋 Current inventory:', currentInventory);

          // Build update data object
          const updateData = {};

          // Handle visibility toggle
          if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
          }

          // Handle quantity update with audit trail
          if (quantity !== undefined) {
            const newQuantity = Number(quantity);
            const currentQuantity = currentInventory?.quantity || 0;
            const diff = newQuantity - currentQuantity;

            console.log(`📦 Stock change: ${currentQuantity} → ${newQuantity} (diff: ${diff})`);

            // Update quantity
            updateData.quantity = newQuantity;

            // Create StockMovement audit record if quantity changed
            if (diff !== 0 && currentInventory) {
              console.log('📝 Creating stock movement record');
              try {
                await tx.stockMovement.create({
                  data: {
                    productId: req.params.id,
                    inventoryId: currentInventory.id,
                    branchId: branchId,
                    userId: req.user.id,
                    type: 'ADJUSTMENT',
                    quantity: diff,
                    notes: 'Manual adjustment via System Registry',
                  },
                });
                console.log('✅ Stock movement created');
              } catch (stockMoveError) {
                console.error('❌ Stock movement creation failed:', stockMoveError);
                throw stockMoveError;
              }
            }

            // Update lastRestockAt if quantity increased
            if (diff > 0) {
              updateData.lastRestockAt = new Date();
            }
          }

          // Handle pricing updates
          if (sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== '') {
            updateData.sellingPrice = Number(sellingPrice);
          }
          if (lowStockThreshold !== undefined && lowStockThreshold !== null && lowStockThreshold !== '') {
            updateData.lowStockThreshold = Number(lowStockThreshold);
          }

          console.log('💾 Update data:', updateData);

          // Build create data object (for new inventory records)
          const createData = {
            productId: req.params.id,
            branchId: branchId,
            quantity: quantity !== undefined ? Number(quantity) : 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            sellingPrice: sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== '' ? Number(sellingPrice) : null,
            lowStockThreshold: lowStockThreshold !== undefined && lowStockThreshold !== null && lowStockThreshold !== '' ? Number(lowStockThreshold) : null,
            lastRestockAt: quantity !== undefined && Number(quantity) > 0 ? new Date() : null,
          };

          console.log('🆕 Create data (if new):', createData);

          // Update or create inventory record for this branch
          const updatedInventory = await tx.inventory.upsert({
            where: {
              productId_branchId: {
                productId: req.params.id,
                branchId: branchId,
              },
            },
            update: updateData,
            create: createData,
          });

          console.log('✅ Inventory upserted:', updatedInventory.id);

          // Create initial stock movement for new inventory records
          if (!currentInventory && quantity !== undefined && Number(quantity) > 0) {
            console.log('📝 Creating initial stock movement for new inventory');
            try {
              await tx.stockMovement.create({
                data: {
                  productId: req.params.id,
                  inventoryId: updatedInventory.id,
                  branchId: branchId,
                  userId: req.user.id,
                  type: 'INITIAL_ADD',
                  quantity: Number(quantity),
                  notes: 'Initial stock via System Registry',
                },
              });
              console.log('✅ Initial stock movement created');
            } catch (stockMoveError) {
              console.error('❌ Initial stock movement creation failed:', stockMoveError);
              throw stockMoveError;
            }
          }
        }
      }

      // STEP 3: Handle SupplierProduct upsert if supplier info is provided
      if (supplierId && buyingPrice !== undefined && buyingPrice !== null) {
        console.log(`🚚 Processing SupplierProduct: supplierId=${supplierId}, buyingPrice=${buyingPrice}`);

        // Validate supplierId exists
        const supplierExists = await tx.supplier.findUnique({
          where: { id: supplierId },
        });

        if (supplierExists) {
          // Upsert SupplierProduct record
          await tx.supplierProduct.upsert({
            where: {
              supplierId_productId: {
                supplierId: supplierId,
                productId: req.params.id,
              },
            },
            update: {
              wholesalePrice: Number(buyingPrice),
              isAvailable: true,
              lastUpdated: new Date(),
              notes: 'Updated from Global Inventory',
            },
            create: {
              supplierId: supplierId,
              productId: req.params.id,
              wholesalePrice: Number(buyingPrice),
              currency: 'KES',
              isAvailable: true,
              notes: 'Auto-linked from Global Inventory',
            },
          });
          console.log(`✅ SupplierProduct upserted for product ${req.params.id}`);
        } else {
          console.warn(`⚠️ Supplier ${supplierId} not found, skipping SupplierProduct update`);
        }
      }

      // Fetch updated product with inventory and supplier products
      return await tx.product.findUnique({
        where: { id: req.params.id },
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
    });

    console.log('✅ Transaction completed successfully');

    // Create audit log (outside transaction for performance)
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: result.id,
        oldValue: oldProduct,
        newValue: result,
        ipAddress: req.ipAddress,
      },
    });

    // Clear cache
    await cache.delPattern('products:*');

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Product update error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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