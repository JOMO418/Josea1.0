// ============================================
// M-PESA PAYMENT SERVICE - FRONTEND
// ============================================

import { axiosInstance } from '../api/axios';

/**
 * M-Pesa payment request payload
 */
export interface MpesaPaymentRequest {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}

/**
 * M-Pesa payment response from backend
 */
export interface MpesaPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId?: number;
    checkoutRequestId: string;
    merchantRequestId: string;
  };
  error?: string;
}

/**
 * M-Pesa payment status response
 */
export interface MpesaStatusResponse {
  success: boolean;
  data?: {
    status: 'pending' | 'completed' | 'failed' | 'timeout' | 'cancelled';
    transactionId?: number;
    mpesaReceiptNumber?: string;
    amount?: number;
    phoneNumber?: string;
    transactionDate?: string;
    resultDesc?: string;
    completedAt?: string;
  };
  error?: string;
}

/**
 * Phone number validation result
 */
export interface PhoneValidationResult {
  valid: boolean;
  formatted: string;
  error?: string;
}

/**
 * M-Pesa Integration Service (Frontend)
 * Handles M-Pesa payment initiation, status checking, and phone validation
 */
class MpesaService {
  /**
   * Validate Kenyan phone number and format to M-Pesa standard (254XXXXXXXXX)
   *
   * Accepts formats:
   * - 0712345678 (local format)
   * - 254712345678 (international without +)
   * - +254712345678 (international with +)
   * - 712345678 (without country code or 0)
   *
   * Valid networks:
   * - Safaricom: 0700-0729, 0740-0743, 0745-0746, 0748, 0757, 0759, 0768-0769, 0790-0799
   * - Airtel: 0730-0739, 0750-0756, 0780-0789
   * - Telkom: 0770-0779
   *
   * @param phone - Phone number in various formats
   * @returns Validation result with formatted number
   */
  validateKenyanPhone(phone: string): PhoneValidationResult {
    try {
      // Remove all non-numeric characters (spaces, dashes, parentheses, etc.)
      let cleaned = phone.replace(/\D/g, '');

      // Handle empty phone
      if (!cleaned) {
        return {
          valid: false,
          formatted: '',
          error: 'Phone number is required',
        };
      }

      // Convert different formats to 254XXXXXXXXX
      if (cleaned.startsWith('0')) {
        // 0712345678 -> 254712345678
        cleaned = '254' + cleaned.substring(1);
      } else if (cleaned.startsWith('254')) {
        // Already in correct format: 254712345678
      } else if (cleaned.length === 9) {
        // 712345678 -> 254712345678
        cleaned = '254' + cleaned;
      } else if (cleaned.length < 9) {
        return {
          valid: false,
          formatted: '',
          error: 'Phone number is too short',
        };
      }

      // Validate format: Must be 254XXXXXXXXX (12 digits total)
      if (cleaned.length !== 12) {
        return {
          valid: false,
          formatted: '',
          error: `Invalid phone number length. Expected 12 digits, got ${cleaned.length}`,
        };
      }

      // Validate country code
      if (!cleaned.startsWith('254')) {
        return {
          valid: false,
          formatted: '',
          error: 'Phone number must be a Kenyan number (254)',
        };
      }

      // Extract the network prefix (first digit after 254)
      const networkPrefix = cleaned.substring(3, 4);
      const fullPrefix = cleaned.substring(3, 6);

      // Validate Kenyan mobile network prefixes
      // Safaricom: 7XX (where XX = 00-29, 40-43, 45-46, 48, 57, 59, 68-69, 90-99)
      // Airtel: 7XX (where XX = 30-39, 50-56, 80-89) and 1XX (10-19)
      // Telkom: 7XX (where XX = 70-79)
      const validPrefixes = [
        '70', // Safaricom
        '71', // Safaricom
        '72', // Safaricom
        '74', // Safaricom
        '75', // Safaricom & Airtel
        '75', // Airtel
        '76', // Safaricom
        '79', // Safaricom
        '73', // Airtel
        '78', // Airtel
        '77', // Telkom
        '11', // Airtel
      ];

      // More precise validation
      const isSafaricom =
        (networkPrefix === '7' &&
          ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
           '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
           '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
           '40', '41', '42', '43', '45', '46', '48', '57', '59', '68',
           '69', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'
          ].some(p => fullPrefix.startsWith('7' + p))) ||
        fullPrefix.startsWith('110') ||
        fullPrefix.startsWith('111') ||
        fullPrefix.startsWith('112') ||
        fullPrefix.startsWith('113') ||
        fullPrefix.startsWith('114') ||
        fullPrefix.startsWith('115');

      const isAirtel =
        (networkPrefix === '7' &&
          ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
           '50', '51', '52', '53', '54', '55', '56', '80', '81', '82',
           '83', '84', '85', '86', '87', '88', '89'
          ].some(p => fullPrefix.startsWith('7' + p))) ||
        fullPrefix.startsWith('116') ||
        fullPrefix.startsWith('117') ||
        fullPrefix.startsWith('118') ||
        fullPrefix.startsWith('119');

