/**
 * Official Google & GDG Brand Colors and Semantic Status Color Tokens.
 * GDG Ghardaia bot UI exclusively uses these colors for general UI.
 */

// Google Brand Colors (Hex numbers for Discord.js Embeds)
export const GOOGLE_COLORS = Object.freeze({
  BLUE: 0x4285f4,
  RED: 0xea4335,
  YELLOW: 0xffd427,
  GREEN: 0x34a853,
  DARK: 0x1e1e1e,
  GREY: 0x5f6368,
  LIGHT_GREY: 0xf0f0f0,
});

// Hex String Representations (e.g. for CSS or external APIs)
export const GOOGLE_HEX_COLORS = Object.freeze({
  BLUE: '#4285F4',
  RED: '#EA4335',
  YELLOW: '#FFD427',
  GREEN: '#34A853',
  DARK: '#1E1E1E',
  GREY: '#5F6368',
  LIGHT_GREY: '#F0F0F0',
});

// Semantic Status Colors mapped to Google Brand Palette
export const STATUS_COLORS = Object.freeze({
  SUCCESS: GOOGLE_COLORS.GREEN,
  ERROR: GOOGLE_COLORS.RED,
  DANGER: GOOGLE_COLORS.RED,
  WARNING: GOOGLE_COLORS.YELLOW,
  INFO: GOOGLE_COLORS.BLUE,
  NEUTRAL: GOOGLE_COLORS.DARK,
});

/**
 * Resolves a color to a numeric integer compatible with Discord.js EmbedBuilder.
 * Accepts hex string (e.g. '#4285F4', '4285F4'), number, or defaults to GOOGLE_COLORS.BLUE.
 *
 * @param {string|number} [colorInput]
 * @param {number} [fallbackColor=GOOGLE_COLORS.BLUE]
 * @returns {number}
 */
export function resolveColor(colorInput, fallbackColor = GOOGLE_COLORS.BLUE) {
  if (typeof colorInput === 'number' && !Number.isNaN(colorInput)) {
    return colorInput;
  }

  if (typeof colorInput === 'string') {
    const cleaned = colorInput.replace(/^#/, '').trim();
    const parsed = parseInt(cleaned, 16);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallbackColor;
}
