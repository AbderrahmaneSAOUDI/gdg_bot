import { PermissionFlagsBits } from 'discord.js';
import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import { BUTTON_LABELS } from '../config/cfg_labels.js';
import { CUSTOM_IDS } from '../config/cfg_customIds.js';
import {
  createKnowledgeButton,
  createProfileButton,
  createBackButton,
  createEventsButton,
  createExtractButton,
} from './components/c_buttons.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { KNOWLEDGE_MESSAGES } from '../messages/msg_knowledge.js';
import { CLUB_MESSAGES } from '../messages/msg_club.js';
import { CLUB_LABELS } from '../config/cfg_club.js';
import { clubButton, clubText, clubPayload } from './components/c_club.js';
import { getClubProfilePayload } from './view_club.js';

// Backward-compatible alias for existing code
export const BRAND_COLORS = GOOGLE_COLORS;

/**
 * Builds the public feature row and capability-dependent private management controls.
 *
 * @param {object|boolean} [capabilities={}]
 * @param {boolean} [isAdmin=false]
 */
export function createHubActionRows(capabilities = {}, isAdmin = false) {
  // Preserve the older Boolean entry point for existing supported consumers.
  if (typeof capabilities === 'boolean') {
    isAdmin = capabilities;
    capabilities = {};
  }
  const eventsButton = createEventsButton();
  const knowledgeButton = createKnowledgeButton();
  const profileButton = createProfileButton();
  const buttons = [eventsButton,
    clubButton('members', CLUB_LABELS.MEMBERS, [0, 'ALL', 'ALL', '0'], 'primary'),
    clubButton('departments', CLUB_LABELS.DEPARTMENTS, [], 'primary'),
    knowledgeButton, profileButton];

  if (isAdmin || capabilities.approvalReview || capabilities.clubManage || capabilities.managedDepartments?.size > 0) buttons.push(clubButton('approvals', CLUB_LABELS.APPROVALS, [0, 'PENDING', 'ALL']));
  if (isAdmin || capabilities.clubManage || capabilities.memberManage) buttons.push(clubButton('overview', CLUB_LABELS.OVERVIEW));
  if (isAdmin || capabilities.setupManage) buttons.push(clubButton('setup', CLUB_LABELS.SETUP, [0]));

  if (isAdmin) {
    buttons.push(createExtractButton());
  }

  return createActionRows(...buttons);
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
export function getHubPayload(user, member, capabilities = {}) {
  const displayName = member?.displayName || user?.displayName || user?.username || CLUB_MESSAGES.MEMBER;
  const isAdmin = Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );

  const description = CLUB_MESSAGES.HUB_DESCRIPTION(clubText(displayName, 100));

  const embed = createStandardEmbed({
    title: CLUB_MESSAGES.HUB_TITLE,
    description,
    color: GOOGLE_COLORS.BLUE,
    thumbnail: user?.displayAvatarURL?.({ dynamic: true, size: 128 }),
    footerText: CLUB_MESSAGES.FOOTER,
    footerIconUrl: member?.guild?.iconURL?.({ dynamic: true }) || undefined,
  });

  return {
    embeds: [embed],
    components: createHubActionRows(capabilities, isAdmin),
    allowedMentions: { parse: [] },
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
  const roles = member?.roles?.cache;
  const discordRoles = roles?.values ? Array.from(roles.values()).filter((role) => role.id !== member.guild?.id).map((role) => role.name) : [];
  return getClubProfilePayload({ user, member, discordRoles });
}

/**
 * Formats the Public Persistent Hub payload deployed to a dedicated channel.
 */
export function getPersistentHubPayload() {
  return clubPayload({ title: CLUB_MESSAGES.HUB_TITLE, description: CLUB_MESSAGES.PUBLIC_DESCRIPTION,
    components: createHubActionRows(),
  });
}

