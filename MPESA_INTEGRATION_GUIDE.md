# M-Pesa Integration Guide

## Overview
Complete M-Pesa STK Push payment integration for the POS system with real-time payment tracking and automatic status polling.

## Files Created/Modified

### Backend
- ✅ `server/src/services/mpesa.service.js` - M-Pesa API integration service
- ✅ `server/src/controllers/mpesaController.js` - M-Pesa payment endpoints
- ✅ `server/src/routes/mpesa.js` - M-Pesa routes
- ✅ `server/src/app.js` - Registered M-Pesa routes
- ✅ `server/prisma/schema.prisma` - Added MpesaTransaction model

### Frontend
- ✅ `client/src/services/mpesa.service.ts` - Frontend M-Pesa service
- ✅ `client/src/hooks/useMpesa.ts` - React hook for M-Pesa integration
- ✅ `client/src/components/MpesaPaymentModal.tsx` - Standalone payment modal
- ✅ `client/src/components/CheckoutModal.tsx` - Updated with M-Pesa integration

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# M-Pesa Daraja API Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

### 2. Database Migration

Run the Prisma migration to create the M-Pesa transaction table:

```bash
cd server
npx prisma migrate dev --name add_mpesa_transactions
npx prisma generate
```

### 3. Get Sandbox Credentials

1. Go to https://developer.safaricom.co.ke/
2. Sign up/login to your account
3. Create a new app
4. Get your credentials:
   - Consumer Key
   - Consumer Secret
   - Business Short Code (use 174379 for sandbox)
   - Passkey

### 4. Configure Callback URL

For local development, use ngrok:

```bash
ngrok http 5000
```

Copy the HTTPS URL and set it as:
```
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/mpesa/callback
```

## Features Implemented

### 1. Phone Number Validation
- ✅ Supports multiple formats (07XX, 254XX, +254XX)
- ✅ Validates Kenyan mobile networks (Safaricom, Airtel, Telkom)
- ✅ Auto-formats to M-Pesa standard (254XXXXXXXXX)

### 2. STK Push Payment
- ✅ Sends payment prompt to customer's phone
- ✅ Real-time payment status tracking
- ✅ 60-second countdown timer
- ✅ Automatic status polling (3-second intervals)

### 3. Payment Status Tracking
- ✅ Pending - Waiting for customer action
- ✅ Polling - Checking payment status
- ✅ Completed - Payment successful
- ✅ Failed - Payment failed
- ✅ Timeout - Customer didn't respond
- ✅ Cancelled - Customer cancelled payment

### 4. User Experience
- ✅ Visual status indicators with icons
- ✅ Countdown timer display
- ✅ Clear error messages
- ✅ Retry functionality on failure
- ✅ Auto-populate phone from customer data
- ✅ Prevents duplicate submissions

### 5. Data Persistence
- ✅ Stores all M-Pesa transactions in database
- ✅ Links to user and branch
- ✅ Saves M-Pesa receipt number
- ✅ Transaction audit trail

## Testing

### Sandbox Test Numbers

Use these Safaricom sandbox numbers for testing:

```
Success: 254708374149
Cancel: 254799920155
Timeout: 254799920156
Insufficient: 254799920158
```

### Test Flow

1. **Open POS and add items to cart**
2. **Click Checkout**
3. **Enter M-Pesa amount**
4. **Enter test phone number** (e.g., 254708374149)
5. **Click "FINALIZE SALE"**
6. **Wait for payment request**
7. **Check M-Pesa prompt on phone** (in sandbox, auto-completes)
8. **See success/failure status**
9. **Complete sale**

### Example Test Scenarios

#### ✅ Successful Payment
```
Phone: 254708374149
Amount: 100
Expected: Payment completes successfully
```

#### ⏰ Timeout
```
Phone: 254799920156
Amount: 100
Expected: Times out after ~30 seconds
```

#### ❌ Cancelled
```
Phone: 254799920155
Amount: 100
Expected: Customer cancels payment
```

## API Endpoints

### Backend Routes

