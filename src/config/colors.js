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
  PURPLE: 0xa142f4,
  BROWN: 0xa84300,
  DARK: 0x1e1e1e,
  GREY: 0x5f6368,
  LIGHT_GREY: 0xf0f0f0,
  BOT_BLACK: 0x000001,
});

// Hex String Representations (e.g. for CSS or external APIs)
export const GOOGLE_HEX_COLORS = Object.freeze({
  BLUE: '#4285F4',
  RED: '#EA4335',
  YELLOW: '#FFD427',
  GREEN: '#34A853',
  PURPLE: '#A142F4',
  BROWN: '#A84300',
  DARK: '#1E1E1E',
  GREY: '#5F6368',
  LIGHT_GREY: '#F0F0F0',
  BOT_BLACK: '#000001',
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

// Official GDG Ghardaia Department Colors (Hex numbers for Discord.js Embeds)
// Sorted canonically: Relations, Logistics, Media, Design, Dev
export const DEPARTMENT_COLORS = Object.freeze({
  RELATIONS: GOOGLE_COLORS.YELLOW,     // 0xffd427 (Yellow)
  LOGISTICS: GOOGLE_COLORS.BROWN,      // 0xa84300 (Brown)
  MEDIA: GOOGLE_COLORS.BLUE,           // 0x4285f4 (Blue)
  DESIGN: GOOGLE_COLORS.GREEN,         // 0x34a853 (Green)
  DEV: GOOGLE_COLORS.PURPLE,           // 0xa142f4 (Purple)
  DEVELOPMENT: GOOGLE_COLORS.PURPLE,   // Alias
});

// Official GDG Ghardaia Department Colors (Hex Strings)
export const DEPARTMENT_HEX_COLORS = Object.freeze({
  RELATIONS: GOOGLE_HEX_COLORS.YELLOW,     // '#FFD427' (Yellow)
  LOGISTICS: GOOGLE_HEX_COLORS.BROWN,      // '#A84300' (Brown)
  MEDIA: GOOGLE_HEX_COLORS.BLUE,           // '#4285F4' (Blue)
  DESIGN: GOOGLE_HEX_COLORS.GREEN,         // '#34A853' (Green)
  DEV: GOOGLE_HEX_COLORS.PURPLE,           // '#A142F4' (Purple)
  DEVELOPMENT: GOOGLE_HEX_COLORS.PURPLE,   // Alias
});

// Role Colors (Hex numbers for Discord.js Embeds)
export const ROLE_COLORS = Object.freeze({
  CORE_TEAM: GOOGLE_COLORS.RED,             // 0xea4335 (President, VP, SG, HR)
  MEMBER: GOOGLE_COLORS.GREY,              // 0x5f6368 (General members)
  ALUMNI: GOOGLE_COLORS.GREY,              // 0x5f6368 (Old members)
  BOT: GOOGLE_COLORS.BOT_BLACK,            // 0x000001 (Bots and apps)
});

// Role Colors (Hex Strings)
export const ROLE_HEX_COLORS = Object.freeze({
  CORE_TEAM: GOOGLE_HEX_COLORS.RED,             // '#EA4335'
  MEMBER: GOOGLE_HEX_COLORS.GREY,              // '#5F6368'
  ALUMNI: GOOGLE_HEX_COLORS.GREY,              // '#5F6368'
  BOT: GOOGLE_HEX_COLORS.BOT_BLACK,            // '#000001'
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
