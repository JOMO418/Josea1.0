# M-Pesa STK Push Testing Guide

## Your Phone Number: 0798818197
**Network:** Safaricom (Confirmed - 079X prefix)
**M-Pesa Ready:** ✓ Yes

---

## Testing Options

### Option 1: Sandbox Testing (Recommended for Development)

Sandbox allows you to test without using real money or affecting your actual M-Pesa account.

#### Step 1: Get Sandbox Credentials

1. **Go to Safaricom Developer Portal**
   - URL: https://developer.safaricom.co.ke/
   - Create account or login

2. **Create a Test App**
   - Click "My Apps" → "Create App"
   - Select "Lipa Na M-Pesa Online"
   - Fill in details and submit

3. **Get Your Credentials**
   - Consumer Key
   - Consumer Secret
   - Business Short Code: `174379` (sandbox default)
   - Passkey (provided in sandbox)

#### Step 2: Configure Environment Variables

Update your `server/.env` file:

```env
# M-Pesa Sandbox Configuration
MPESA_CONSUMER_KEY=your_consumer_key_from_portal
MPESA_CONSUMER_SECRET=your_consumer_secret_from_portal
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your_passkey_from_portal
MPESA_ENVIRONMENT=sandbox
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/mpesa/callback
```

#### Step 3: Setup Ngrok (For Callback URL)

M-Pesa needs to send callbacks to your server. Use ngrok to expose your local server:

```bash
# Install ngrok (if not installed)
# Download from: https://ngrok.com/download

# Start your backend server first
cd server
npm run dev

# In a new terminal, start ngrok
ngrok http 5000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update MPESA_CALLBACK_URL in .env with:
# https://abc123.ngrok.io/api/mpesa/callback
```

#### Step 4: Run Database Migration

```bash
cd server
npx prisma migrate dev --name add_mpesa_transactions
npx prisma generate
```

#### Step 5: Test with Sandbox Phone Numbers

**IMPORTANT:** In sandbox mode, you must use test phone numbers provided by Safaricom.

**Sandbox Test Numbers:**
```
Success:      254708374149
Cancelled:    254799920155
Timeout:      254799920156
Insufficient: 254799920158
```

**Your actual number (0798818197) will NOT work in sandbox mode.**

#### Step 6: Test the Flow

1. Start your backend:
   ```bash
   cd server
   npm run dev
   ```

2. Start your frontend:
   ```bash
   cd client
   npm run dev
   ```

3. Open POS → Add items to cart → Checkout

4. Enter M-Pesa amount and test phone number:
   - Amount: `10` (minimum 10 KES in sandbox)
   - Phone: `254708374149` (sandbox success number)

5. Click "FINALIZE SALE"

6. Watch the response:
   - In sandbox, it auto-completes without actual phone prompt
   - Check console logs for callback data
   - Transaction should complete successfully

---

### Option 2: Production Testing (Real Money)

To test with your actual phone number (0798818197), you need production credentials.

#### Requirements for Production

1. **Registered Business**
   - Must have a registered Kenyan business
   - Valid KRA PIN
   - Business M-Pesa account (Paybill or Till number)

2. **Apply for Production Access**
   - Go to: https://developer.safaricom.co.ke/
   - Submit production credentials request
   - Provide business documentation
   - Wait for approval (can take 3-5 business days)

3. **Get Production Credentials**
   - Production Consumer Key
   - Production Consumer Secret
   - Your Business Paybill/Till Number
   - Production Passkey

#### Production Setup

Update `.env` for production:

```env
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_paybill_or_till_number
MPESA_PASSKEY=your_production_passkey
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

**IMPORTANT:** For production, you need:
- A domain with SSL certificate (HTTPS required)
- Public server or hosting
- Cannot use localhost or ngrok

---

## Quick Test Using Your Number (Development Workaround)

If you want to test the phone validation and UI flow without M-Pesa API:

### Test Phone Validation

1. Open browser console in your app
2. Test your phone number:

```javascript
// Test in browser console
import { validateKenyanPhone } from './src/utils/phone-validator';

