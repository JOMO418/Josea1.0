// ============================================
// KENYAN PHONE NUMBER VALIDATOR - M-PESA UTILITY
// ============================================

/**
 * Phone validation result interface
 */
export interface PhoneValidationResult {
  valid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Kenyan mobile network providers
 */
export type KenyanNetworkProvider = 'Safaricom' | 'Airtel' | 'Telkom Kenya' | 'Unknown';

/**
 * Kenyan mobile prefixes by network provider
 */
const KENYAN_MOBILE_PREFIXES = {
  safaricom: [
    '700', '701', '702', '703', '704', '705', '706', '707', '708', '709',
    '710', '711', '712', '713', '714', '715', '716', '717', '718', '719',
    '720', '721', '722', '723', '724', '725', '726', '727', '728', '729',
    '740', '741', '742', '743', '745', '746', '748',
    '757', '759', '768', '769',
    '790', '791', '792', '793', '794', '795', '796', '797', '798', '799',
    '110', '111', '112', '113', '114', '115'
  ],
  airtel: [
    '730', '731', '732', '733', '734', '735', '736', '737', '738', '739',
    '750', '751', '752', '753', '754', '755', '756',
    '780', '781', '782', '783', '784', '785', '786', '787', '788', '789',
    '100', '101', '102', '103', '104', '105', '106', '107', '108', '109'
  ],
  telkom: [
    '770', '771', '772', '773', '774', '775', '776', '777', '778', '779'
  ]
};

/**
 * Validate and format Kenyan phone number
 *
 * Accepts various formats:
 * - 0712345678 (local format)
 * - 712345678 (without leading 0)
 * - 254712345678 (international format)
 * - +254712345678 (international with +)
 *
 * @param phone - Phone number in any accepted format
 * @returns Validation result with formatted number (254XXXXXXXXX)
 *
 * @example
 * ```typescript
 * const result = validateKenyanPhone('0712345678');
 * if (result.valid) {
 *   console.log(result.formatted); // "254712345678"
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateKenyanPhone(phone: string): PhoneValidationResult {
  // Handle null, undefined, or empty string
  if (!phone || typeof phone !== 'string') {
    return {
      valid: false,
      formatted: '',
      error: 'Phone number is required'
    };
  }

  // Remove all non-numeric characters (spaces, dashes, parentheses, etc.)
  let cleaned = phone.trim().replace(/\D/g, '');

  // Handle empty after cleaning
  if (!cleaned) {
    return {
      valid: false,
      formatted: '',
      error: 'Invalid phone number format'
    };
  }

  // Convert to international format (254XXXXXXXXX)
  if (cleaned.startsWith('0')) {
    // Local format: 0712345678 → 254712345678
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // Already in international format: 254712345678
  } else if (cleaned.length === 9) {
    // Missing both country code and leading 0: 712345678 → 254712345678
    cleaned = '254' + cleaned;
  } else {
    return {
      valid: false,
      formatted: '',
      error: 'Invalid phone number format. Use 07XX, 254XX, or +254XX format'
    };
  }

  // Validate length (must be 12 digits: 254 + 9 digits)
  if (cleaned.length !== 12) {
    return {
      valid: false,
      formatted: '',
      error: `Invalid phone number length. Expected 12 digits, got ${cleaned.length}`
    };
  }

  // Validate country code
  if (!cleaned.startsWith('254')) {
    return {
      valid: false,
      formatted: '',
      error: 'Phone number must be a Kenyan number (country code 254)'
    };
  }

  // Extract prefix (first 3 digits after country code)
  const prefix = cleaned.substring(3, 6);

  // Validate mobile prefix
  const allValidPrefixes = [
    ...KENYAN_MOBILE_PREFIXES.safaricom,
    ...KENYAN_MOBILE_PREFIXES.airtel,
    ...KENYAN_MOBILE_PREFIXES.telkom
  ];

  if (!allValidPrefixes.includes(prefix)) {
    return {
      valid: false,
      formatted: '',
      error: `Invalid Kenyan mobile prefix: ${prefix}. Must start with 07XX or 01XX`
    };
  }

  // Success
  return {
    valid: true,
    formatted: cleaned,
  };
}

/**
 * Format phone number for display (converts to local format)
 *
 * Converts international format to user-friendly local format
 * 254712345678 → 0712 345 678
 *
 * @param phone - Phone number in any format
 * @returns Formatted phone for display or original if invalid
 *
 * @example
 * ```typescript
 * formatPhoneForDisplay('254712345678'); // "0712 345 678"
 * formatPhoneForDisplay('0712345678');   // "0712 345 678"
 * ```
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';

  // Validate and format first
  const validation = validateKenyanPhone(phone);

  if (!validation.valid) {
    return phone; // Return original if invalid
  }

  // Convert to local format: 254712345678 → 0712345678
  const localFormat = '0' + validation.formatted.substring(3);

  // Add spacing: 0712345678 → 0712 345 678
  return `${localFormat.substring(0, 4)} ${localFormat.substring(4, 7)} ${localFormat.substring(7)}`;
}

/**
 * Quick boolean check for valid Kenyan phone number
 *
 * @param phone - Phone number to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidKenyanPhone('0712345678')) {
 *   // Proceed with valid phone
 * }
 * ```
 */
export function isValidKenyanPhone(phone: string): boolean {
  return validateKenyanPhone(phone).valid;
}

/**
 * Format phone number for M-Pesa API (strict formatting)
 *
 * Returns 254XXXXXXXXX format or throws error if invalid
 * Use this when you need guaranteed valid format for API calls
 *
 * @param phone - Phone number in any format
 * @returns Formatted phone for M-Pesa (254XXXXXXXXX)
 * @throws Error if phone number is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const mpesaPhone = formatForMpesa('0712345678');
 *   // Use mpesaPhone in API call
 * } catch (error) {
 *   console.error('Invalid phone:', error.message);
 * }
 * ```
 */
export function formatForMpesa(phone: string): string {
  const validation = validateKenyanPhone(phone);

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid phone number for M-Pesa');
  }

