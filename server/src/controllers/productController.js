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

exports.createProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.create({
      data: req.body,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: product.id,
        newValue: product,
        ipAddress: req.ipAddress,
      },
    });

    // Clear cache
    await cache.delPattern('products:*');

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const oldProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: product.id,
        oldValue: oldProduct,
        newValue: product,
        ipAddress: req.ipAddress,
      },
    });

    await cache.delPattern('products:*');

    res.json(product);
  } catch (error) {
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