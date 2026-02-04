// ============================================
// PHONE VALIDATOR TESTS & EXAMPLES
// ============================================

import {
  validateKenyanPhone,
  formatPhoneForDisplay,
  isValidKenyanPhone,
  formatForMpesa,
  getNetworkProvider,
  maskPhoneNumber,
  extractPhoneNumbers,
  arePhoneNumbersEqual,
  getPhoneMetadata,
  validateForMpesa,
  formatInternational,
} from './phone-validator';

// ============================================
// TEST CASES
// ============================================

console.log('=== PHONE VALIDATOR TESTS ===\n');

// Test 1: Validate Kenyan Phone Numbers
console.log('1. VALIDATE KENYAN PHONE NUMBERS');
console.log('--------------------------------');

const testPhones = [
  '0712345678',      // Local Safaricom
  '0734567890',      // Local Airtel
  '0778901234',      // Local Telkom
  '712345678',       // Without leading 0
  '254712345678',    // International
  '+254712345678',   // International with +
  '0712 345 678',    // With spaces
  '071-234-5678',    // With dashes
  '0812345678',      // Invalid prefix
  '12345',           // Too short
  'abcd',            // Invalid characters
];

testPhones.forEach(phone => {
  const result = validateKenyanPhone(phone);
  console.log(`Input: "${phone}"`);
  console.log(`Valid: ${result.valid}`);
  console.log(`Formatted: ${result.formatted}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log('');
});

// Test 2: Format for Display
console.log('\n2. FORMAT FOR DISPLAY');
console.log('--------------------------------');

const displayTests = [
  '254712345678',
  '0712345678',
  '712345678',
  '+254712345678',
];

displayTests.forEach(phone => {
  const formatted = formatPhoneForDisplay(phone);
  console.log(`${phone} → ${formatted}`);
});

// Test 3: Quick Validation
console.log('\n3. QUICK BOOLEAN VALIDATION');
console.log('--------------------------------');

const quickTests = [
  '0712345678',
  '0812345678',
  '254734567890',
  'invalid',
];

quickTests.forEach(phone => {
  const isValid = isValidKenyanPhone(phone);
  console.log(`${phone}: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
});

// Test 4: Format for M-Pesa
console.log('\n4. FORMAT FOR M-PESA (STRICT)');
console.log('--------------------------------');

const mpesaTests = [
  '0712345678',
  '254734567890',
  'invalid',
];

mpesaTests.forEach(phone => {
  try {
    const formatted = formatForMpesa(phone);
    console.log(`${phone} → ${formatted} ✓`);
  } catch (error: any) {
    console.log(`${phone} → Error: ${error.message} ✗`);
  }
});

// Test 5: Network Provider Detection
console.log('\n5. NETWORK PROVIDER DETECTION');
console.log('--------------------------------');

const providerTests = [
  '0712345678',   // Safaricom
  '0722334455',   // Safaricom
  '0734567890',   // Airtel
  '0750123456',   // Airtel
  '0778901234',   // Telkom
  '0110223344',   // Safaricom (01XX)
  '0100123456',   // Airtel (010X)
];

providerTests.forEach(phone => {
  const provider = getNetworkProvider(phone);
  console.log(`${phone} → ${provider}`);
});

// Test 6: Mask Phone Numbers
console.log('\n6. MASK PHONE NUMBERS');
console.log('--------------------------------');

const maskTests = [
  '0712345678',
  '254712345678',
  '+254712345678',
  '712345678',
];

maskTests.forEach(phone => {
  const masked = maskPhoneNumber(phone);
  console.log(`${phone} → ${masked}`);
});

// Test 7: Extract Phone Numbers from Text
console.log('\n7. EXTRACT PHONES FROM TEXT');
console.log('--------------------------------');

const texts = [
  'Call me on 0712345678 or 0734567890',
  'My number is +254712345678',
  'Contact: 0712345678, 254734567890, 0778901234',
  'No valid phones: 123456, abcdef',
];

texts.forEach(text => {
  const phones = extractPhoneNumbers(text);
  console.log(`Text: "${text}"`);
  console.log(`Found: ${phones.length > 0 ? phones.join(', ') : 'None'}`);
  console.log('');
});

// Test 8: Compare Phone Numbers
console.log('\n8. COMPARE PHONE NUMBERS');
console.log('--------------------------------');

const comparisons = [
  ['0712345678', '254712345678', true],
  ['0712345678', '+254712345678', true],
  ['712345678', '254712345678', true],
  ['0712345678', '0734567890', false],
  ['invalid', '0712345678', false],
];

comparisons.forEach(([phone1, phone2, expected]) => {
  const result = arePhoneNumbersEqual(phone1 as string, phone2 as string);
  const status = result === expected ? '✓' : '✗';
  console.log(`${status} "${phone1}" == "${phone2}": ${result}`);
});

// Test 9: Get Phone Metadata
console.log('\n9. PHONE METADATA');
console.log('--------------------------------');

const metadataTests = [
  '0712345678',
  '0734567890',
  '0778901234',
];

metadataTests.forEach(phone => {
  const meta = getPhoneMetadata(phone);
  console.log(`\nPhone: ${phone}`);
  console.log(`Valid: ${meta.valid}`);
  if (meta.valid) {
    console.log(`Formatted: ${meta.formatted}`);
    console.log(`Display: ${meta.display}`);
    console.log(`Masked: ${meta.masked}`);
    console.log(`Provider: ${meta.provider}`);
    console.log(`Country Code: ${meta.countryCode}`);
    console.log(`National: ${meta.nationalNumber}`);
    console.log(`Local: ${meta.local}`);
  }
});

// Test 10: Validate for M-Pesa Specifically
console.log('\n10. M-PESA SPECIFIC VALIDATION');
console.log('--------------------------------');

const mpesaValidationTests = [
  '0712345678',   // Safaricom - should pass
  '0734567890',   // Airtel - should pass
  '0778901234',   // Telkom - should fail (M-Pesa not supported)
];

mpesaValidationTests.forEach(phone => {
  const result = validateForMpesa(phone);
  console.log(`${phone}:`);
  console.log(`  Valid: ${result.valid}`);
  console.log(`  Provider: ${getNetworkProvider(phone)}`);
  if (!result.valid) console.log(`  Error: ${result.error}`);
  console.log('');
});

// Test 11: International Format
console.log('\n11. INTERNATIONAL FORMAT');
console.log('--------------------------------');

const internationalTests = [
  '0712345678',
  '712345678',
  '254712345678',
];

internationalTests.forEach(phone => {
  const formatted = formatInternational(phone);
  console.log(`${phone} → ${formatted}`);
});

// ============================================
// USAGE EXAMPLES
// ============================================

console.log('\n\n=== USAGE EXAMPLES ===\n');

// Example 1: Form Validation
console.log('EXAMPLE 1: Form Validation');
console.log('--------------------------------');

function validatePhoneInput(userInput: string): void {
  const result = validateKenyanPhone(userInput);

  if (!result.valid) {
    console.log(`❌ Error: ${result.error}`);
    return;
  }

  console.log(`✓ Valid phone: ${result.formatted}`);
  console.log(`  Display as: ${formatPhoneForDisplay(result.formatted)}`);
  console.log(`  Network: ${getNetworkProvider(result.formatted)}`);
}

validatePhoneInput('0712345678');
validatePhoneInput('invalid');

// Example 2: M-Pesa Payment
console.log('\n\nEXAMPLE 2: M-Pesa Payment');
console.log('--------------------------------');

function initiateMpesaPayment(phoneInput: string, amount: number): void {
  console.log(`Initiating payment of KES ${amount} to ${phoneInput}`);

  // Validate for M-Pesa
  const validation = validateForMpesa(phoneInput);

  if (!validation.valid) {
    console.log(`❌ Cannot process: ${validation.error}`);
    return;
  }

  try {
    const mpesaPhone = formatForMpesa(phoneInput);
    console.log(`✓ Sending STK push to: ${mpesaPhone}`);
    console.log(`  Network: ${getNetworkProvider(mpesaPhone)}`);
    console.log(`  Display: ${formatPhoneForDisplay(mpesaPhone)}`);
    // Send to M-Pesa API...
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
}

initiateMpesaPayment('0712345678', 1000);
initiateMpesaPayment('0778901234', 1000); // Telkom - should fail

// Example 3: Customer Privacy
console.log('\n\nEXAMPLE 3: Display Customer Phone (Privacy)');
console.log('--------------------------------');

function displayCustomerPhone(phone: string): void {
  const masked = maskPhoneNumber(phone);
  const provider = getNetworkProvider(phone);

  console.log(`Customer: ${masked} (${provider})`);
}

displayCustomerPhone('0712345678');
displayCustomerPhone('0734567890');

// Example 4: Bulk Phone Processing
console.log('\n\nEXAMPLE 4: Process Multiple Phones');
console.log('--------------------------------');

function processBulkPhones(phones: string[]): void {
  console.log(`Processing ${phones.length} phone numbers...\n`);

  const results = {
    valid: 0,
    invalid: 0,
    safaricom: 0,
    airtel: 0,
    telkom: 0,
  };

  phones.forEach(phone => {
    if (isValidKenyanPhone(phone)) {
      results.valid++;
      const provider = getNetworkProvider(phone);

      if (provider === 'Safaricom') results.safaricom++;
      else if (provider === 'Airtel') results.airtel++;
      else if (provider === 'Telkom Kenya') results.telkom++;
    } else {
      results.invalid++;
    }
  });

  console.log('Results:');
  console.log(`  Valid: ${results.valid}`);
  console.log(`  Invalid: ${results.invalid}`);
  console.log(`  Safaricom: ${results.safaricom}`);
  console.log(`  Airtel: ${results.airtel}`);
  console.log(`  Telkom: ${results.telkom}`);
}

processBulkPhones([
  '0712345678',
  '0734567890',
  '0778901234',
  '0722334455',
  'invalid',
  '0100123456',
]);

// Example 5: Search and Extract
console.log('\n\nEXAMPLE 5: Extract Phones from Customer Message');
console.log('--------------------------------');

function processCustomerMessage(message: string): void {
  console.log(`Message: "${message}"\n`);

  const phones = extractPhoneNumbers(message);

  if (phones.length === 0) {
    console.log('No valid phone numbers found.');
    return;
  }

  console.log(`Found ${phones.length} valid phone number(s):\n`);

  phones.forEach((phone, index) => {
    const meta = getPhoneMetadata(phone);
    console.log(`${index + 1}. ${meta.display}`);
    console.log(`   Network: ${meta.provider}`);
    console.log(`   M-Pesa Ready: ${validateForMpesa(phone).valid ? 'Yes' : 'No'}`);
    console.log('');
  });
}

processCustomerMessage(
  'Please send payment to my M-Pesa 0712345678 or call me on 0734567890'
);

console.log('\n=== TESTS COMPLETE ===\n');

export {};
