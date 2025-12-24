const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.ipAddress = req.ip || req.connection.remoteAddress;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied: insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
};

exports.requireBranchAccess = (req, res, next) => {
  const { branchId } = req.params;
  
  // Owners and admins can access any branch
  if (req.user.role === 'OWNER' || req.user.role === 'ADMIN') {
    return next();
  }

  // Managers can only access their own branch
  if (req.user.branchId !== branchId) {
    return res.status(403).json({ 
      message: 'Access denied: cannot access other branches',
    });
  }

  next();
};