// ============================================
// M-PESA ERROR HANDLING UTILITIES
// ============================================

/**
 * M-Pesa error types
 */
export type MpesaErrorType =
  | 'INVALID_PHONE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_PIN'
  | 'USER_CANCELLED'
  | 'DUPLICATE_REQUEST'
  | 'SYSTEM_ERROR'
  | 'CALLBACK_TIMEOUT'
  | 'INVALID_AMOUNT'
  | 'ACCOUNT_BLOCKED'
  | 'TRANSACTION_DECLINED'
  | 'UNKNOWN_ERROR';

/**
 * Structured M-Pesa error object
 */
export interface MpesaError {
  type: MpesaErrorType;
  message: string;
  technicalMessage?: string;
  retryable: boolean;
  action: string;
  resultCode?: number;
}

/**
 * M-Pesa API result codes
 * Reference: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */
export const MPESA_RESULT_CODES = {
  // Success
  SUCCESS: 0,

  // User-related errors
  INSUFFICIENT_BALANCE: 1,
  WRONG_PIN: 2001,
  REQUEST_CANCELLED: 1032,
  INVALID_ACCOUNT: 1037,

  // Transaction errors
  TRANSACTION_TIMEOUT: 1037,
  DUPLICATE_REQUEST: 1001,
  TRANSACTION_FAILED: 1,
  INVALID_AMOUNT: 5,

  // System errors
  SYSTEM_BUSY: 9999,
  SYSTEM_ERROR: 1,
  INTERNAL_ERROR: 1001,
  SERVICE_UNAVAILABLE: 500,

  // Account errors
  ACCOUNT_BLOCKED: 17,
  ACCOUNT_NOT_ACTIVE: 8,

  // Request errors
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,

  // Customer action required
  CUSTOMER_INITIATED_CANCELLATION: 1032,
  DS_TIMEOUT: 1037,

  // Other common codes
  INITIATOR_INFORMATION_INVALID: 2006,
  SENDER_IDENTIFIER_TYPE_INVALID: 2007,
  INVALID_PHONE_NUMBER: 404,
} as const;

/**
 * Get user-friendly error message from M-Pesa result code
 *
 * @param resultCode - M-Pesa result code
 * @param resultDesc - Optional M-Pesa result description
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * const message = getMpesaErrorMessage(1032);
 * console.log(message); // "Payment was cancelled"
 * ```
 */
export function getMpesaErrorMessage(
  resultCode: number,
  resultDesc?: string
): string {
  // Map common result codes to user-friendly messages
  const errorMessages: Record<number, string> = {
    [MPESA_RESULT_CODES.SUCCESS]: 'Payment completed successfully',
    [MPESA_RESULT_CODES.INSUFFICIENT_BALANCE]:
      'Insufficient M-Pesa balance. Please top up your account and try again.',
    [MPESA_RESULT_CODES.WRONG_PIN]:
      'Incorrect M-Pesa PIN entered. Please try again with the correct PIN.',
    [MPESA_RESULT_CODES.REQUEST_CANCELLED]:
      'Payment was cancelled. Please try again if you wish to complete the payment.',
    [MPESA_RESULT_CODES.TRANSACTION_TIMEOUT]:
      'Payment request timed out. Please check your phone and try again.',
    [MPESA_RESULT_CODES.DUPLICATE_REQUEST]:
      'A similar payment request is already in progress. Please wait or try again later.',
    [MPESA_RESULT_CODES.SYSTEM_BUSY]:
      'M-Pesa system is currently busy. Please try again in a few moments.',
    [MPESA_RESULT_CODES.ACCOUNT_BLOCKED]:
      'Your M-Pesa account appears to be blocked. Please contact Safaricom customer care.',
    [MPESA_RESULT_CODES.ACCOUNT_NOT_ACTIVE]:
      'M-Pesa account is not active. Please activate your account and try again.',
    [MPESA_RESULT_CODES.INVALID_AMOUNT]:
      'Invalid payment amount. Please check the amount and try again.',
    [MPESA_RESULT_CODES.INVALID_PHONE_NUMBER]:
      'Invalid phone number. Please check the number and try again.',
    [MPESA_RESULT_CODES.SERVICE_UNAVAILABLE]:
      'M-Pesa service is temporarily unavailable. Please try again later.',
    [MPESA_RESULT_CODES.REQUEST_TIMEOUT]:
      'Request timed out. Please check your internet connection and try again.',
  };

  // Return mapped message or result description or generic error
  return (
    errorMessages[resultCode] ||
    resultDesc ||
    `Payment failed with code ${resultCode}. Please try again or contact support.`
  );
}