  return validation.formatted;
}

/**
 * Identify the network provider for a Kenyan phone number
 *
 * @param phone - Phone number in any format
 * @returns Network provider name
 *
 * @example
 * ```typescript
 * getNetworkProvider('0712345678'); // "Safaricom"
 * getNetworkProvider('0734567890'); // "Airtel"
 * getNetworkProvider('0778901234'); // "Telkom Kenya"
 * ```
 */
export function getNetworkProvider(phone: string): KenyanNetworkProvider {
  const validation = validateKenyanPhone(phone);

  if (!validation.valid) {
    return 'Unknown';
  }

  // Extract prefix (first 3 digits after country code)
  const prefix = validation.formatted.substring(3, 6);

  // Check each provider
  if (KENYAN_MOBILE_PREFIXES.safaricom.includes(prefix)) {
    return 'Safaricom';
  } else if (KENYAN_MOBILE_PREFIXES.airtel.includes(prefix)) {
    return 'Airtel';
  } else if (KENYAN_MOBILE_PREFIXES.telkom.includes(prefix)) {
    return 'Telkom Kenya';
  }

  return 'Unknown';
}

/**
 * Mask phone number for privacy/display
 *
 * Shows first 4 and last 3 digits, masks the middle
 * 0712345678 → 0712****678
 * 254712345678 → 2547****678
 *
 * @param phone - Phone number in any format
 * @returns Masked phone number
 *
 * @example
 * ```typescript
 * maskPhoneNumber('0712345678');    // "0712****678"
 * maskPhoneNumber('254712345678');  // "2547****678"
 * ```
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 9) {
    return phone; // Too short to mask properly
  }

  // Determine format
  let masked: string;

  if (cleaned.startsWith('254') && cleaned.length === 12) {
    // International format: 254712345678 → 2547****678
    masked = cleaned.substring(0, 4) + '****' + cleaned.substring(9);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Local format: 0712345678 → 0712****678
    masked = cleaned.substring(0, 4) + '****' + cleaned.substring(7);
  } else if (cleaned.length === 9) {
    // Without prefix: 712345678 → 712****678
    masked = cleaned.substring(0, 3) + '****' + cleaned.substring(6);
  } else {
    // Unknown format, mask middle section
    const visibleStart = Math.min(4, cleaned.length - 3);
    const visibleEnd = Math.max(visibleStart + 1, cleaned.length - 3);
    masked = cleaned.substring(0, visibleStart) + '****' + cleaned.substring(visibleEnd);
  }

  return masked;
}

/**
 * Extract phone numbers from text
 *
 * Finds and validates all Kenyan phone numbers in a text string
 *
 * @param text - Text containing phone numbers
 * @returns Array of validated phone numbers in 254XXXXXXXXX format
 *
 * @example
 * ```typescript
 * const text = "Call me on 0712345678 or 0734567890";
 * const phones = extractPhoneNumbers(text);
 * // ["254712345678", "254734567890"]
 * ```
 */
