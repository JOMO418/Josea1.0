# 🚀 C2B Registration Guide - Quick Start

## What is C2B?

**C2B (Customer to Business)** enables **instant payment detection** - just like supermarkets use!

- Customer pays directly to your till number
- M-Pesa notifies your system **instantly** (1-3 seconds)
- No STK Push delays
- Works even if customer's phone is offline

---

## ⚡ Quick Registration (3 Steps)

### **Step 1: Make Sure Backend is Running**

```powershell
# Terminal 1 - Start backend
cd server
npm run dev
```

### **Step 2: Start Ngrok (for callbacks)**

```powershell
# Terminal 2 - Start ngrok
ngrok http 5000

# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
# Update server/.env:
# MPESA_CALLBACK_URL=https://abc123.ngrok-free.app/api/mpesa/callback
```

### **Step 3: Run Registration Script**

**Option A: Double-click the batch file**
```
server/scripts/register-c2b.bat
```

**Option B: Run from PowerShell/CMD**
```powershell
cd server
node scripts/register-c2b.js
```

---

## ✅ What the Script Does

1. ✅ Connects to M-Pesa sandbox
2. ✅ Gets access token
3. ✅ Registers your C2B validation URL
4. ✅ Registers your C2B confirmation URL
5. ✅ Sends test payment to verify it works

---

## 📊 Expected Output

```
╔════════════════════════════════════════════╗
║  M-PESA C2B REGISTRATION TOOL             ║
╚════════════════════════════════════════════╝

📋 Configuration:
   Environment: sandbox
   Short Code: 174379
   Base URL: https://sandbox.safaricom.co.ke
   Callback URL: https://abc123.ngrok-free.app

🔐 Step 1: Getting access token...
   ✅ Access token obtained

📡 Step 2: Registering C2B URLs...
   Validation URL: https://abc123.ngrok-free.app/api/mpesa/c2b/validate
   Confirmation URL: https://abc123.ngrok-free.app/api/mpesa/c2b/confirm

   ✅ C2B URLs registered successfully!

📊 Response from M-Pesa:
   Response Code: Success
   Response Description: Success

🧪 Step 3: Testing C2B with simulated payment...
   ✅ Test payment sent!
   ⏳ Check your server logs for the C2B callback...

╔════════════════════════════════════════════╗
║  ✅ C2B REGISTRATION COMPLETE!            ║
╚════════════════════════════════════════════╝

✨ Next Steps:
   1. Make sure your backend server is running
   2. Ensure ngrok is running and MPESA_CALLBACK_URL is set
   3. Test by paying to till number: 174379
   4. Check server logs for C2B confirmation callbacks

🏪 Your system is now ready for instant M-Pesa detection!
```

---

## 🧪 Testing C2B After Registration

### **Method 1: Simulate Payment (Sandbox)**

```bash
# The script already sends a test payment
# Check your server console for:
# ✅ [C2B Confirmation] Payment received!
```

### **Method 2: Manual Test via API**

```powershell
# Get access token first (use the script or Postman)
# Then simulate payment:

curl -X POST https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"ShortCode\":\"174379\",\"CommandID\":\"CustomerPayBillOnline\",\"Amount\":100,\"Msisdn\":\"254708374149\",\"BillRefNumber\":\"TEST123\"}"
```

### **Method 3: Test in POS System**

Once C2B is registered and Phase 1 is implemented:

1. Open POS → Add items → Checkout
2. System shows till number: **174379**
3. Customer "pays" via sandbox simulation
4. System auto-detects payment in 1-3 seconds
5. Sale completes automatically ✅

---

## ⚠️ Troubleshooting

### **Error: "Failed to get access token"**
- ❌ Check `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` in `.env`
- ❌ Verify internet connection
- ❌ Check M-Pesa API status: https://status.safaricom.co.ke

### **Error: "Failed to register C2B URLs"**
- ❌ Check `MPESA_CALLBACK_URL` is a valid HTTPS URL
- ❌ Ensure ngrok is running
- ❌ Test callback URL: `curl https://your-ngrok-url.ngrok.io/api/mpesa/c2b/validate`
- ❌ Check backend server is running

### **Error: "Invalid access token"**
- ❌ Your credentials might be wrong
- ❌ Re-check Safaricom Developer Portal for correct keys

### **Callback not received**
- ❌ Ngrok tunnel might have expired (restart ngrok)
- ❌ Update `MPESA_CALLBACK_URL` with new ngrok URL
- ❌ Re-run registration script with new URL
- ❌ Check firewall/antivirus blocking ngrok

---

## 🔄 Re-Registration

You need to re-run the script if:

1. **Ngrok URL changes** (ngrok restarts)
2. **Callback URL changes** (switching from local to production)
3. **Environment changes** (sandbox → production)

Simply run the script again - it's safe to re-register.

---

## 📝 How C2B Works

```
┌─────────────┐
│  Customer   │
│   Phone     │
└──────┬──────┘
       │
       │ 1. Customer pays to Till 174379
       │    (Lipa Na M-Pesa → Paybill)
       ↓
┌─────────────┐
│   M-Pesa    │
│   System    │
└──────┬──────┘
       │
       │ 2. M-Pesa sends instant notification
       │    POST /api/mpesa/c2b/confirm
       ↓
┌─────────────┐
│ Your Server │
│  (Backend)  │
└──────┬──────┘
       │
       │ 3. Finds matching sale by reference
       │    Updates status to COMPLETED
       ↓
┌─────────────┐
│   POS UI    │
│  (Frontend) │
└──────┬──────┘
       │
       │ 4. Auto-detects payment via polling
       │    Shows "Payment Confirmed!" ✅
       ↓
   Sale Complete
```

**Timeline:**
- STK Push: 30-60 seconds (sends prompt, waits for customer)
- C2B: 1-3 seconds (customer already paid, instant notification)

---

## 🎯 Next Steps After Registration

1. ✅ C2B registration complete (you're here!)
2. ⏳ Implement Phase 1: Enhanced checkout with C2B detection
3. ⏳ Implement Phase 2: Manual code verification
4. ⏳ Implement Phase 3: "Confirm Later" workflow
5. ⏳ Implement Phase 4: Manager review interface

---

## 📞 Support

### M-Pesa API Issues
- Developer Portal: https://developer.safaricom.co.ke/
- Email: apisupport@safaricom.co.ke
- Phone: 0722 000 000

### Script Issues
- Check server console logs
- Verify `.env` file configuration
- Test ngrok tunnel manually

---

## 🚀 Production Checklist

When moving to production:

- [ ] Get production credentials from Safaricom
- [ ] Update `.env` with production keys
- [ ] Change `MPESA_ENVIRONMENT=production`
- [ ] Use production domain (HTTPS required, no ngrok)
- [ ] Re-run registration script with production URL
- [ ] Test with real till number and real phone numbers

---

**You're ready to enable instant M-Pesa detection! 🎉**
