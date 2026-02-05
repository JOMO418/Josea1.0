/**
 * Smart Product Search Utilities
 * Handles misspellings, spacing issues, and intelligent matching
 */

/**
 * Common automotive part misspellings and synonyms
 */
const MISSPELLINGS = {
  // Common misspellings
  'brek': 'brake',
  'brakes': 'brake',
  'shok': 'shock',
  'shoks': 'shock',
  'absober': 'absorber',
  'abzorber': 'absorber',
  'alternater': 'alternator',
  'batry': 'battery',
  'battry': 'battery',
  'batery': 'battery',
  'filtre': 'filter',
  'radiater': 'radiator',
  'sparkplug': 'spark plug',
  'sparkplugs': 'spark plug',
  'oilfilter': 'oil filter',
  'airfilter': 'air filter',
  'fuelfilter': 'fuel filter',

  // Synonyms
  'damper': 'shock absorber',
  'shocks': 'shock absorber',
  'pads': 'brake pad',
  'disc': 'brake disc',
  'rotor': 'brake disc',
  'generator': 'alternator',
  'dynamo': 'alternator',
  'lining': 'brake pad',
};

/**
 * Common automotive parts (for detection)
 */
const AUTOMOTIVE_PARTS = [
  // Brake system
  'brake pad', 'brake pads', 'brake disc', 'brake rotor', 'brake fluid',
  'brake caliper', 'brake shoe', 'brake drum',

  // Filters
  'oil filter', 'air filter', 'fuel filter', 'cabin filter',
  'air cleaner', 'oil cleaner',

  // Engine parts
  'spark plug', 'spark plugs', 'ignition coil', 'timing belt',
  'serpentine belt', 'drive belt', 'alternator', 'starter motor',
  'starter', 'water pump', 'fuel pump', 'radiator',

  // Suspension
  'shock absorber', 'shock absorbers', 'damper', 'strut', 'struts',
  'coil spring', 'leaf spring', 'control arm', 'ball joint',
  'tie rod', 'stabilizer bar', 'sway bar',

  // Electrical
  'battery', 'headlight', 'tail light', 'fog light', 'bulb',
  'fuse', 'relay', 'wiring harness',

  // Fluids
  'engine oil', 'transmission fluid', 'coolant', 'antifreeze',
  'power steering fluid', 'brake fluid',

  // Other common
  'bearing', 'bushing', 'gasket', 'seal', 'hose',
  'thermostat', 'sensor', 'injector', 'clutch',
];

/**
 * Detect if query contains a part number
 * Patterns: SA-HC-001, BP-123, WP456, etc.
 */
