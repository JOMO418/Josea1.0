# 🚀 M-Pesa Production Setup Guide

## ✅ Current Status: SANDBOX CONFIGURED

Your M-Pesa integration is now fully configured for **sandbox testing** with proper C2B auto-detection.

---

## 📋 How It Works Now (Sandbox)

### **Auto-Detect Flow (DEFAULT - Recommended)**
1. **Cashier** rings up items, enters M-Pesa payment
2. **Modal opens** → Auto-detect starts immediately
3. **Customer** opens M-Pesa on their phone:
   - Select "Lipa Na M-Pesa"
   - Choose "Buy Goods and Services"
   - Enter Till Number: **174379** (sandbox)
   - Enter Amount
   - Enter PIN → Send
4. **C2B Callback** receives payment, stores in database
5. **Auto-Detect** finds payment by matching:
   - Amount (exact match)
   - Branch (current branch)
   - Timestamp (last 5 minutes)
6. **Receipt** auto-generated with M-Pesa code
7. **Print** receipt and complete sale

### **STK Push Flow (Backup)**
1. Customer near cashier
2. Cashier clicks "STK Push"
3. Prompt sent to customer's phone
4. Customer enters PIN
5. Payment completes

### **Manual Entry Flow (Already Paid)**
1. Customer already paid via M-Pesa
2. Cashier clicks "Manual Entry"
3. Enter M-Pesa receipt code
4. Verify and complete

---

## 🔧 Moving to Production

### **Step 1: Get Production Credentials from Safaricom**

You'll receive:
- Consumer Key
- Consumer Secret
- Business Short Code (Till Number)
- Passkey
- C2B Validation URL
- C2B Confirmation URL

### **Step 2: Update Backend Environment Variables**

Edit `server/.env`:

```env
# M-Pesa Production Configuration
MPESA_CONSUMER_KEY=your_production_consumer_key_here
MPESA_CONSUMER_SECRET=your_production_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=your_actual_till_number
MPESA_PASSKEY=your_production_passkey_here
MPESA_ENVIRONMENT=production  # Change from 'sandbox' to 'production'

# Production Callback URL (MUST be HTTPS)
MPESA_CALLBACK_URL=https://yourdomain.com/api/payment/callback
MPESA_C2B_VALIDATION_URL=https://yourdomain.com/api/payment/c2b/validate
MPESA_C2B_CONFIRMATION_URL=https://yourdomain.com/api/payment/c2b/confirm
```

### **Step 3: Update Frontend Environment Variables**

Edit `client/.env.local`:

```env
# Production Till Number (same as backend short code)
VITE_MPESA_TILL_NUMBER=your_actual_till_number

# Disable demo mode
VITE_MPESA_DEMO_MODE=false
```

### **Step 4: Deploy to Production Server**

Requirements:
- **Domain with HTTPS** (SSL certificate) - Safaricom requires HTTPS
- **Public IP** or domain (no localhost)
- **Port 443** open for callbacks

### **Step 5: Register C2B URLs with Safaricom**

Run the registration script:

```bash
cd server
node scripts/register-c2b.js
```

This will:
- Register your validation URL
- Register your confirmation URL
- Test the connection
- Confirm C2B is active

### **Step 6: Test with Real Money**

**IMPORTANT:** Start with small amounts!

1. Test with **KES 10** first
2. Have a staff member pay from their M-Pesa
3. Verify auto-detect finds the payment
4. Check receipt prints correctly
5. Verify amount matches exactly

### **Step 7: Train Your Cashiers**

**Primary Method (Auto-Detect):**
- "Tell customer your till number: **[YOUR TILL]**"
- "Customer pays on their phone"
- "Wait for green checkmark"
- "Print receipt"

**Backup Method (Manual Entry):**
- "Customer already paid? Get M-Pesa code"
- "Click Manual Entry"
- "Type code and verify"

**Emergency Method (Complete Later):**
- "Payment unclear? Click Complete Later"
- "Manager will verify later"

---

## 🧪 Testing Checklist

### Sandbox Testing (Now)
- [x] Auto-detect starts automatically
- [x] STK Push sends prompt
- [x] Manual entry accepts code
- [x] Complete Later flags sale
- [x] Receipt prints correctly
- [x] Backend doesn't crash
- [ ] Test C2B callback with sandbox payment

