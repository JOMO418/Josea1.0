// ============================================
// M-PESA C2B REGISTRATION SCRIPT
// ============================================
// This script registers your C2B URLs with M-Pesa sandbox
// Run this once to enable auto-payment detection

const path = require('path');
const fs = require('fs');

// Try multiple possible .env locations
const possiblePaths = [
  path.join(__dirname, '..', '.env'),           // server/.env (from server/scripts/)
  path.join(process.cwd(), 'server', '.env'),   // server/.env (from root)
  path.join(process.cwd(), '.env'),             // ./.env (from server)
];

let envPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    envPath = p;
    break;
  }
}

if (envPath) {
  require('dotenv').config({ path: envPath });
  console.log('📁 Loading .env from:', envPath);
} else {
  require('dotenv').config(); // Try default
}

const axios = require('axios');

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
// Extract base URL from callback URL (remove /api/payment/callback or /api/mpesa/callback)
const CALLBACK_BASE_URL = process.env.MPESA_CALLBACK_URL?.replace(/\/api\/(payment|mpesa)\/callback$/, '') || 'http://localhost:5000';
const ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox';

// Base URLs
const BASE_URL = ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

console.log('');
console.log('╔════════════════════════════════════════════╗');
console.log('║  M-PESA C2B REGISTRATION TOOL             ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');

// Validation
if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error('❌ ERROR: M-Pesa credentials not found in .env file');
  console.error('   Please ensure MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are set');
  console.error('');
  console.error('   Current values:');
  console.error('   MPESA_CONSUMER_KEY:', CONSUMER_KEY ? '✅ Set' : '❌ Missing');
  console.error('   MPESA_CONSUMER_SECRET:', CONSUMER_SECRET ? '✅ Set' : '❌ Missing');
  console.error('   SHORT_CODE:', SHORT_CODE || '❌ Missing');
  console.error('');
  console.error('   .env file location:', envPath || 'Not found');
  console.error('');
  console.error('   Try running from server directory:');
  console.error('   cd server');
  console.error('   node scripts/register-c2b.js');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log('   Environment:', ENVIRONMENT);
console.log('   Short Code:', SHORT_CODE);
console.log('   Base URL:', BASE_URL);
console.log('   Callback URL:', CALLBACK_BASE_URL);
console.log('');

// Step 1: Get Access Token
async function getAccessToken() {
  try {
    console.log('🔐 Step 1: Getting access token...');

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log('   ✅ Access token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('   ❌ Failed to get access token');
    if (error.response) {
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    throw error;
  }
}

// Step 2: Register C2B URLs
async function registerC2B(accessToken) {
  try {
    console.log('');
    console.log('📡 Step 2: Registering C2B URLs...');

    // Use /api/payment/c2b/* to avoid "URL contains MPESA" error
    const validationURL = `${CALLBACK_BASE_URL}/api/payment/c2b/validate`;
    const confirmationURL = `${CALLBACK_BASE_URL}/api/payment/c2b/confirm`;

    console.log('   Validation URL:', validationURL);
    console.log('   Confirmation URL:', confirmationURL);
    console.log('');

    const response = await axios.post(
      `${BASE_URL}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode: SHORT_CODE,
        ResponseType: 'Completed', // or 'Cancelled' to only get completed transactions
        ConfirmationURL: confirmationURL,
        ValidationURL: validationURL,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('   ✅ C2B URLs registered successfully!');
    console.log('');
    console.log('📊 Response from M-Pesa:');
    console.log('   Response Code:', response.data.ResponseCode || response.data.OriginatorCoversationID);
    console.log('   Response Description:', response.data.ResponseDescription || 'Success');
    console.log('');

    return response.data;
  } catch (error) {
    console.error('   ❌ Failed to register C2B URLs');
    if (error.response) {
      console.error('   Error Code:', error.response.data?.errorCode);
      console.error('   Error Message:', error.response.data?.errorMessage);
      console.error('   Full Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    throw error;
  }
}

// Step 3: Test C2B with Simulated Payment (Sandbox Only)
async function testC2BPayment(accessToken) {
  if (ENVIRONMENT !== 'sandbox') {
    console.log('⚠️  Skipping test payment (production environment)');
    return;
  }

  try {
    console.log('🧪 Step 3: Testing C2B with simulated payment...');
    console.log('   (This is a test transaction in sandbox)');
    console.log('');

    const response = await axios.post(
      `${BASE_URL}/mpesa/c2b/v1/simulate`,
      {
        ShortCode: SHORT_CODE,
        CommandID: 'CustomerPayBillOnline',
        Amount: 100,
        Msisdn: '254708374149', // Sandbox test number
        BillRefNumber: 'TEST-' + Date.now(),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('   ✅ Test payment sent!');
    console.log('   Response:', response.data.ResponseDescription || 'Success');
    console.log('');
    console.log('   ⏳ Check your server logs for the C2B callback in a few seconds...');
    console.log('');
  } catch (error) {
    console.error('   ⚠️  Test payment failed (this is okay if C2B registration succeeded)');
    if (error.response) {
      console.error('   Error:', error.response.data?.errorMessage || error.response.data);
    }
    console.log('');
  }
}

// Main execution
async function main() {
  try {
    // Get access token
    const accessToken = await getAccessToken();

    // Register C2B URLs
    await registerC2B(accessToken);

    // Test with simulated payment (sandbox only)
    await testC2BPayment(accessToken);

    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ C2B REGISTRATION COMPLETE!            ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('✨ Next Steps:');
    console.log('   1. Make sure your backend server is running (npm run dev)');
    console.log('   2. Ensure ngrok is running and MPESA_CALLBACK_URL is set correctly');
    console.log('   3. Test by paying to till number:', SHORT_CODE);
    console.log('   4. Check server logs for C2B confirmation callbacks');
    console.log('');
    console.log('🏪 Your system is now ready for supermarket-style instant M-Pesa detection!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════╗');
    console.error('║  ❌ REGISTRATION FAILED                   ║');
    console.error('╚════════════════════════════════════════════╝');
    console.error('');
    console.error('Please check:');
    console.error('  1. .env file has correct M-Pesa credentials');
    console.error('  2. MPESA_CALLBACK_URL is accessible (use ngrok for local dev)');
    console.error('  3. Your internet connection is working');
    console.error('  4. M-Pesa sandbox is not down (check status.safaricom.co.ke)');
    console.error('');
    process.exit(1);
  }
}

// Run the script
main();