```
POST   /api/mpesa/stk-push              - Initiate payment
GET    /api/mpesa/status/:checkoutId    - Check status
POST   /api/mpesa/callback               - M-Pesa webhook (public)
GET    /api/mpesa/transactions           - Get transaction history
GET    /api/mpesa/transactions/:id       - Get single transaction
GET    /api/mpesa/stats                  - Get payment statistics
```

## Usage Examples

### Frontend Service Usage

```typescript
import mpesaService from '../services/mpesa.service';

// Validate phone
const validation = mpesaService.validateKenyanPhone('0712345678');
if (validation.valid) {
  console.log('Formatted:', validation.formatted); // 254712345678
}

// Initiate payment
const response = await mpesaService.initiateMpesaPayment(
  '254712345678',
  1000,
  'INV-001',
  'Payment for invoice'
);

// Poll for status
await mpesaService.pollPaymentStatus(
  response.data.checkoutRequestId,
  (status) => {
    console.log('Status update:', status.data?.status);
  }
);
```

### React Hook Usage

```typescript
import useMpesa from '../hooks/useMpesa';

function PaymentComponent() {
  const { payAndPoll, isProcessing, paymentStatus } = useMpesa();

  const handlePay = async () => {
    const result = await payAndPoll({
      phone: '0712345678',
      amount: 1000,
      accountReference: 'INV-001',
    });

    if (result.statusResponse?.data?.status === 'completed') {
      console.log('Payment successful!');
    }
  };

  return (
    <button onClick={handlePay} disabled={isProcessing}>
      Pay {isProcessing ? '...' : 'Now'}
    </button>
  );
}
```

## Troubleshooting

### Issue: "Consumer key and secret must be configured"
**Solution:** Check that `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` are set in `.env`

### Issue: "Invalid callback structure"
**Solution:** Ensure your callback URL is accessible and ngrok is running

### Issue: "Invalid phone number"
**Solution:** Phone must be Kenyan mobile (07XX or 01XX). Use test numbers for sandbox.

### Issue: "Payment stuck in pending"
**Solution:**
- Check callback URL is correct
- Ensure ngrok is running (for local dev)
- Check M-Pesa API logs

### Issue: "Authentication failed"
**Solution:**
- Verify Consumer Key and Secret are correct
- Check that credentials match the environment (sandbox/production)
- Ensure no extra spaces in credentials

## Security Notes

- ✅ Never commit `.env` file
- ✅ Use HTTPS for callback URL
- ✅ Validate all phone numbers
- ✅ Store M-Pesa receipts for audit trail
- ✅ Log all transactions
- ✅ Use proper authentication on routes
- ✅ Sanitize callback data

## Production Checklist

Before going to production:

- [ ] Get production credentials from Safaricom
- [ ] Update `MPESA_ENVIRONMENT=production`
- [ ] Configure production callback URL (HTTPS required)
- [ ] Test with real phone numbers
- [ ] Set up monitoring/alerts
- [ ] Configure proper error logging
- [ ] Test failure scenarios
- [ ] Set up reconciliation process
- [ ] Document customer support procedures

## Next Steps

1. **Test the integration** with sandbox credentials
2. **Apply for production credentials** from Safaricom
3. **Set up callback URL** with proper SSL certificate
4. **Implement receipt printing** with M-Pesa details
5. **Add SMS notifications** for payment confirmations
6. **Build reconciliation dashboard** for accounting
7. **Add refund functionality** if needed

## Support

For M-Pesa API support:
- Portal: https://developer.safaricom.co.ke/
- Email: apisupport@safaricom.co.ke
- Phone: 0722000000

For integration issues:
- Check logs in `server/logs/`
- Review M-Pesa transaction table
- Test with sandbox credentials first
- Verify callback URL is accessible

## Resources

- [M-Pesa API Documentation](https://developer.safaricom.co.ke/docs)
- [Sandbox Testing Guide](https://developer.safaricom.co.ke/sandbox)
- [API Status Page](https://status.safaricom.co.ke/)
