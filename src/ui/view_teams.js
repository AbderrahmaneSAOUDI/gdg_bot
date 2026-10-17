import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import { BUTTON_LABELS } from '../config/cfg_labels.js';
import { NAMESPACES, buildCustomId } from '../config/cfg_customIds.js';
import {
  createBackButton,
  createAddTeamButton,
  createAssignMembersButton,
  createAssignMentorsButton,
  createDeleteTeamButton,
} from './components/c_buttons.js';
import { createOptionSelectMenu } from './components/c_selectMenus.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { getEventById } from '../data/json_events.js';

/**
 * Builds the payload for the Teams list of a specific event.
 * Displays members, mentors, roles, and CRUD action buttons.
 */
export function getTeamsPayload(eventId) {
  const event = getEventById(eventId);
  if (!event) {
    const errorEmbed = createStandardEmbed({
      title: 'Event Not Found',
      description: `Could not find an event with ID \`${eventId}\`.`,
      color: GOOGLE_COLORS.RED,
    });
    return { embeds: [errorEmbed], components: [] };
  }

  const teams = event.teams || [];

  const embed = createStandardEmbed({
    title: EVENT_MESSAGES.FORMAT_TEAMS_TITLE(event.name),
    description:
      teams.length > 0
        ? `Registered teams and member allocations for **${event.name}**.\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`
        : `${EVENT_MESSAGES.NO_TEAMS_AVAILABLE}\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`,
    color: GOOGLE_COLORS.BLUE,
    footerText: EVENT_MESSAGES.FOOTER,
  });

  if (teams.length > 0) {
    embed.addFields(
      teams.map((t) => {
        const mentorsText =
          t.mentors && t.mentors.length > 0
            ? t.mentors.map((id) => `<@${id}>`).join(', ')
            : '*None assigned*';
        const membersText =
          t.members && t.members.length > 0
            ? t.members.map((id) => `<@${id}>`).join(', ')
            : '*None assigned*';
        const paddedNum = String(t.number || 1).padStart(2, '0');
        const memberRoleName = `${event.name} - Team ${paddedNum} - Member`;
        const mentorRoleName = `${event.name} - Team ${paddedNum} - Mentor`;

        return {
          name: `${EMOJIS.GDG} ${t.name} (${t.category || 'General'})`,
          value:
            `• ${EMOJIS.MENTOR} **Mentors**: ${mentorsText}\n` +
            `• ${EMOJIS.PROFILE} **Members**: ${membersText}\n` +
            `• ${EMOJIS.PIN} **Roles**: \`${mentorRoleName}\` • \`${memberRoleName}\``,
          inline: false,
        };
      })
    );
  }

  const components = [];

  // Action Buttons: Add Team, Assign Members, Assign Mentors
  const addTeamBtn = createAddTeamButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'add', event.id),
  });

  const assignMembersBtn = createAssignMembersButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'assign_members', event.id),
    disabled: teams.length === 0,
  });

  const assignMentorsBtn = createAssignMentorsButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'assign_mentors', event.id),
    disabled: teams.length === 0,
  });

  const deleteTeamBtn = createDeleteTeamButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'delete_menu', event.id),
    disabled: teams.length === 0,
  });

  const backBtn = createBackButton({
    customId: buildCustomId(NAMESPACES.EVENT, 'detail', event.id),
    label: BUTTON_LABELS.BACK_TO_EVENT,
  });

  components.push(
    ...createActionRows(
      addTeamBtn,
      assignMembersBtn,
      assignMentorsBtn,
      deleteTeamBtn,
      backBtn
    )
  );

  return {
    embeds: [embed],
    components,
  };
}