      const isTelkom =
        networkPrefix === '7' &&
        ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'].some(p =>
          fullPrefix.startsWith('7' + p.charAt(1))
        ) &&
        fullPrefix >= '770' &&
        fullPrefix <= '779';

      // Simple validation: Check if starts with valid Kenyan mobile prefix
      if (networkPrefix !== '7' && networkPrefix !== '1') {
        return {
          valid: false,
          formatted: '',
          error: 'Invalid Kenyan mobile number. Must start with 07 or 01',
        };
      }

      // For M-Pesa, primarily Safaricom numbers work
      // But we'll accept all valid Kenyan numbers
      return {
        valid: true,
        formatted: cleaned,
      };
    } catch (error) {
      console.error('[M-Pesa] Phone validation error:', error);
      return {
        valid: false,
        formatted: '',
        error: 'Failed to validate phone number',
      };
    }
  }

  /**
   * Initiate M-Pesa STK Push payment
   * Sends payment prompt to customer's phone
   *
   * @param phone - Customer phone number (various formats accepted)
   * @param amount - Amount to charge in KES (minimum 1)
   * @param accountReference - Account/invoice reference (max 12 characters)
   * @param transactionDesc - Optional transaction description
   * @returns Payment response with checkout request ID
   */
  async initiateMpesaPayment(
    phone: string,
    amount: number,
    accountReference: string,
    transactionDesc?: string
  ): Promise<MpesaPaymentResponse> {
    try {
      // Validate phone number
      const phoneValidation = this.validateKenyanPhone(phone);
      if (!phoneValidation.valid) {
        return {
          success: false,
          message: phoneValidation.error || 'Invalid phone number',
          error: phoneValidation.error,
        };
      }

      // Validate amount
      if (!amount || amount <= 0) {
        return {
          success: false,
          message: 'Amount must be greater than 0',
          error: 'Invalid amount',
        };
      }

      // Validate account reference
      if (!accountReference || accountReference.trim().length === 0) {
        return {
          success: false,
          message: 'Account reference is required',
          error: 'Missing account reference',
        };
      }

      if (accountReference.length > 12) {
        return {
          success: false,
          message: 'Account reference must not exceed 12 characters',
          error: 'Account reference too long',
        };
      }

      console.log('[M-Pesa] Initiating payment:', {
        phone: phoneValidation.formatted,
        amount,
        accountReference,
      });

      // Send payment request to backend
      const response = await axiosInstance.post<MpesaPaymentResponse>(
        '/payment/stk-push',
        {
          phone: phoneValidation.formatted,
          amount,
          accountReference,
          transactionDesc: transactionDesc || accountReference,
        }
      );

      console.log('[M-Pesa] Payment initiated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[M-Pesa] Payment initiation error:', error);
      return this.handleError(error);
    }
  }

  /**
   * Check M-Pesa payment status
   * Queries the current status of a payment request
   *
   * @param checkoutRequestId - Checkout Request ID from payment initiation
   * @returns Current payment status
   */
  async checkPaymentStatus(
    checkoutRequestId: string
  ): Promise<MpesaStatusResponse> {
    try {
      if (!checkoutRequestId) {
        return {
          success: false,
          error: 'Checkout Request ID is required',
        };
      }

      console.log('[M-Pesa] Checking payment status:', checkoutRequestId);

      const response = await axiosInstance.get<MpesaStatusResponse>(
        `/payment/status/${checkoutRequestId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('[M-Pesa] Status check error:', error);

      // Handle 404 (transaction not found)
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      return this.handleError(error);
    }
  }

  /**
   * Poll payment status with automatic retries
   * Continuously checks payment status until completion or timeout
   *
   * @param checkoutRequestId - Checkout Request ID from payment initiation
   * @param onStatusUpdate - Callback function called on each status update
   * @param maxAttempts - Maximum number of polling attempts (default: 20 = 60 seconds)
   * @returns Final payment status
   */
  async pollPaymentStatus(
    checkoutRequestId: string,
    onStatusUpdate: (status: MpesaStatusResponse) => void,
    maxAttempts = 25
  ): Promise<MpesaStatusResponse> {
    let attempts = 0;
    const pollInterval = 4000; // 4 seconds (sandbox needs more time)

    console.log('[M-Pesa] Starting payment status polling:', {
      checkoutRequestId,
      maxAttempts,
      pollInterval,
    });

    return new Promise((resolve) => {
      // Wait 5 seconds before first poll to give sandbox time
      setTimeout(() => {
        const intervalId = setInterval(async () => {
          attempts++;

        try {
          const status = await this.checkPaymentStatus(checkoutRequestId);

          // Call the status update callback
          onStatusUpdate(status);

          console.log('[M-Pesa] Poll attempt', attempts, ':', status);

          // Check if payment has reached a final state
          const finalStatuses = [
            'completed',
            'failed',
            'cancelled',
            'timeout',
          ] as const;

          if (status.data && finalStatuses.includes(status.data.status as any)) {
            console.log('[M-Pesa] Payment reached final status:', status.data.status);
            clearInterval(intervalId);
            resolve(status);
            return;
          }

          // Check if max attempts reached
          if (attempts >= maxAttempts) {
            console.log('[M-Pesa] Max polling attempts reached');
            clearInterval(intervalId);
            resolve({
              success: true,
              data: {
                status: 'timeout',
                resultDesc: 'Payment request timed out. Please check status manually.',
              },
            });
          }
        } catch (error) {
          console.error('[M-Pesa] Poll error:', error);

          // Don't stop polling on errors, just log them
          // User might have network issues but payment might still go through
        }
        }, pollInterval);

        // Safety cleanup after max time (maxAttempts * pollInterval + buffer)
        setTimeout(() => {
          clearInterval(intervalId);
        }, maxAttempts * pollInterval + 5000);
      }, 5000); // Initial 5 second delay
    });
  }

  /**
   * Verify payment status
   * Forces a fresh check from M-Pesa API (not cached)
   *
   * @param checkoutRequestId - Checkout Request ID from payment initiation
   * @returns Complete transaction details
   */
  async verifyPayment(
    checkoutRequestId: string
  ): Promise<MpesaStatusResponse> {
    try {
      if (!checkoutRequestId) {
        return {
          success: false,
          error: 'Checkout Request ID is required',
        };
      }

      console.log('[M-Pesa] Verifying payment:', checkoutRequestId);

      const response = await axiosInstance.post<MpesaStatusResponse>(
        '/payment/verify',
        { checkoutRequestId }
      );

      return response.data;
    } catch (error: any) {
      console.error('[M-Pesa] Payment verification error:', error);
      return this.handleError(error);
    }
  }

  /**
   * Verify M-Pesa receipt code with Safaricom API
   * Used for manual code entry to confirm transaction is real and amount matches
   *
   * @param receiptCode - M-Pesa receipt number (e.g., QH12XYZ789)
   * @param expectedAmount - Expected transaction amount to verify
   * @returns Verification result
   */
  async verifyMpesaReceipt(
    receiptCode: string,
    expectedAmount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!receiptCode || receiptCode.trim().length < 10) {
        return {
          success: false,
          error: 'Invalid M-Pesa receipt code format',
        };
      }

      console.log('[M-Pesa] Verifying receipt code:', receiptCode);

      const response = await axiosInstance.post<{ success: boolean; error?: string }>(
        '/payment/verify-receipt',
        {
          receiptCode: receiptCode.trim().toUpperCase(),
          expectedAmount,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[M-Pesa] Receipt verification error:', error);

      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error,
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to verify M-Pesa receipt',
      };
    }
  }

  /**
   * Handle API errors and return standardized error response
   *
   * @param error - Error object from axios or other source
   * @returns Standardized error response
   */
  private handleError(error: any): { success: false; error: string; message: string } {
    if (error.response) {
      // Server responded with error status
      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        'M-Pesa payment failed';

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    } else if (error.request) {
      // Request made but no response received (network error)
      const message = 'Network error. Please check your internet connection and try again.';
      return {
        success: false,
        message,
        error: message,
      };
    } else {
      // Something else happened
      const message = error.message || 'An unexpected error occurred';
      return {
        success: false,
        message,
        error: message,
      };
    }
  }

  /**
   * Format phone number for display
   * Converts 254712345678 to 0712 345 678 for better readability
   *
   * @param phone - Phone number in 254XXXXXXXXX format
   * @returns Formatted phone number for display
   */
  formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';

    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Convert to local format if it's a Kenyan number
    if (cleaned.startsWith('254') && cleaned.length === 12) {
      const local = '0' + cleaned.substring(3);
      // Format as 0712 345 678
      return `${local.substring(0, 4)} ${local.substring(4, 7)} ${local.substring(7)}`;
    }

    return phone;
  }

  /**
   * Format amount for display with currency symbol
   *
   * @param amount - Amount in KES
   * @returns Formatted amount string (e.g., "KES 1,000.00")
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get user-friendly status message
   *
   * @param status - Payment status
   * @returns Human-readable status message
   */
  getStatusMessage(status: string): string {
    const statusMessages: Record<string, string> = {
      pending: 'Waiting for customer to complete payment...',
      completed: 'Payment completed successfully',
      failed: 'Payment failed',
      timeout: 'Payment request timed out',
      cancelled: 'Payment was cancelled by customer',
    };

    return statusMessages[status] || 'Unknown status';
  }

  /**
   * Get status color for UI
   *
   * @param status - Payment status
   * @returns Color name for UI styling
   */
  getStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' {
    const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      completed: 'success',
      failed: 'error',
      timeout: 'warning',
      cancelled: 'warning',
      pending: 'info',
    };

    return colorMap[status] || 'info';
  }
}

// Export singleton instance
export default new MpesaService();
