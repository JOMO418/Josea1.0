// ============================================
// USE M-PESA HOOK - REACT INTEGRATION
// ============================================

import { useState, useCallback } from 'react';
import mpesaService, {
  MpesaPaymentResponse,
  MpesaStatusResponse,
} from '../services/mpesa.service';

/**
 * M-Pesa payment state
 */
interface MpesaState {
  isProcessing: boolean;
  isPolling: boolean;
  error: string | null;
  paymentResponse: MpesaPaymentResponse | null;
  statusResponse: MpesaStatusResponse | null;
  checkoutRequestId: string | null;
}

/**
 * React hook for M-Pesa payment integration
 * Provides easy-to-use methods for initiating and tracking M-Pesa payments
 *
 * @example
 * ```tsx
 * const { initiatePayment, paymentStatus, isProcessing } = useMpesa();
 *
 * const handlePay = async () => {
 *   const result = await initiatePayment({
 *     phone: '0712345678',
 *     amount: 1000,
 *     accountReference: 'INV-001',
 *   });
 *
 *   if (result.success) {
 *     console.log('Payment initiated:', result.checkoutRequestId);
 *   }
 * };
 * ```
 */
export const useMpesa = () => {
  const [state, setState] = useState<MpesaState>({
    isProcessing: false,
    isPolling: false,
    error: null,
    paymentResponse: null,
    statusResponse: null,
    checkoutRequestId: null,
  });

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      isPolling: false,
      error: null,
      paymentResponse: null,
      statusResponse: null,
      checkoutRequestId: null,
    });
  }, []);

  /**
   * Initiate M-Pesa payment
   */
  const initiatePayment = useCallback(
    async (params: {
      phone: string;
      amount: number;
      accountReference: string;
      transactionDesc?: string;
    }): Promise<MpesaPaymentResponse> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
      }));

      try {
        const response = await mpesaService.initiateMpesaPayment(
          params.phone,
          params.amount,
          params.accountReference,
          params.transactionDesc
        );

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          paymentResponse: response,
          checkoutRequestId: response.data?.checkoutRequestId || null,
          error: response.success ? null : response.error || response.message,
        }));

        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to initiate payment';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));

        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
        };
      }
    },
    []
  );

  /**
   * Check payment status once
   */
  const checkStatus = useCallback(
    async (checkoutRequestId: string): Promise<MpesaStatusResponse> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
      }));

      try {
        const response = await mpesaService.checkPaymentStatus(checkoutRequestId);

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          statusResponse: response,
          error: response.success ? null : response.error || 'Status check failed',
        }));

        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to check status';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    []
  );

  /**
   * Poll payment status with automatic retries
   */
  const pollStatus = useCallback(
    async (
      checkoutRequestId: string,
      maxAttempts = 20
    ): Promise<MpesaStatusResponse> => {
      setState((prev) => ({
        ...prev,
        isPolling: true,
        error: null,
      }));

      try {
        const response = await mpesaService.pollPaymentStatus(
          checkoutRequestId,
          (statusUpdate) => {
            // Update state on each poll
            setState((prev) => ({
              ...prev,
              statusResponse: statusUpdate,
            }));
          },
          maxAttempts
        );

        setState((prev) => ({
          ...prev,
          isPolling: false,
          statusResponse: response,
          error: response.success ? null : response.error || 'Polling failed',
        }));

        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to poll status';
        setState((prev) => ({
          ...prev,
          isPolling: false,
          error: errorMessage,
        }));

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    []
  );

  /**
   * Initiate payment and automatically poll for status
   * This is the most common use case - all-in-one method
   */
  const payAndPoll = useCallback(
    async (params: {
      phone: string;
      amount: number;
      accountReference: string;
      transactionDesc?: string;
      maxPollAttempts?: number;
    }): Promise<{
      paymentResponse: MpesaPaymentResponse;
      statusResponse?: MpesaStatusResponse;
    }> => {
      // Step 1: Initiate payment
      const paymentResponse = await initiatePayment(params);

      if (!paymentResponse.success || !paymentResponse.data?.checkoutRequestId) {
        return { paymentResponse };
      }

      // Step 2: Poll for status
      const statusResponse = await pollStatus(
        paymentResponse.data.checkoutRequestId,
        params.maxPollAttempts
      );

      return {
        paymentResponse,
        statusResponse,
      };
    },
    [initiatePayment, pollStatus]
  );

  /**
   * Verify payment (force fresh check)
   */
  const verifyPayment = useCallback(
    async (checkoutRequestId: string): Promise<MpesaStatusResponse> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
      }));

      try {
        const response = await mpesaService.verifyPayment(checkoutRequestId);

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          statusResponse: response,
          error: response.success ? null : response.error || 'Verification failed',
        }));

        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to verify payment';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    []
  );

  return {
    // State
    isProcessing: state.isProcessing,
    isPolling: state.isPolling,
    error: state.error,
    paymentResponse: state.paymentResponse,
    statusResponse: state.statusResponse,
    checkoutRequestId: state.checkoutRequestId,
    paymentStatus: state.statusResponse?.data?.status,

    // Methods
    initiatePayment,
    checkStatus,
    pollStatus,
    payAndPoll,
    verifyPayment,
    reset,

    // Utility methods from service
    validatePhone: mpesaService.validateKenyanPhone.bind(mpesaService),
    formatPhone: mpesaService.formatPhoneForDisplay.bind(mpesaService),
    formatAmount: mpesaService.formatAmount.bind(mpesaService),
    getStatusMessage: mpesaService.getStatusMessage.bind(mpesaService),
    getStatusColor: mpesaService.getStatusColor.bind(mpesaService),
  };
};

export default useMpesa;
