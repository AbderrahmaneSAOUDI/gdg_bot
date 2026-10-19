/**
 * Utility functions for sanitizing folder and file names.
 * Ensures compatibility across Linux, macOS, and Windows filesystems.
 */

/**
 * Sanitizes a string for use as a folder or file name.
 * Strips invalid filesystem characters, collapses duplicate whitespace/dashes,
 * and handles empty or whitespace-only inputs.
 *
 * @param {string} input - The raw channel or category name
 * @param {string} [fallback='unnamed'] - Fallback name if input is invalid
 * @returns {string} Sanitized filesystem-safe name
 */
export function sanitizeName(input, fallback = 'unnamed') {
  if (!input || typeof input !== 'string') {
    return fallback;
  }

  // Replace illegal filesystem characters: / \ ? * : | " < > and control codes
  let clean = input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    // Remove emojis or special symbols if needed, or normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading/trailing dots and spaces (problematic on Windows/Linux)
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');

  // Limit length to 100 characters to prevent path length overflow
  if (clean.length > 100) {
    clean = clean.substring(0, 100).trim();
  }

  return clean || fallback;
}
