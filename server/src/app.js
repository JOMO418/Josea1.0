const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes (same directory level)
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const transferRoutes = require('./routes/transfers');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');
const branchRoutes = require('./routes/branches');
const procurementRoutes = require('./routes/procurement');
const settingsRoutes = require('./routes/settings');
const mpesaRoutes = require('./routes/mpesa');
const adminAIRoutes = require('./routes/adminAI.routes');
const managerAIRoutes = require('./routes/managerAI.routes');

// Import middleware (same directory level)
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ===== CORS CONFIGURATION (MUST BE FIRST) =====
// Allow frontend on multiple ports (Vite auto-selects available port)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
  'https://josea1-0.vercel.app',
  'http://localhost:3001',
  'http://localhost:5173'
];

// Enhanced CORS configuration with proper origin validation
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-branch-id'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security middleware (after CORS)
app.use(helmet());

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is secure (HTTPS)
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.status(403).json({
        error: 'HTTPS Required',
        message: 'This API requires HTTPS in production. Please use https:// instead of http://'
      });
    }
    next();
  });
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/settings', settingsRoutes);
// M-Pesa routes - use /api/payment to avoid Safaricom "URL contains MPESA" validation error
app.use('/api/payment', mpesaRoutes);
app.use('/api/mpesa', mpesaRoutes); // Keep for backward compatibility

// AI Routes - Josea AI Assistant
app.use('/api/admin-ai', adminAIRoutes);
app.use('/api/manager-ai', managerAIRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;