/**
 * PRODUCTION-READY ERROR HANDLER
 * Always returns clean, user-friendly English messages
 * NEVER exposes technical details, stack traces, or code errors to clients
 */

// Map of technical error messages to user-friendly messages
const errorMessageMap = {
  // Database errors
  'Unique constraint failed': 'This item already exists',
  'Foreign key constraint failed': 'Cannot complete action - related data exists',
  'Record to update not found': 'The item you are looking for does not exist',
  'Record not found': 'Item not found',

  // Auth errors
  'Invalid token': 'Your session has expired. Please login again',
  'Token expired': 'Your session has expired. Please login again',
  'jwt malformed': 'Your session is invalid. Please login again',
  'jwt expired': 'Your session has expired. Please login again',

  // Connection errors
  'ECONNREFUSED': 'Unable to connect to the system. Please try again',
  'ETIMEDOUT': 'Request timed out. Please check your connection',
  'ENOTFOUND': 'Service unavailable. Please try again later',

  // Validation errors
  'required': 'Please fill in all required fields',
  'invalid email': 'Please enter a valid email address',
  'invalid phone': 'Please enter a valid phone number',
};

// Check if error message contains technical jargon
function sanitizeErrorMessage(message) {
  if (!message) return 'An error occurred. Please try again';

  // Check if message is user-friendly (doesn't contain technical terms)
  const technicalTerms = [
    'prisma', 'sql', 'query', 'schema', 'undefined', 'null',
    'function', 'class', 'object', 'array', 'stack', 'trace',
    'P2002', 'P2025', 'P2003', 'ECONNREFUSED', 'ETIMEDOUT',
    'mongoose', 'mongodb', 'postgres', 'mysql', 'redis'
  ];

  const lowerMessage = message.toLowerCase();
  const hasTechnicalTerm = technicalTerms.some(term => lowerMessage.includes(term));

  if (hasTechnicalTerm) {
    return 'An error occurred. Please contact support if this persists';
  }

  // Check against known error mappings
  for (const [technicalMsg, userMsg] of Object.entries(errorMessageMap)) {
    if (lowerMessage.includes(technicalMsg.toLowerCase())) {
      return userMsg;
    }
  }

  return message;
}

module.exports = (err, req, res, next) => {
  // Log full error details for developers (only in server logs)
  console.error('🚨 [Error Handler]:', {
    message: err.message,
    code: err.code,
    name: err.name,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // === AUTHENTICATION ERRORS ===
  if (err.name === 'JsonWebTokenError' || err.name === 'jwt malformed') {
    return res.status(401).json({
      message: 'Your session is invalid. Please login again'
    });
  }

  if (err.name === 'TokenExpiredError' || err.name === 'jwt expired') {
    return res.status(401).json({
      message: 'Your session has expired. Please login again'
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Authentication required. Please login'
    });
  }

  // === DATABASE ERRORS (PRISMA) ===
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'This item already exists in the system'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      message: 'The item you are looking for does not exist'
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      message: 'Cannot complete action - related data exists'
    });
  }

  if (err.code === 'P2014') {
    return res.status(400).json({
      message: 'Invalid data provided. Please check your input'
    });
  }

  // === VALIDATION ERRORS ===
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Please fill in all required fields correctly'
    });
  }

  // === NETWORK/CONNECTION ERRORS ===
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      message: 'Unable to connect to the system. Please try again'
    });
  }

  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      message: 'Request timed out. Please check your connection'
    });
  }

  // === CUSTOM ERROR STATUS ===
  if (err.status === 403) {
    return res.status(403).json({
      message: err.message || 'You do not have permission to perform this action'
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      message: err.message || 'The item you are looking for does not exist'
    });
  }

  if (err.status === 400) {
    return res.status(400).json({
      message: sanitizeErrorMessage(err.message)
    });
  }

  // === DEFAULT ERROR (CATCH-ALL) ===
  // Always sanitize the message - never expose technical details
  const statusCode = err.status || err.statusCode || 500;
  const userMessage = sanitizeErrorMessage(err.message);

  res.status(statusCode).json({
    message: userMessage || 'Something went wrong. Please try again'
  });
};