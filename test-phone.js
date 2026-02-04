// Quick Phone Number Test Script
// Run with: node test-phone.js

console.log('='.repeat(60));
console.log('M-PESA PHONE NUMBER VALIDATION TEST');
console.log('='.repeat(60));
console.log('');

const yourPhone = '0798818197';

// Phone validation logic (simplified)
function validatePhone(phone) {
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }

  const prefix = cleaned.substring(3, 6);

  // Network detection
  let network = 'Unknown';
  if (prefix >= '700' && prefix <= '729') network = 'Safaricom';
  if (prefix >= '790' && prefix <= '799') network = 'Safaricom';
  if (prefix >= '740' && prefix <= '748') network = 'Safaricom';
  if (prefix >= '110' && prefix <= '115') network = 'Safaricom';
  if (prefix >= '730' && prefix <= '739') network = 'Airtel';
  if (prefix >= '750' && prefix <= '756') network = 'Airtel';
  if (prefix >= '780' && prefix <= '789') network = 'Airtel';
  if (prefix >= '100' && prefix <= '109') network = 'Airtel';
  if (prefix >= '770' && prefix <= '779') network = 'Telkom Kenya';

  return {
    original: phone,
    formatted: cleaned,
    international: '+' + cleaned,
    local: '0' + cleaned.substring(3),
    display: `0${cleaned.substring(3, 7)} ${cleaned.substring(7, 10)} ${cleaned.substring(10)}`,
    masked: `0${cleaned.substring(3, 7)}****${cleaned.substring(10)}`,
    network,
    prefix,
    mpesaReady: network === 'Safaricom' || network === 'Airtel',
    valid: cleaned.length === 12 && cleaned.startsWith('254'),
  };
}

const result = validatePhone(yourPhone);

console.log('YOUR PHONE NUMBER DETAILS');
console.log('-'.repeat(60));
console.log('');

console.log(`📱 Original Input:     ${result.original}`);
console.log(`✅ Valid:              ${result.valid ? 'YES' : 'NO'}`);
console.log(`📞 Formatted:          ${result.formatted}`);
console.log(`🌍 International:      ${result.international}`);
console.log(`🇰🇪 Local Format:       ${result.local}`);
console.log(`👁️  Display Format:     ${result.display}`);
console.log(`🔒 Masked Format:      ${result.masked}`);
console.log(`📡 Network:            ${result.network}`);
console.log(`🔢 Prefix:             ${result.prefix}`);
console.log(`💰 M-Pesa Ready:       ${result.mpesaReady ? 'YES ✓' : 'NO ✗'}`);
console.log('');

console.log('='.repeat(60));
console.log('TESTING MODES');
console.log('='.repeat(60));
console.log('');

console.log('1️⃣  SANDBOX MODE (For Development)');
console.log('   ❌ Your number WILL NOT WORK in sandbox');
console.log('   ✅ Use test number: 254708374149');
console.log('   📝 No real money involved');
console.log('   ⚡ Instant testing');
console.log('');

console.log('2️⃣  PRODUCTION MODE (For Real Transactions)');
if (result.mpesaReady) {
  console.log('   ✅ Your number WILL WORK in production');
  console.log('   💳 Real money transactions');
  console.log('   🔐 Requires production credentials');
  console.log('   🏢 Requires registered business');
} else {
  console.log('   ❌ Your number does not support M-Pesa');
  console.log('   📱 Only Safaricom and Airtel support M-Pesa');
}
console.log('');

console.log('='.repeat(60));
console.log('QUICK START TESTING');
console.log('='.repeat(60));
console.log('');

console.log('Step 1: Setup Environment Variables');
console.log('────────────────────────────────────');
console.log('Edit server/.env:');
console.log('');
console.log('MPESA_ENVIRONMENT=sandbox');
console.log('MPESA_CONSUMER_KEY=your_key_from_portal');
console.log('MPESA_CONSUMER_SECRET=your_secret_from_portal');
console.log('MPESA_BUSINESS_SHORT_CODE=174379');
console.log('MPESA_PASSKEY=your_passkey');
console.log('MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/mpesa/callback');
console.log('');

console.log('Step 2: Setup Ngrok');
console.log('────────────────────────────────────');
console.log('Terminal 1:');
console.log('  cd server && npm run dev');
console.log('');
console.log('Terminal 2:');
console.log('  ngrok http 5000');
console.log('  (Copy the HTTPS URL to MPESA_CALLBACK_URL)');
console.log('');

console.log('Step 3: Start Testing');
console.log('────────────────────────────────────');
console.log('Terminal 3:');
console.log('  cd client && npm run dev');
console.log('');
console.log('In the app:');
console.log('  - Add items to cart');
console.log('  - Click Checkout');
console.log('  - Enter amount: 10');
console.log('  - Enter phone: 254708374149 (sandbox test number)');
console.log('  - Click Finalize Sale');
console.log('  - Watch it complete automatically');
console.log('');

console.log('='.repeat(60));
console.log('TEST PHONE NUMBERS (SANDBOX ONLY)');
console.log('='.repeat(60));
console.log('');
console.log('✅ Success:           254708374149');
console.log('❌ Cancelled:         254799920155');
console.log('⏱️  Timeout:           254799920156');
console.log('💳 Insufficient:      254799920158');
console.log('');

console.log('='.repeat(60));
console.log('WHEN TO USE YOUR REAL NUMBER');
console.log('='.repeat(60));
console.log('');
console.log(`Your Number: ${result.display}`);
console.log(`Network: ${result.network}`);
console.log(`M-Pesa Ready: ${result.mpesaReady ? 'YES ✓' : 'NO ✗'}`);
console.log('');

if (result.mpesaReady) {
  console.log('✅ You CAN use your number in PRODUCTION mode');
  console.log('');
  console.log('Requirements:');
  console.log('  1. Production M-Pesa credentials from Safaricom');
  console.log('  2. Registered business with Paybill/Till number');
  console.log('  3. Production server with HTTPS domain');
  console.log('  4. Change MPESA_ENVIRONMENT=production in .env');
  console.log('');
  console.log('Then you can test with:');
  console.log(`  Phone: ${result.formatted}`);
  console.log('  Amount: Any amount (real money!)');
} else {
  console.log('❌ Your number does not support M-Pesa');
}
console.log('');

console.log('='.repeat(60));
console.log('📚 MORE INFO: See MPESA_TESTING_GUIDE.md');
console.log('='.repeat(60));
console.log('');