// Test your number
const result = validateKenyanPhone('0798818197');
console.log(result);
// Output: { valid: true, formatted: "254798818197" }
```

### Mock M-Pesa Response

For UI testing without actual M-Pesa integration, you can mock the response:

1. Go to `client/src/services/mpesa.service.ts`

2. Temporarily modify `initiateMpesaPayment` to return mock data:

```typescript
async initiateMpesaPayment(...) {
  // Mock response for testing UI
  return {
    success: true,
    message: 'Payment request sent',
    data: {
      checkoutRequestId: 'ws_CO_mock123456789',
      merchantRequestId: 'mock-merchant-123',
    }
  };
}
```

3. Modify `pollPaymentStatus` to simulate success:

```typescript
async pollPaymentStatus(checkoutRequestId, onStatusUpdate) {
  // Simulate polling with mock data
  onStatusUpdate({
    success: true,
    data: { status: 'pending' }
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  return {
    success: true,
    data: {
      status: 'completed',
      mpesaReceiptNumber: 'MOCK1234567',
      amount: 1000,
      phoneNumber: '254798818197',
    }
  };
}
```

---

## Recommended Testing Path

### For Development (Now)

1. ✅ **Start with Sandbox**
   - Use test phone numbers (254708374149)
   - Test all payment flows
   - Test error scenarios
   - Verify database storage

2. ✅ **Test Phone Validation**
   - Your number: 0798818197 validates correctly
   - Network: Safaricom (M-Pesa supported)
   - Format: Can accept as 0798818197, will convert to 254798818197

3. ✅ **Test UI/UX**
   - Payment flow in CheckoutModal
   - Status indicators
   - Error handling
   - Retry functionality

### For Production (Later)

4. **Apply for Production Credentials**
   - Submit business documentation
   - Wait for approval
   - Get production keys

5. **Setup Production Environment**
   - Deploy to production server
   - Setup domain with SSL
   - Configure production credentials

6. **Test with Real Money**
   - Use your phone: 0798818197
   - Start with small amounts (KES 10-50)
   - Verify end-to-end flow

---

## Testing Checklist

### Sandbox Testing

- [ ] Ngrok running and callback URL configured
- [ ] Environment variables set correctly
- [ ] Database migrated with M-Pesa transactions table
- [ ] Backend server running
- [ ] Frontend app running
- [ ] Can initiate payment with test number
- [ ] Receives success callback
- [ ] Transaction stored in database
- [ ] Can query transaction status
- [ ] Error scenarios tested (cancelled, timeout)

### Phone Validation Testing

- [ ] Your number (0798818197) passes validation
- [ ] Formats correctly to 254798818197
- [ ] Identified as Safaricom
- [ ] M-Pesa eligibility confirmed
- [ ] Display format shows correctly (0798 818 197)
- [ ] Masked format shows correctly (0798****197)

### UI/UX Testing

- [ ] M-Pesa amount input works
- [ ] Phone number input appears
- [ ] Phone auto-populates from customer data
- [ ] Payment status shows correctly
- [ ] Countdown timer displays
- [ ] Success state shows receipt number
- [ ] Failed state shows error message
- [ ] Retry button works on failure

---

## Testing Commands

### Backend Testing

```bash
# Start backend with logs
cd server
npm run dev

# Watch database in another terminal
npx prisma studio

# Test API endpoint directly
curl -X POST http://localhost:5000/api/mpesa/stk-push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "phone": "254708374149",
    "amount": 10,
    "accountReference": "TEST001",
    "transactionDesc": "Test payment"
  }'
```

### Frontend Testing

```bash
# Start frontend
cd client
npm run dev

# Test phone validation in console
# Open browser console (F12) and run:
validateKenyanPhone('0798818197')
```

---

## Common Issues & Solutions

### Issue 1: "Consumer key and secret must be configured"
**Solution:** Check `.env` file has correct credentials and restart server

### Issue 2: "Invalid callback structure"
**Solution:**
- Ensure ngrok is running
- Check MPESA_CALLBACK_URL is correct HTTPS URL
- Verify callback endpoint is accessible

### Issue 3: "Invalid phone number"
**Solution:**
- In sandbox: Must use test numbers (254708374149)
- In production: Can use your real number (0798818197)

### Issue 4: Callback not received
**Solution:**
- Check ngrok is still running
- Verify callback URL in `.env` matches ngrok URL
- Check server logs for incoming requests
- Test callback URL: `curl https://your-ngrok-url.ngrok.io/api/mpesa/callback`

### Issue 5: Payment stuck in pending
**Solution:**
- Check sandbox uses test numbers, not real numbers
- Verify callback URL is accessible
- Check M-Pesa API logs in developer portal

---

## Your Phone Number Details

```
Input:           0798818197
Formatted:       254798818197
International:   +254798818197
Display:         0798 818 197
Masked:          0798****197
Network:         Safaricom
M-Pesa Ready:    Yes ✓
Sandbox Support: No (use test numbers)
Production:      Yes (with production credentials)
```

---

## Next Steps

1. **Today - Sandbox Testing:**
   ```bash
   # Setup
   cd server
   npm install
   # Configure .env with sandbox credentials
   npx prisma migrate dev
   npm run dev

   # In new terminal
   ngrok http 5000
   # Copy HTTPS URL to .env MPESA_CALLBACK_URL

   # In new terminal
   cd client
   npm install
   npm run dev

   # Test with 254708374149
   ```

2. **This Week - UI/UX Testing:**
   - Test all payment flows
   - Test error scenarios
   - Polish user experience

3. **Next Week - Production Prep:**
   - Apply for production credentials
   - Setup production server
   - Get domain with SSL

4. **Go Live:**
   - Deploy to production
   - Test with your real number (0798818197)
   - Start accepting real payments

---

## Support

### Safaricom M-Pesa Support
- Developer Portal: https://developer.safaricom.co.ke/
- Email: apisupport@safaricom.co.ke
- Phone: 0722 000 000

### Sandbox Testing Resources
- Test Credentials: Developer portal → My Apps → Test Credentials
- API Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
- Test Numbers: https://developer.safaricom.co.ke/Documentation

---

## Summary

**For Testing NOW (Development):**
- Use sandbox mode
- Use test number: `254708374149`
- Your number (`0798818197`) won't work in sandbox

**For Testing LATER (Production):**
- Get production credentials (requires business registration)
- Use your real number: `0798818197`
- Real money transactions

**Your number is valid and ready for production M-Pesa once you have credentials!** ✅