/**
 * Check if M-Pesa error is retryable
 *
 * @param resultCode - M-Pesa result code
 * @returns True if error can be retried
 *
 * @example
 * ```typescript
 * if (isRetryableError(1032)) {
 *   // Show retry button
 * }
 * ```
 */
export function isRetryableError(resultCode: number): boolean {
  // Errors that can be retried by the user
  const retryableErrors = [
    MPESA_RESULT_CODES.WRONG_PIN,
    MPESA_RESULT_CODES.REQUEST_CANCELLED,
    MPESA_RESULT_CODES.TRANSACTION_TIMEOUT,
    MPESA_RESULT_CODES.SYSTEM_BUSY,
    MPESA_RESULT_CODES.REQUEST_TIMEOUT,
    MPESA_RESULT_CODES.INSUFFICIENT_BALANCE,
    MPESA_RESULT_CODES.INVALID_AMOUNT,
  ];

  return retryableErrors.includes(resultCode as any);
}

/**
 * Get error type from M-Pesa result code
 *
 * @param resultCode - M-Pesa result code
 * @returns Error type
 *
 * @example
 * ```typescript
 * const type = getErrorType(2001);
 * console.log(type); // "INVALID_PIN"
 * ```
 */
export function getErrorType(resultCode: number): MpesaErrorType {
  // Map result codes to error types
  const typeMap: Record<number, MpesaErrorType> = {
    [MPESA_RESULT_CODES.INSUFFICIENT_BALANCE]: 'INSUFFICIENT_FUNDS',
    [MPESA_RESULT_CODES.WRONG_PIN]: 'INVALID_PIN',
    [MPESA_RESULT_CODES.REQUEST_CANCELLED]: 'USER_CANCELLED',
    [MPESA_RESULT_CODES.TRANSACTION_TIMEOUT]: 'TIMEOUT',
    [MPESA_RESULT_CODES.DUPLICATE_REQUEST]: 'DUPLICATE_REQUEST',
    [MPESA_RESULT_CODES.SYSTEM_BUSY]: 'SYSTEM_ERROR',
    [MPESA_RESULT_CODES.ACCOUNT_BLOCKED]: 'ACCOUNT_BLOCKED',
    [MPESA_RESULT_CODES.INVALID_PHONE_NUMBER]: 'INVALID_PHONE',
    [MPESA_RESULT_CODES.INVALID_AMOUNT]: 'INVALID_AMOUNT',
    [MPESA_RESULT_CODES.REQUEST_TIMEOUT]: 'NETWORK_ERROR',
    [MPESA_RESULT_CODES.SERVICE_UNAVAILABLE]: 'SYSTEM_ERROR',
  };

  return typeMap[resultCode] || 'UNKNOWN_ERROR';
}

/**
 * Get suggested action for user based on error code
 *
 * @param resultCode - M-Pesa result code
 * @returns Suggested action message
 *
 * @example
 * ```typescript
 * const action = getSuggestedAction(1);
 * console.log(action); // "Top up your M-Pesa account"
 * ```
 */
export function getSuggestedAction(resultCode: number): string {
  const actionMap: Record<number, string> = {
    [MPESA_RESULT_CODES.INSUFFICIENT_BALANCE]:
      'Top up your M-Pesa account and retry payment',
    [MPESA_RESULT_CODES.WRONG_PIN]:
      'Enter correct M-Pesa PIN when prompted',
    [MPESA_RESULT_CODES.REQUEST_CANCELLED]:
      'Complete payment when prompted on your phone',
    [MPESA_RESULT_CODES.TRANSACTION_TIMEOUT]:
      'Check your phone for M-Pesa prompt and complete payment quickly',
    [MPESA_RESULT_CODES.DUPLICATE_REQUEST]:
      'Wait a few moments before trying again',
    [MPESA_RESULT_CODES.SYSTEM_BUSY]:
      'Wait a moment and try again',
    [MPESA_RESULT_CODES.ACCOUNT_BLOCKED]:
      'Contact Safaricom customer care at 234 or visit M-Pesa shop',
    [MPESA_RESULT_CODES.ACCOUNT_NOT_ACTIVE]:
      'Activate your M-Pesa account by dialing *234#',
    [MPESA_RESULT_CODES.INVALID_AMOUNT]:
      'Check payment amount and try again',
    [MPESA_RESULT_CODES.INVALID_PHONE_NUMBER]:
      'Verify phone number is correct and try again',
    [MPESA_RESULT_CODES.REQUEST_TIMEOUT]:
      'Check your internet connection and try again',
  };

  return (
    actionMap[resultCode] ||
    'Try again or contact support if problem persists'
  );
}

