/**
 * Discord Custom ID Conventions & Utilities.
 * Standard format:
 *   bot:<namespace>:<action>[:<param1>[:<param2>...]]
 *
 * Examples:
 *   bot:nav:back
 *   bot:nav:home
 *   bot:nav:close
 *   bot:confirm:yes:<actionId>
 *   bot:confirm:no:<actionId>
 *   bot:page:<entity>:<pageNumber>
 *   bot:hub:team
 */

export const CUSTOM_ID_PREFIX = 'bot';

export const NAMESPACES = Object.freeze({
  NAV: 'nav',
  COMMON: 'common',
  CONFIRM: 'confirm',
  PAGE: 'page',
  HUB: 'hub',
  TEAM: 'team',
  MEETING: 'meeting',
  ACTIVITY: 'activity',
  REQUEST: 'request',
  PROFILE: 'profile',
  MODAL: 'modal',
});

/**
 * Builds a standardized custom ID.
 *
 * @param {string} namespace - Logical namespace (e.g. 'nav', 'confirm')
 * @param {string} action - Action verb or screen (e.g. 'back', 'view')
 * @param {...(string|number)} params - Optional parameters
 * @returns {string}
 */
export function buildCustomId(namespace, action, ...params) {
  if (!namespace || !action) {
    throw new Error('Namespace and action are required to build a customId');
  }
  const parts = [CUSTOM_ID_PREFIX, namespace, action, ...params.filter((p) => p !== undefined && p !== null)];
  return parts.join(':');
}

/**
 * Parses a custom ID string into its constituent parts.
 *
 * @param {string} customId
 * @returns {{ prefix: string, namespace: string, action: string, params: string[], isBotCustomId: boolean }}
 */
export function parseCustomId(customId) {
  if (!customId || typeof customId !== 'string') {
    return {
      prefix: '',
      namespace: '',
      action: '',
      params: [],
      isBotCustomId: false,
    };
  }

  const parts = customId.split(':');
  let prefix = parts[0] || '';
  let namespace = parts[1] || '';
  let action = parts[2] || '';
  let params = parts.slice(3);

  // Handle legacy 2-part format e.g. 'hub:knowledge'
  if (parts.length === 2 && prefix === 'hub') {
    action = namespace;
    namespace = 'hub';
    prefix = CUSTOM_ID_PREFIX;
    params = [];
  }

  const isBotCustomId = prefix === CUSTOM_ID_PREFIX || parts[0] === 'hub';

  return {
    prefix,
    namespace,
    action,
    params,
    isBotCustomId,
  };
}

/**
 * Common pre-defined custom IDs.
 */
export const CUSTOM_IDS = Object.freeze({
  NAV_BACK: buildCustomId(NAMESPACES.NAV, 'back'),
  NAV_HOME: buildCustomId(NAMESPACES.NAV, 'home'),
  NAV_CLOSE: buildCustomId(NAMESPACES.NAV, 'close'),
  NAV_REFRESH: buildCustomId(NAMESPACES.NAV, 'refresh'),

  CONFIRM_YES: buildCustomId(NAMESPACES.CONFIRM, 'yes'),
  CONFIRM_NO: buildCustomId(NAMESPACES.CONFIRM, 'no'),

  PAGE_PREV: buildCustomId(NAMESPACES.PAGE, 'prev'),
  PAGE_NEXT: buildCustomId(NAMESPACES.PAGE, 'next'),

  HUB_MAIN: buildCustomId(NAMESPACES.HUB, 'main'),
  HUB_KNOWLEDGE: buildCustomId(NAMESPACES.HUB, 'knowledge'),
  HUB_PROFILE: buildCustomId(NAMESPACES.HUB, 'profile'),
});
