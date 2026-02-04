// server/src/services/mpesa.service.js

const axios = require('axios');
require('dotenv').config();

/**
 * M-Pesa Integration Service
 * Handles all M-Pesa Daraja API interactions including STK Push, transaction queries, and callback validation
 */
class MpesaService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get M-Pesa API base URL based on environment
   * @returns {string} Base URL string for sandbox or production
   */
  getBaseUrl() {
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    return environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Check if current access token is valid
   * @returns {boolean} Token validity
   */
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    return new Date() < this.tokenExpiry;
  }

  /**
   * Generate M-Pesa OAuth access token
   * Caches token for 59 minutes (3540 seconds) to avoid unnecessary API calls
   * @returns {Promise<string>} Access token string
   * @throws {Error} If authentication fails
   */
  async generateAccessToken() {
    try {
      // Return cached token if still valid
      if (this.isTokenValid() && this.accessToken) {
        console.log('[M-Pesa] Using cached access token');
        return this.accessToken;
      }

      const consumerKey = process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa consumer key and secret must be configured');
      }

      // Create Basic Auth credentials
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

      console.log('[M-Pesa] Generating new access token...');

      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 30000,
      });

      this.accessToken = response.data.access_token;
      // Cache token for 59 minutes (3540 seconds)
      this.tokenExpiry = new Date(Date.now() + 3540 * 1000);

      console.log('[M-Pesa] Access token generated successfully');
      return this.accessToken;
    } catch (error) {
      console.error('[M-Pesa] Failed to generate access token:', error.message);
      if (error.response) {
        throw new Error(
          `M-Pesa authentication failed: ${error.response.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   * @param {string} phone - Phone number in various formats
   * @returns {string} Formatted phone number
   * @throws {Error} If phone number is invalid
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }

    // Validate format - Safaricom (7XX) and Airtel (1XX)
    if (!/^254[17]\d{8}$/.test(cleaned)) {
      throw new Error(
        `Invalid phone number format: ${phone}. Expected format: 254XXXXXXXXX`
      );
    }

    return cleaned;
  }

  /**
   * Generate timestamp in M-Pesa format (YYYYMMDDHHmmss)
   * @returns {string} Timestamp string
   */
  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Generate M-Pesa password
   * Password = Base64(BusinessShortCode + Passkey + Timestamp)
   * @param {string} timestamp - Timestamp string
   * @returns {string} Base64 encoded password
   */
  generatePassword(timestamp) {
    const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!shortCode || !passkey) {
      throw new Error('M-Pesa business short code and passkey must be configured');
    }

    const passwordString = shortCode + passkey + timestamp;
    return Buffer.from(passwordString).toString('base64');
  }

  /**
   * Initiate M-Pesa STK Push (Lipa Na M-Pesa Online)
   * Sends payment prompt to customer's phone
   *
   * @param {string} phone - Customer phone number (254XXXXXXXXX or 07XXXXXXXX)
   * @param {number} amount - Amount to charge (minimum 1 KES)
   * @param {string} accountReference - Account reference (max 12 characters)
   * @param {string} [transactionDesc] - Transaction description (optional)
   * @returns {Promise<Object>} STK Push response with checkout request ID
   */
  async initiateSTKPush(phone, amount, accountReference, transactionDesc) {
    try {
      // Validate inputs
      if (amount < 1) {
        throw new Error('Amount must be at least 1 KES');
      }

      if (accountReference.length > 12) {
        throw new Error('Account reference must not exceed 12 characters');
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phone);

      // Get access token
      const accessToken = await this.generateAccessToken();

      // Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
      const callbackUrl = process.env.MPESA_CALLBACK_URL;

      if (!callbackUrl) {
        throw new Error('M-Pesa callback URL must be configured');
      }

      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/mpesa/stkpush/v1/processrequest`;

      const requestBody = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Ensure whole number
        PartyA: formattedPhone,
        PartyB: shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc || accountReference,
      };

      console.log('[M-Pesa] Initiating STK Push:', {
        phone: formattedPhone,
        amount,
        accountReference,
      });

      const response = await axios.post(url, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const data = response.data;

      // Check if request was successful
      if (data.ResponseCode === '0') {
        console.log('[M-Pesa] STK Push initiated successfully:', {
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
        });

        return {
          success: true,
          message: data.CustomerMessage || 'STK Push sent successfully',
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
          customerMessage: data.CustomerMessage,
        };
      } else {
        console.error('[M-Pesa] STK Push failed:', data);
        return {
          success: false,
          message: data.ResponseDescription || 'STK Push failed',
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
        };
      }
    } catch (error) {
      console.error('[M-Pesa] STK Push error:', error.message);
      if (error.response) {
        const errorMessage =
          error.response.data?.errorMessage ||
          error.response.data?.ResponseDescription ||
          error.message;
        return {
          success: false,
          message: `STK Push failed: ${errorMessage}`,
        };
      }
      return {
        success: false,
        message: error.message || 'STK Push failed',
      };
    }
  }

  /**
   * Query M-Pesa transaction status
   * Checks the status of a previously initiated STK Push
   *
   * @param {string} checkoutRequestId - Checkout Request ID from STK Push response
   * @returns {Promise<Object>} Transaction status response
   */
  async queryTransactionStatus(checkoutRequestId) {
    try {
      if (!checkoutRequestId) {
        throw new Error('Checkout Request ID is required');
      }

      // Get access token
      const accessToken = await this.generateAccessToken();

      // Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/mpesa/stkpushquery/v1/query`;

      const requestBody = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      console.log('[M-Pesa] Querying transaction status:', checkoutRequestId);

      const response = await axios.post(url, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const data = response.data;

      console.log('[M-Pesa] Transaction status response:', {
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
      });

      // Map result codes to status
      let status = 'pending';
      if (data.ResultCode === '0') {
        status = 'success';
      } else if (data.ResultCode === '1032') {
        status = 'cancelled';
      } else if (data.ResultCode === '1037') {
        status = 'timeout';
      } else if (data.ResultCode) {
        status = 'failed';
      }

      return {
        success: data.ResultCode === '0',
        status,
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        data: data,
      };
    } catch (error) {
      console.error('[M-Pesa] Transaction status query error:', error.message);
      if (error.response) {
        const errorMessage =
          error.response.data?.errorMessage ||
          error.response.data?.ResultDesc ||
          error.message;
        throw new Error(`Transaction status query failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Validate M-Pesa callback data structure
   * Extracts and validates callback payload from M-Pesa
   *
   * @param {Object} callbackData - Raw callback data from M-Pesa
   * @returns {Object} Validated and typed callback data
   * @throws {Error} If callback structure is invalid
   */
  validateCallbackData(callbackData) {
    try {
      // Validate basic structure
      if (!callbackData || !callbackData.Body) {
        throw new Error('Invalid callback structure: Missing Body');
      }

      const body = callbackData.Body;
      const stkCallback = body.stkCallback;

      if (!stkCallback) {
        throw new Error('Invalid callback structure: Missing stkCallback');
      }

      // Extract basic fields
      const merchantRequestId = stkCallback.MerchantRequestID;
      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;

      if (
        merchantRequestId === undefined ||
        checkoutRequestId === undefined ||
        resultCode === undefined ||
        resultDesc === undefined
      ) {
        throw new Error('Invalid callback structure: Missing required fields');
      }

      const validatedData = {
        merchantRequestId,
        checkoutRequestId,
        resultCode: Number(resultCode),
        resultDesc,
      };

      // Extract metadata for successful payments
      if (resultCode === 0 && stkCallback.CallbackMetadata) {
        const metadata = stkCallback.CallbackMetadata.Item;

        if (Array.isArray(metadata)) {
          metadata.forEach((item) => {
            switch (item.Name) {
              case 'Amount':
                validatedData.amount = Number(item.Value);
                break;
              case 'MpesaReceiptNumber':
                validatedData.mpesaReceiptNumber = String(item.Value);
                break;
              case 'TransactionDate':
                validatedData.transactionDate = String(item.Value);
                break;
              case 'PhoneNumber':
                validatedData.phoneNumber = String(item.Value);
                break;
            }
          });
        }
      }

      console.log('[M-Pesa] Callback data validated:', {
        checkoutRequestId: validatedData.checkoutRequestId,
        resultCode: validatedData.resultCode,
        amount: validatedData.amount,
      });

      return validatedData;
    } catch (error) {
      console.error('[M-Pesa] Callback validation error:', error.message);
      throw new Error(`Invalid M-Pesa callback data: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new MpesaService();