/**
 * Main M-Pesa error handler
 * Converts various error types into structured MpesaError object
 *
 * @param error - Error object (from API call or other source)
 * @param resultCode - Optional M-Pesa result code
 * @param resultDesc - Optional M-Pesa result description
 * @returns Structured MpesaError object
 *
 * @example
 * ```typescript
 * try {
 *   await mpesaService.initiateMpesaPayment(...);
 * } catch (error) {
 *   const mpesaError = handleMpesaError(error);
 *   console.log(mpesaError.message);
 * }
 * ```
 */
export function handleMpesaError(
  error: any,
  resultCode?: number,
  resultDesc?: string
): MpesaError {
  // If we have a result code, use it
  if (resultCode !== undefined) {
    return {
      type: getErrorType(resultCode),
      message: getMpesaErrorMessage(resultCode, resultDesc),
      technicalMessage: resultDesc,
      retryable: isRetryableError(resultCode),
      action: getSuggestedAction(resultCode),
      resultCode,
    };
  }

  // Handle axios/network errors
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    // Check if response contains M-Pesa result code
    if (data?.ResultCode !== undefined) {
      return handleMpesaError(error, data.ResultCode, data.ResultDesc);
    }

    // Handle HTTP status codes
    if (status === 401 || status === 403) {
      return {
        type: 'SYSTEM_ERROR',
        message: 'Authentication failed. Please contact support.',
        technicalMessage: error.message,
        retryable: false,
        action: 'Contact support team',
      };
    }

    if (status === 404) {
      return {
        type: 'SYSTEM_ERROR',
        message: 'M-Pesa service not found. Please contact support.',
        technicalMessage: error.message,
        retryable: false,
        action: 'Contact support team',
      };
    }

    if (status === 408 || status === 504) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out. Please try again.',
        technicalMessage: error.message,
        retryable: true,
        action: 'Try again in a moment',
      };
    }

    if (status >= 500) {
      return {
        type: 'SYSTEM_ERROR',
        message: 'M-Pesa system error. Please try again later.',
        technicalMessage: error.message,
        retryable: true,
        action: 'Wait a few minutes and try again',
      };
    }

    // Generic HTTP error
    return {
      type: 'SYSTEM_ERROR',
      message: data?.message || 'Payment failed. Please try again.',
      technicalMessage: error.message,
      retryable: true,
      action: 'Try again or contact support',
    };
  }

  // Network error (no response received)
  if (error.request) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network error. Please check your internet connection.',
      technicalMessage: error.message,
      retryable: true,
      action: 'Check internet connection and try again',
    };
  }

  // Phone validation error
  if (error.message?.includes('phone')) {
    return {
      type: 'INVALID_PHONE',
      message: 'Invalid phone number format.',
      technicalMessage: error.message,
      retryable: true,
      action: 'Check phone number and try again',
    };
  }

  // Amount validation error
  if (error.message?.includes('amount')) {
    return {
      type: 'INVALID_AMOUNT',
      message: 'Invalid payment amount.',
      technicalMessage: error.message,
      retryable: true,
      action: 'Check amount and try again',
    };
  }

  // Generic/unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred.',
    technicalMessage: error.stack || error.toString(),
    retryable: true,
    action: 'Try again or contact support if problem persists',
  };
}

/**
 * Format M-Pesa error for UI display
 * Provides structured data for consistent error UI across the app
 *
 * @param error - MpesaError object
 * @returns Formatted error for display
 *
 * @example
 * ```typescript
 * const mpesaError = handleMpesaError(error);
 * const display = formatErrorForDisplay(mpesaError);
 *
 * // Show in UI
 * <Alert>
 *   <AlertTitle>{display.title}</AlertTitle>
 *   <AlertDescription>{display.message}</AlertDescription>
 *   <AlertAction>{display.action}</AlertAction>
 *   {display.canRetry && <RetryButton />}
 * </Alert>
 * ```
 */
export function formatErrorForDisplay(error: MpesaError): {
  title: string;
  message: string;
  action: string;
  canRetry: boolean;
  severity: 'error' | 'warning' | 'info';
} {
  // Generate appropriate title based on error type
  const titleMap: Record<MpesaErrorType, string> = {
    INVALID_PHONE: 'Invalid Phone Number',
    NETWORK_ERROR: 'Connection Error',
    TIMEOUT: 'Payment Timeout',
    INSUFFICIENT_FUNDS: 'Insufficient Balance',
    INVALID_PIN: 'Incorrect PIN',
    USER_CANCELLED: 'Payment Cancelled',
    DUPLICATE_REQUEST: 'Duplicate Request',
    SYSTEM_ERROR: 'System Error',
    CALLBACK_TIMEOUT: 'Payment Verification Timeout',
    INVALID_AMOUNT: 'Invalid Amount',
    ACCOUNT_BLOCKED: 'Account Blocked',
    TRANSACTION_DECLINED: 'Transaction Declined',
    UNKNOWN_ERROR: 'Payment Failed',
  };

  // Determine severity level
  const getSeverity = (
    type: MpesaErrorType
  ): 'error' | 'warning' | 'info' => {
    if (
      type === 'USER_CANCELLED' ||
      type === 'TIMEOUT' ||
      type === 'CALLBACK_TIMEOUT'
    ) {
      return 'warning';
    }
    if (type === 'NETWORK_ERROR' || type === 'SYSTEM_ERROR') {
      return 'info';
    }
    return 'error';
  };

  return {
    title: titleMap[error.type] || 'Payment Error',
    message: error.message,
    action: error.action,
    canRetry: error.retryable,
    severity: getSeverity(error.type),
  };
}