export function extractPhoneNumbers(text: string): string[] {
  if (!text) return [];

  // Regex patterns for Kenyan phone numbers
  const patterns = [
    /\+?254\s?[17]\d{8}/g,          // +254712345678 or 254712345678
    /\b0[17]\d{8}\b/g,               // 0712345678
    /\b[17]\d{8}\b/g,                // 712345678 (without leading 0)
  ];

  const found = new Set<string>();

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const validation = validateKenyanPhone(match);
        if (validation.valid) {
          found.add(validation.formatted);
        }
      });
    }
  });

  return Array.from(found);
}

/**
 * Compare two phone numbers for equality
 *
 * Normalizes and compares two phone numbers regardless of format
 *
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns True if phones are the same
 *
 * @example
 * ```typescript
 * arePhoneNumbersEqual('0712345678', '254712345678'); // true
 * arePhoneNumbersEqual('0712345678', '0734567890');   // false
 * ```
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
  const validation1 = validateKenyanPhone(phone1);
  const validation2 = validateKenyanPhone(phone2);

  if (!validation1.valid || !validation2.valid) {
    return false;
  }

  return validation1.formatted === validation2.formatted;
}

/**
 * Get phone number metadata
 *
 * Returns comprehensive information about a phone number
 *
 * @param phone - Phone number in any format
 * @returns Phone metadata object
 *
 * @example
 * ```typescript
 * const meta = getPhoneMetadata('0712345678');
 * console.log(meta);
 * // {
 * //   valid: true,
 * //   formatted: "254712345678",
 * //   display: "0712 345 678",
 * //   masked: "0712****678",
 * //   provider: "Safaricom",
 * //   countryCode: "254",
 * //   nationalNumber: "712345678"
 * // }
 * ```
 */
export function getPhoneMetadata(phone: string) {
  const validation = validateKenyanPhone(phone);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      formatted: '',
      display: '',
      masked: '',
      provider: 'Unknown' as KenyanNetworkProvider,
      countryCode: '',
      nationalNumber: ''
    };
  }

  return {
    valid: true,
    formatted: validation.formatted,
    display: formatPhoneForDisplay(phone),
    masked: maskPhoneNumber(phone),
    provider: getNetworkProvider(phone),
    countryCode: '254',
    nationalNumber: validation.formatted.substring(3),
    local: '0' + validation.formatted.substring(3)
  };
}

/**
 * Validate phone for M-Pesa specifically
 *
 * M-Pesa has stricter requirements (mainly Safaricom)
 *
 * @param phone - Phone number to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateForMpesa('0712345678');
 * if (result.valid) {
 *   // Proceed with M-Pesa payment
 * }
 * ```
 */
export function validateForMpesa(phone: string): PhoneValidationResult {
  const validation = validateKenyanPhone(phone);

  if (!validation.valid) {
    return validation;
  }

  // M-Pesa is primarily Safaricom, but also works with Airtel
  const provider = getNetworkProvider(phone);

  if (provider !== 'Safaricom' && provider !== 'Airtel') {
    return {
      valid: false,
      formatted: '',
      error: 'M-Pesa is only available on Safaricom and Airtel networks'
    };
  }

  return validation;
}

/**
 * Format phone number with country code for international display
 *
 * @param phone - Phone number in any format
 * @returns Phone with + prefix (+254712345678)
 *
 * @example
 * ```typescript
 * formatInternational('0712345678'); // "+254712345678"
 * ```
 */
export function formatInternational(phone: string): string {
  const validation = validateKenyanPhone(phone);

  if (!validation.valid) {
    return phone;
  }

  return '+' + validation.formatted;
}

// Export all functions
export default {
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
};