### Production Testing (After Deployment)
- [ ] Register C2B URLs successfully
- [ ] Test KES 10 payment (auto-detect)
- [ ] Test KES 50 payment (STK Push)
- [ ] Test KES 100 payment (manual entry)
- [ ] Verify all receipts print
- [ ] Test with multiple branches
- [ ] Test concurrent payments
- [ ] Test timeout scenarios
- [ ] Train all cashiers

---

## 🔍 Monitoring & Troubleshooting

### Check Backend Logs
```bash
# Watch for C2B callbacks
tail -f server/logs/mpesa.log

# Check for errors
grep "ERROR" server/logs/mpesa.log
```

### Common Issues

**1. Auto-detect not finding payment**
- Check C2B registration is active
- Verify callback URLs are HTTPS
- Ensure firewall allows Safaricom IPs
- Check amount matches exactly (no rounding)

**2. STK Push fails**
- Verify phone number format (254...)
- Check passkey is correct
- Ensure environment is set to 'production'
- Verify credentials are valid

**3. Manual entry not working**
- Check receipt code format
- Verify it's a real M-Pesa code
- Ensure sandbox mode is disabled

**4. C2B callback not received**
- Check HTTPS certificate is valid
- Verify URLs are publicly accessible
- Test with `curl` from external server
- Check Safaricom firewall whitelist

---

## 📊 Database Records

Every M-Pesa payment creates a `MpesaTransaction` record:

```prisma
model MpesaTransaction {
  id                  Int       @id @default(autoincrement())
  merchantRequestId   String    @unique
  checkoutRequestId   String    @unique
  phoneNumber         String
  amount              Decimal
  accountReference    String
  mpesaReceiptNumber  String?
  status              String    // PENDING, COMPLETED, FAILED
  branchId            String
  createdAt           DateTime
  completedAt         DateTime?
}
```

Query recent payments:
```sql
SELECT * FROM MpesaTransaction
WHERE status = 'COMPLETED'
ORDER BY createdAt DESC
LIMIT 10;
```

---

## 🎯 Production Optimization

### 1. Add Payment Claim System
Prevent double-claiming of C2B payments:

```prisma
model MpesaTransaction {
  // Add this field
  claimedBySaleId String?
  claimedAt       DateTime?
}
```

Then update auto-detect to exclude claimed payments.

### 2. Multi-Branch Support
Update C2B callback to detect branch from:
- BillRefNumber encoding (e.g., BR1-SALE123)
- Customer phone number mapping
- POS terminal ID

### 3. Add Reconciliation Report
Daily report of:
- Unclaimed M-Pesa payments
- Flagged sales needing verification
- Amount discrepancies
- Failed transactions

### 4. Set Up Alerts
Notify manager when:
- Payment flagged for verification
- C2B callback fails
- Amount mismatch detected
- Multiple payments same amount (conflict)

---

## 📞 Support Contacts

**Safaricom M-Pesa Support:**
- Daraja Portal: https://developer.safaricom.co.ke
- Support Email: apisupport@safaricom.co.ke
- Phone: 0722 000 000

**Technical Issues:**
- Check logs first
- Test in sandbox
- Contact your developer

---

## ✅ Final Checklist Before Go-Live

- [ ] Production credentials obtained
- [ ] Environment variables updated
- [ ] Domain has valid HTTPS certificate
- [ ] C2B URLs registered with Safaricom
- [ ] Small test transactions successful
- [ ] All cashiers trained
- [ ] Manager knows how to handle flagged sales
- [ ] Backup plan in place (manual entry)
- [ ] Receipt printer tested
- [ ] Logs monitoring set up

---

## 🎉 You're Ready!

Once you complete the production checklist, your M-Pesa integration will be **fully operational**. Customers can pay themselves from their phones, and the system will auto-detect payments instantly.

**Questions?** Review this guide or check the logs for specific errors.

---

**Last Updated:** 2026-02-04
**Version:** 1.0 - Production Ready
**Integration:** C2B Auto-Detect + STK Push + Manual Entry
**Status:** ✅ Configured for Sandbox → Ready for Production