/**
 * Check if error is due to customer action (not system/technical issue)
 *
 * @param error - MpesaError object
 * @returns True if customer caused the error
 *
 * @example
 * ```typescript
 * if (isCustomerError(mpesaError)) {
 *   // Show customer-friendly message without support contact
 * }
 * ```
 */
export function isCustomerError(error: MpesaError): boolean {
  const customerErrors: MpesaErrorType[] = [
    'INSUFFICIENT_FUNDS',
    'INVALID_PIN',
    'USER_CANCELLED',
    'INVALID_PHONE',
    'INVALID_AMOUNT',
  ];

  return customerErrors.includes(error.type);
}

/**
 * Check if error requires immediate support intervention
 *
 * @param error - MpesaError object
 * @returns True if support should be contacted
 *
 * @example
 * ```typescript
 * if (requiresSupport(mpesaError)) {
 *   // Show support contact information
 * }
 * ```
 */
export function requiresSupport(error: MpesaError): boolean {
  const supportErrors: MpesaErrorType[] = [
    'ACCOUNT_BLOCKED',
    'TRANSACTION_DECLINED',
    'SYSTEM_ERROR',
  ];

  return supportErrors.includes(error.type);
}

/**
 * Log M-Pesa error for debugging/monitoring
 *
 * @param error - MpesaError object
 * @param context - Additional context (transaction ID, user ID, etc.)
 *
 * @example
 * ```typescript
 * logMpesaError(mpesaError, {
 *   transactionId: 'TXN-123',
 *   userId: 'user-456',
 *   amount: 1000
 * });
 * ```
 */
export function logMpesaError(
  error: MpesaError,
  context?: Record<string, any>
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    errorType: error.type,
    message: error.message,
    technicalMessage: error.technicalMessage,
    resultCode: error.resultCode,
    retryable: error.retryable,
    ...context,
  };

  // Log to console (in production, send to logging service)
  console.error('[M-Pesa Error]', logData);

  // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
  // if (window.Sentry) {
  //   window.Sentry.captureException(new Error(error.message), {
  //     tags: { errorType: error.type },
  //     extra: logData
  //   });
  // }
}

/**
 * Get user-friendly status message for M-Pesa transaction status
 *
 * @param status - Transaction status
 * @returns User-friendly status message
 *
 * @example
 * ```typescript
 * const message = getStatusMessage('pending');
 * console.log(message); // "Waiting for payment confirmation..."
 * ```
 */
export function getStatusMessage(
  status: 'pending' | 'completed' | 'failed' | 'timeout' | 'cancelled' | string
): string {
  const statusMessages: Record<string, string> = {
    pending: 'Waiting for payment confirmation...',
    completed: 'Payment completed successfully!',
    failed: 'Payment failed. Please try again.',
    timeout: 'Payment request timed out. Please try again.',
    cancelled: 'Payment was cancelled.',
  };

  return statusMessages[status] || 'Processing payment...';
}

/**
 * Create a retry handler for M-Pesa operations
 *
 * @param maxRetries - Maximum number of retries
 * @param retryDelay - Delay between retries in milliseconds
 * @returns Retry function
 *
 * @example
 * ```typescript
 * const retry = createRetryHandler(3, 2000);
 *
 * try {
 *   const result = await retry(async () => {
 *     return await mpesaService.initiateMpesaPayment(...);
 *   });
 * } catch (error) {
 *   // All retries failed
 * }
 * ```
 */
export function createRetryHandler(maxRetries = 3, retryDelay = 2000) {
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const mpesaError = handleMpesaError(error);

        if (!mpesaError.retryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying
        console.log(
          `[M-Pesa] Retry attempt ${attempt + 1}/${maxRetries} after ${retryDelay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    throw lastError;
  };
}

// Export all utilities
export default {
  MPESA_RESULT_CODES,
  getMpesaErrorMessage,
  isRetryableError,
  getErrorType,
  getSuggestedAction,
  handleMpesaError,
  formatErrorForDisplay,
  isCustomerError,
  requiresSupport,
  logMpesaError,
  getStatusMessage,
  createRetryHandler,
};
