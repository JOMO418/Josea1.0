/**
 * AI Query Validation Utilities
 * Validates and sanitizes AI queries for security
 */

/**
 * Validate AI query for security threats
 * @param {string} query - User query to validate
 * @param {string} userRole - User's role (ADMIN, MANAGER)
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateAIQuery(query, userRole) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }

  const trimmedQuery = query.trim();

  // Check minimum length
  if (trimmedQuery.length < 2) {
    return { valid: false, error: 'Query is too short' };
  }

  // Check maximum length (already done in controllers, but double-check)
  if (trimmedQuery.length > 1000) {
    return { valid: false, error: 'Query exceeds maximum length of 1000 characters' };
  }

  // SECURITY: Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\bDROP\s+TABLE\b)/i,
    /(\bDELETE\s+FROM\b)/i,
    /(\bINSERT\s+INTO\b)/i,
    /(\bUPDATE\s+\w+\s+SET\b)/i,
    /(\bEXEC\b|\bEXECUTE\b)/i,
    /(\bUNION\s+SELECT\b)/i,
    /(;\s*DROP\s+)/i,
    /('--|\b--)/,
    /(\bOR\s+1\s*=\s*1\b)/i,
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        valid: false,
        error: 'Query contains potentially malicious SQL patterns',
      };
    }
  }

  // SECURITY: Check for script injection (XSS)
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick=, onload=, etc.
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        valid: false,
        error: 'Query contains potentially malicious script patterns',
      };
    }
  }

  // SECURITY: Check for command injection
  const commandInjectionPatterns = [
    /(\||;|`|\$\(|\$\{)/,
    /(\bsh\b|\bbash\b|\bcmd\b)/i,
    /(&&|\|\|)/,
  ];

  for (const pattern of commandInjectionPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        valid: false,
        error: 'Query contains potentially malicious command patterns',
      };
    }
  }

  // SECURITY: For managers, check for attempts to access other branches
  if (userRole === 'MANAGER') {
    const suspiciousBranchQueries = [
      /\ball\s+branches\b/i,
      /\bother\s+branch/i,
      /\beverywhere\b/i,
      /\bglobal\b/i,
      /\bentire\s+company\b/i,
      /\bcompany\s+wide\b/i,
      /\bacross\s+all\b/i,
    ];

    for (const pattern of suspiciousBranchQueries) {
      if (pattern.test(trimmedQuery)) {
        return {
          valid: false,
          error: 'Managers can only access data from their assigned branch',
        };
      }
    }
  }

  // SECURITY: Check for excessive data requests
  const excessiveDataPatterns = [
    /\ball\s+customers?\b/i,
    /\bevery\s+(customer|sale|transaction)\b/i,
    /\bcomplete\s+list\b/i,
    /\bfull\s+database\b/i,
  ];

  let hasExcessiveRequest = false;
  for (const pattern of excessiveDataPatterns) {
    if (pattern.test(trimmedQuery)) {
      hasExcessiveRequest = true;
      break;
    }
  }

  // If excessive data request, warn but don't block (AI will handle with summaries)
  if (hasExcessiveRequest) {
    console.warn('⚠️ Query requests extensive data, AI will provide summary');
  }

  // SECURITY: Check for attempts to bypass system prompts
  const promptInjectionPatterns = [
    /ignore\s+(previous|above|system|all)/i,
    /forget\s+(previous|above|system|all)/i,
    /disregard\s+(previous|above|system|all)/i,
    /you\s+are\s+now/i,
    /new\s+instructions?:/i,
    /system\s+prompt/i,
    /act\s+as\s+if/i,
  ];

  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        valid: false,
        error: 'Query contains patterns that attempt to bypass security instructions',
      };
    }
  }

  // All checks passed
  return { valid: true };
}

/**
 * Sanitize query string
 * Removes potentially harmful characters while preserving meaning
 * @param {string} query - Query to sanitize
 * @returns {string} - Sanitized query
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return '';

  // Trim whitespace
  let sanitized = query.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

module.exports = {
  validateAIQuery,
  sanitizeQuery,
};
