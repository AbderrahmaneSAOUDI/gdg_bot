import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import { BUTTON_LABELS } from '../config/cfg_labels.js';
import { NAMESPACES, buildCustomId } from '../config/cfg_customIds.js';
import { createBackButton } from './components/c_buttons.js';
import {
  createOptionSelectMenu,
  createMemberSelectMenu,
} from './components/c_selectMenus.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { getEventById } from '../data/json_events.js';

/**
 * Builds the interactive Assignment Screen (Assign Members or Assign Mentors).
 *
 * @param {object} params
 * @param {string} params.eventId
 * @param {'members'|'mentors'} params.type
 * @param {string} [params.selectedTeamId]
 */
export function getAssignPayload({ eventId, type = 'members', selectedTeamId = null }) {
  const event = getEventById(eventId);
  if (!event) {
    const errorEmbed = createStandardEmbed({
      title: 'Event Not Found',
      description: `Could not find event \`${eventId}\`.`,
      color: GOOGLE_COLORS.RED,
    });
    return { embeds: [errorEmbed], components: [] };
  }

  const isMembers = type === 'members';
  const targetTeam = selectedTeamId
    ? event.teams.find((t) => t.id === selectedTeamId)
    : event.teams[0] || null;

  const title = isMembers
    ? EVENT_MESSAGES.ASSIGN_MEMBERS_TITLE
    : EVENT_MESSAGES.ASSIGN_MENTORS_TITLE;

  const description = isMembers
    ? EVENT_MESSAGES.ASSIGN_MEMBERS_DESCRIPTION
    : EVENT_MESSAGES.ASSIGN_MENTORS_DESCRIPTION;

  const embed = createStandardEmbed({
    title,
    description: `${description}\n\n**Current Target Team**: \`${targetTeam?.name || 'None'}\`\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`,
    color: isMembers ? GOOGLE_COLORS.BLUE : GOOGLE_COLORS.YELLOW,
    footerText: EVENT_MESSAGES.FOOTER,
  });

  const elements = [];

  // Row 1: Team Selector (Choose which team to assign to)
  if (event.teams.length > 0) {
    const teamSelectMenu = createOptionSelectMenu({
      customId: buildCustomId(NAMESPACES.TEAM, 'assign_target', event.id, type),
      placeholder: 'Step 1: Choose target team...',
      options: event.teams.map((t) => ({
        label: t.name,
        value: t.id,
        description: `Currently has ${isMembers ? t.members?.length || 0 : t.mentors?.length || 0} ${type}`,
        emoji: EMOJIS.TEAM,
        default: t.id === targetTeam?.id,
      })),
    });
    elements.push(teamSelectMenu);
  }

  // Row 2: Native Discord User Select Menu
  if (targetTeam) {
    const userSelectMenu = createMemberSelectMenu({
      customId: buildCustomId(
        NAMESPACES.TEAM,
        'user_select',
        event.id,
        targetTeam.id,
        type
      ),
      placeholder: `Step 2: Pick ${type} to add to ${targetTeam.name}...`,
      minValues: 1,
      maxValues: 10,
    });
    elements.push(userSelectMenu);
  }

  // Row 3: Back Button
  const backBtn = createBackButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'view', event.id),
    label: BUTTON_LABELS.BACK_TO_EVENT,
  });
  elements.push(backBtn);

  return {
    embeds: [embed],
    components: createActionRows(...elements),
  };
}

/**
 * Builds the Delete Team Picker Screen.
 */
export function getDeleteTeamPayload(eventId) {
  const event = getEventById(eventId);
  if (!event || !event.teams || event.teams.length === 0) {
    return {
      embeds: [
        createStandardEmbed({
          title: 'No Teams to Delete',
          description: 'There are no teams available to delete for this event.',
          color: GOOGLE_COLORS.YELLOW,
        }),
      ],
      components: createActionRows(
        createBackButton({
          customId: buildCustomId(NAMESPACES.TEAM, 'view', eventId),
          label: BUTTON_LABELS.BACK_TO_EVENT,
        })
      ),
    };
  }

  const embed = createStandardEmbed({
    title: `${EMOJIS.DELETE} Delete a Team`,
    description: `Select a team from the list below to permanently remove it and clean up its Member & Mentor Discord roles.`,
    color: GOOGLE_COLORS.RED,
    footerText: EVENT_MESSAGES.FOOTER,
  });

  const deleteSelectMenu = createOptionSelectMenu({
    customId: buildCustomId(NAMESPACES.TEAM, 'delete_confirm', event.id),
    placeholder: 'Select a team to delete...',
    options: event.teams.map((t) => ({
      label: `Delete ${t.name}`,
      value: t.id,
      description: `${t.members?.length || 0} members • ${t.mentors?.length || 0} mentors`,
      emoji: EMOJIS.DELETE,
    })),
  });

  const backBtn = createBackButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'view', event.id),
    label: BUTTON_LABELS.CANCEL,
  });

  return {
    embeds: [embed],
    components: createActionRows(deleteSelectMenu, backBtn),
  };
}

