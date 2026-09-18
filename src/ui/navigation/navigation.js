import { ActionRowBuilder } from 'discord.js';
import { createBackButton, createHomeButton, createCloseButton } from '../components/buttons.js';
import { CUSTOM_IDS } from '../../config/customIds.js';

/**
 * Navigation flow steps invariant:
 * Dashboard -> Section -> Details -> Action -> Confirmation -> Result
 */
export const NAVIGATION_FLOW = Object.freeze([
  'Dashboard',
  'Section',
  'Details',
  'Action',
  'Confirmation',
  'Result',
]);

/**
 * Formats a breadcrumb string for embed headers or descriptions.
 * e.g. "Dashboard › My Team › Tech Squad"
 *
 * @param {string[]} steps - Array of navigation hierarchy titles
 * @param {string} [separator=' › ']
 * @returns {string}
 */
export function formatBreadcrumb(steps = [], separator = ' › ') {
  if (!Array.isArray(steps) || steps.length === 0) return '';
  return steps.filter(Boolean).join(separator);
}

/**
 * Creates a standard navigation ActionRow containing Back, Home, and Close controls.
 *
 * Standard layout: [ ⬅️ Back ] [ 🏠 Home ] [ ✕ Close ] + [ ...extraButtons ]
 *
 * @param {object} params
 * @param {string} [params.backCustomId=CUSTOM_IDS.NAV_BACK] - Custom ID for back button (null/false to omit)
 * @param {string} [params.homeCustomId=CUSTOM_IDS.NAV_HOME] - Custom ID for home button (null/false to omit)
 * @param {string} [params.closeCustomId=CUSTOM_IDS.NAV_CLOSE] - Custom ID for close button (null/false to omit)
 * @param {Array<any>} [params.extraButtons=[]] - Additional contextual action buttons
 * @param {boolean} [params.disabled=false] - Whether buttons are disabled
 * @returns {ActionRowBuilder}
 */
export function createNavigationRow({
  backCustomId = CUSTOM_IDS.NAV_BACK,
  homeCustomId = CUSTOM_IDS.NAV_HOME,
  closeCustomId = CUSTOM_IDS.NAV_CLOSE,
  extraButtons = [],
  disabled = false,
} = {}) {
  const row = new ActionRowBuilder();

  if (backCustomId) {
    row.addComponents(createBackButton({ customId: backCustomId, disabled }));
  }

  if (homeCustomId) {
    row.addComponents(createHomeButton({ customId: homeCustomId, disabled }));
  }

  if (closeCustomId) {
    row.addComponents(createCloseButton({ customId: closeCustomId, disabled }));
  }

  if (Array.isArray(extraButtons) && extraButtons.length > 0) {
    row.addComponents(...extraButtons);
  }

  return row;
}
