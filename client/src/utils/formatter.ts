// ============================================
// CURRENCY & NUMBER FORMATTING UTILITIES
// ============================================

/**
 * Format number as Kenyan Shillings (KES)
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string (e.g., "KES 25,000.00")
 */
export const formatKES = (amount: number, showDecimals: boolean = true): string => {
  const formatted = amount.toLocaleString('en-KE', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return `KES ${formatted}`;
};

/**
 * Format number with thousand separators
 * @param num - The number to format
 * @returns Formatted number string (e.g., "1,234")
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-KE');
};

/**
 * Shorten large numbers (e.g., 1500 -> "1.5K", 1000000 -> "1M")
 * @param num - The number to shorten
 * @returns Shortened number string
 */
export const shortenNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};