function detectPartNumber(query) {
  // Pattern 1: XX-YY-ZZZ (letters-letters-numbers or mixed)
  const pattern1 = /\b([A-Z]{2,4}-[A-Z0-9]{2,}-[A-Z0-9]+)\b/i;
  // Pattern 2: XX-YYYYY (letters-alphanum)
  const pattern2 = /\b([A-Z]{2,4}-[A-Z0-9]{3,})\b/i;
  // Pattern 3: part #XXX or part number XXX
  const pattern3 = /\b(?:part\s*(?:number|#|no\.?)\s*)([A-Z0-9-]+)\b/i;

  const match = query.match(pattern1) || query.match(pattern2) || query.match(pattern3);
  return match ? match[1] : null;
}

/**
 * Detect if query contains an automotive part name
 */
function detectAutomotivePart(query) {
  const lowerQuery = query.toLowerCase();

  // Check exact matches first (most specific)
  for (const part of AUTOMOTIVE_PARTS) {
    if (lowerQuery.includes(part)) {
      return part;
    }
  }

  // Check for partial matches (single words)
  const words = lowerQuery.split(/\s+/);
  for (const word of words) {
    if (word.length >= 4) { // Minimum word length
      for (const part of AUTOMOTIVE_PARTS) {
        if (part.includes(word)) {
          return word;
        }
      }
    }
  }

  return null;
}

/**
 * Normalize search term (remove noise, fix common issues)
 */
function normalizeSearchTerm(term) {
  if (!term || typeof term !== 'string') return '';

  let normalized = term.toLowerCase().trim();

  // Remove punctuation first
  normalized = normalized.replace(/[?!.,;:]/g, ' ');

  // Remove common noise words
  const noiseWords = [
    'how much', 'bei', 'price', 'cost', 'selling', 'is', 'are', 'the',
    'of', 'for', 'a', 'an', 'do we have', 'do you have', 'available',
    'fit', 'fits', 'compatible', 'what', 'show', 'me', 'tell', 'get',
    'find', 'kiasi gani', 'bei ya', 'una', 'kuna', 'tunacho', 'and',
    'distribution', 'across', 'branches', 'what is', 'whats',
  ];

  for (const noise of noiseWords) {
    // Escape special regex characters in noise word
    const escapedNoise = noise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedNoise}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  }

  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Fix common misspellings
  for (const [wrong, correct] of Object.entries(MISSPELLINGS)) {
    const escapedWrong = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWrong}\\b`, 'gi');
    normalized = normalized.replace(regex, correct);
  }

  return normalized;
}

/**
 * Generate multiple search variations for a term
 * Handles spacing, hyphens, and word combinations
 */
function generateSearchVariations(term) {
  if (!term) return [];

  const variations = new Set();
  const normalized = normalizeSearchTerm(term);

  // Add normalized version
  variations.add(normalized);

  // Remove all spaces (waterpump)
  variations.add(normalized.replace(/\s+/g, ''));

  // Replace spaces with hyphens (water-pump)
  variations.add(normalized.replace(/\s+/g, '-'));

  // Add with single space (water pump)
  if (!normalized.includes(' ') && normalized.length > 4) {
    // Try to intelligently split compound words
    const splitPositions = findLikelySplitPositions(normalized);
    for (const pos of splitPositions) {
      variations.add(normalized.slice(0, pos) + ' ' + normalized.slice(pos));
    }
  }

  // Remove hyphens
  variations.add(normalized.replace(/-/g, ' '));
  variations.add(normalized.replace(/-/g, ''));

  // Add original (in case it's actually correct)
  variations.add(term.toLowerCase().trim());

  // Remove empty strings and filter
  return Array.from(variations).filter(v => v && v.length >= 3);
}

/**
 * Find likely positions to split a compound word
 * Example: "waterpump" -> likely split at "water|pump"
 */
function findLikelySplitPositions(word) {
  const positions = [];
  const commonPrefixes = ['water', 'oil', 'air', 'fuel', 'brake', 'shock', 'spark'];
  const commonSuffixes = ['pump', 'filter', 'pad', 'disc', 'belt', 'plug', 'absorber'];

  // Check for common prefixes
  for (const prefix of commonPrefixes) {
    if (word.startsWith(prefix) && word.length > prefix.length) {
      positions.push(prefix.length);
    }
  }

  // Check for common suffixes
  for (const suffix of commonSuffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length) {
      positions.push(word.length - suffix.length);
    }
  }

  return positions;
}

/**
 * Extract product context from query
 * Returns: { partNumber, productName, vehicleMake, vehicleModel, category }
 */
function extractProductContext(query) {
  const context = {
    partNumber: null,
    productName: null,
    vehicleMake: null,
    vehicleModel: null,
    category: null,
  };

  const lowerQuery = query.toLowerCase();

  // 1. Extract part number (highest priority)
  context.partNumber = detectPartNumber(query);

  // 2. Extract vehicle make and model
  const vehicles = [
    'toyota', 'nissan', 'honda', 'mazda', 'subaru', 'mitsubishi',
    'isuzu', 'suzuki', 'volkswagen', 'vw', 'mercedes', 'bmw', 'audi',
    'land rover', 'range rover', 'peugeot', 'renault', 'ford',
  ];

  for (const vehicle of vehicles) {
    if (lowerQuery.includes(vehicle)) {
      context.vehicleMake = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

      // Try to extract model (word after vehicle name)
      const modelMatch = lowerQuery.match(new RegExp(`${vehicle}\\s+([a-z0-9]+)`, 'i'));
      if (modelMatch && modelMatch[1]) {
        context.vehicleModel = modelMatch[1].charAt(0).toUpperCase() + modelMatch[1].slice(1);
      }
      break;
    }
  }

  // 3. Detect automotive part
  const detectedPart = detectAutomotivePart(query);
  if (detectedPart) {
    context.productName = detectedPart;
    context.category = detectedPart.split(' ')[0]; // First word as category hint
  } else {
    // Fallback: use normalized query
    context.productName = normalizeSearchTerm(query);
  }

  return context;
}

/**
 * Check if query is definitely a product query
 * Independent of keywords like "price" or "how much"
 */
function isProductQuery(query) {
  // Check 1: Contains part number
  if (detectPartNumber(query)) return true;

  // Check 2: Contains known automotive part
  if (detectAutomotivePart(query)) return true;

  // Check 3: Contains product-related keywords
  const productKeywords = [
    'how much', 'bei', 'price', 'cost', 'selling',
    'do we have', 'do you have', 'available', 'stock',
    'fit', 'fits', 'compatible', 'for',
    'una', 'kuna', 'tunacho',
  ];

  const lowerQuery = query.toLowerCase();
  if (productKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return true;
  }

  // Check 4: Very short query that looks like product name
  const normalized = normalizeSearchTerm(query);
  if (normalized.length >= 4 && normalized.split(' ').length <= 3) {
    // Could be a product name (not a full sentence)
    return true;
  }

  return false;
}

module.exports = {
  detectPartNumber,
  detectAutomotivePart,
  normalizeSearchTerm,
  generateSearchVariations,
  extractProductContext,
  isProductQuery,
  AUTOMOTIVE_PARTS,
  MISSPELLINGS,
};
