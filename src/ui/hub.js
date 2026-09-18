import { GOOGLE_COLORS } from '../config/colors.js';
import { EMOJIS } from '../config/emojis.js';
import { BUTTON_LABELS, COMMON_TITLES } from '../config/labels.js';
import { CUSTOM_IDS } from '../config/customIds.js';
import {
  createKnowledgeButton,
  createProfileButton,
  createBackButton,
  createPrimaryButton,
} from './components/buttons.js';
import { createActionRows } from './components/actionRows.js';
import {
  createStandardEmbed,
  createProfileEmbed,
} from './embeds/embedBuilder.js';
import { DASHBOARD_MESSAGES } from '../messages/dashboard.js';
import { KNOWLEDGE_MESSAGES } from '../messages/knowledge.js';

// Backward-compatible alias for existing code
export const BRAND_COLORS = GOOGLE_COLORS;

/**
 * Creates the navigation button row for the Main Team Hub.
 * Shows strictly [📚 Knowledge] and [👤 My Profile].
 */
export function createHubActionRows() {
  const knowledgeButton = createKnowledgeButton();
  const profileButton = createProfileButton();

  return createActionRows(knowledgeButton, profileButton);
}

/**
 * Creates a standard back navigation row for sub-views.
 */
export function createBackActionRow(extraButtons = []) {
  const backButton = createBackButton({
    customId: CUSTOM_IDS.HUB_MAIN,
    label: BUTTON_LABELS.BACK_TO_HUB,
    emoji: EMOJIS.BACK,
  });

  return createActionRows(backButton, ...extraButtons);
}

/**
 * Formats the Main Dashboard view payload.
 */
export function getHubPayload(user, member) {
  const displayName = member?.displayName || user.displayName || user.username;

  const description = DASHBOARD_MESSAGES.FORMAT_HUB_DESCRIPTION(displayName);

  const embed = createStandardEmbed({
    title: DASHBOARD_MESSAGES.HUB_TITLE,
    description,
    color: GOOGLE_COLORS.BLUE,
    thumbnail: user.displayAvatarURL({ dynamic: true, size: 128 }),
    footerText: `${COMMON_TITLES.BOT_NAME} • ${DASHBOARD_MESSAGES.HUB_TAGLINE}`,
    footerIconUrl: member?.guild?.iconURL({ dynamic: true }) || undefined,
  });

  return {
    embeds: [embed],
    components: createHubActionRows(),
  };
}

/**
 * Formats the Knowledge view payload.
 */
export function getKnowledgePayload(user, member) {
  const embed = createStandardEmbed({
    title: `${EMOJIS.RESOURCE} ${KNOWLEDGE_MESSAGES.TITLE}`,
    description: KNOWLEDGE_MESSAGES.DESCRIPTION,
    color: GOOGLE_COLORS.BLUE,
    footerText: KNOWLEDGE_MESSAGES.FOOTER,
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Profile view payload.
 */
export function getProfilePayload(user, member) {
  const embed = createProfileEmbed({
    user,
    member,
    color: GOOGLE_COLORS.BLUE,
    footerText: `${COMMON_TITLES.BOT_NAME} • ${COMMON_TITLES.PROFILE}`,
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Public Persistent Hub payload deployed to a dedicated channel.
 */
export function getPersistentHubPayload() {
  const embed = createStandardEmbed({
    title: DASHBOARD_MESSAGES.PERSISTENT_HUB_TITLE,
    description: DASHBOARD_MESSAGES.PERSISTENT_DESCRIPTION,
    color: GOOGLE_COLORS.BLUE,
    fields: [
      {
        name: `${EMOJIS.RESOURCE} ${BUTTON_LABELS.KNOWLEDGE}`,
        value: DASHBOARD_MESSAGES.SECTIONS.KNOWLEDGE,
        inline: true,
      },
      {
        name: `${EMOJIS.PROFILE} ${BUTTON_LABELS.PROFILE}`,
        value: DASHBOARD_MESSAGES.SECTIONS.PROFILE,
        inline: true,
      },
    ],
    footerText: DASHBOARD_MESSAGES.PERSISTENT_FOOTER,
  });

  const openHubButton = createPrimaryButton({
    customId: CUSTOM_IDS.HUB_MAIN,
    label: BUTTON_LABELS.OPEN_HUB,
    emoji: EMOJIS.DASHBOARD,
  });
  const knowledgeButton = createKnowledgeButton();
  const profileButton = createProfileButton();

  return {
    embeds: [embed],
    components: createActionRows(openHubButton, knowledgeButton, profileButton),
  };
}
