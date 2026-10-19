import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
  createPreviousButton,
  createNextButton,
} from './components/c_buttons.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { getEventById } from '../data/json_events.js';
import {
  formatUserName,
  formatRoleName,
  formatChannelName,
  formatGuildName,
} from '../utils/index.js';

/**
 * Builds the payload for the Teams list of a specific event.
 * Displays each team individually with Next/Previous pagination and names listed one per line.
 *
 * @param {string} eventId
 * @param {import('discord.js').Guild} [guild]
 * @param {number} [page=1] - 1-indexed page (team index)
 */
export function getTeamsPayload(eventId, guild = null, page = 1) {
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
  const serverName = formatGuildName(guild);

  // When no teams are registered yet
  if (teams.length === 0) {
    const embed = createStandardEmbed({
      title: EVENT_MESSAGES.FORMAT_TEAMS_TITLE(event.name),
      description: `Server: **${serverName}**\n${EVENT_MESSAGES.NO_TEAMS_AVAILABLE}\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`,
      color: GOOGLE_COLORS.BLUE,
      footerText: `${serverName} • ${EVENT_MESSAGES.FOOTER}`,
    });

    const addTeamBtn = createAddTeamButton({
      customId: buildCustomId(NAMESPACES.TEAM, 'add', event.id),
    });

    const backBtn = createBackButton({
      customId: buildCustomId(NAMESPACES.EVENT, 'detail', event.id),
      label: BUTTON_LABELS.BACK_TO_EVENT,
    });

    return {
      embeds: [embed],
      components: createActionRows(addTeamBtn, backBtn),
    };
  }

  // Next / Previous pagination: Show one team per page
  const totalPages = teams.length;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const currentTeam = teams[currentPage - 1];

  const paddedNum = String(currentTeam.number || currentPage).padStart(2, '0');
  const defaultMemberRoleName = `${event.name} - Team ${paddedNum} - Member`;
  const defaultMentorRoleName = `${event.name} - Team ${paddedNum} - Mentor`;
  const memberRoleName = formatRoleName(guild, currentTeam.memberRoleId, defaultMemberRoleName);
  const mentorRoleName = formatRoleName(guild, currentTeam.mentorRoleId, defaultMentorRoleName);

  // Format mentors: one name per line
  const mentorsList =
    currentTeam.mentors && currentTeam.mentors.length > 0
      ? currentTeam.mentors.map((id) => `• ${formatUserName(guild, id)}`).join('\n')
      : '• *None assigned*';

  // Format members: one name per line
  const membersList =
    currentTeam.members && currentTeam.members.length > 0
      ? currentTeam.members.map((id) => `• ${formatUserName(guild, id)}`).join('\n')
      : '• *None assigned*';

  // Format roles
  const rolesText = `• Mentor: \`${mentorRoleName}\`\n• Member: \`${memberRoleName}\``;

  // Format channels: one per line if present
  let channelsList = '';
  if (currentTeam.channels && Object.keys(currentTeam.channels).length > 0) {
    channelsList = Object.entries(currentTeam.channels)
      .map(([key, chId]) => `• ${formatChannelName(guild, chId, `ex3・${currentTeam.number || currentPage}・${key}`)}`)
      .join('\n');
  }

  const embed = createStandardEmbed({
    title: `${EMOJIS.TEAM} ${currentTeam.name} — ${event.name}`,
    description: `Server: **${serverName}**\nShowing team **${currentPage} of ${totalPages}** for **${event.name}**.\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`,
    color: GOOGLE_COLORS.BLUE,
    footerText: `${serverName} • Team ${currentPage}/${totalPages} • ${EVENT_MESSAGES.FOOTER}`,
  });

  embed.addFields([
    {
      name: `${EMOJIS.MENTOR} Mentors (${currentTeam.mentors?.length || 0})`,
      value: mentorsList,
      inline: false,
    },
    {
      name: `${EMOJIS.PROFILE} Members (${currentTeam.members?.length || 0})`,
      value: membersList,
      inline: false,
    },
    {
      name: `${EMOJIS.PIN} Roles`,
      value: rolesText,
      inline: false,
    },
  ]);

  if (channelsList) {
    embed.addFields([
      {
        name: `💬 Channels`,
        value: channelsList,
        inline: false,
      },
    ]);
  }

  // Row 1: Pagination Controls (Previous / Current Indicator / Next)
  const prevBtn = createPreviousButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'page', event.id, currentPage - 1),
    disabled: currentPage <= 1,
  });

  const indicatorBtn = new ButtonBuilder()
    .setCustomId(buildCustomId(NAMESPACES.TEAM, 'indicator', event.id, currentPage))
    .setLabel(`Team ${currentPage} of ${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = createNextButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'page', event.id, currentPage + 1),
    disabled: currentPage >= totalPages,
  });

  const paginationRow = new ActionRowBuilder().addComponents(prevBtn, indicatorBtn, nextBtn);

  // Row 2: Team Action Controls (Assign Members, Assign Mentors, Delete Team)
  const assignMembersBtn = createAssignMembersButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'assign_members', event.id, currentTeam.id),
  });

  const assignMentorsBtn = createAssignMentorsButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'assign_mentors', event.id, currentTeam.id),
  });

  const deleteTeamBtn = createDeleteTeamButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'delete_menu', event.id, currentTeam.id),
  });

  const teamActionRow = new ActionRowBuilder().addComponents(
    assignMembersBtn,
    assignMentorsBtn,
    deleteTeamBtn
  );

  // Row 3: Directory Controls (Add Team, Back to Event)
  const addTeamBtn = createAddTeamButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'add', event.id),
  });

  const backBtn = createBackButton({
    customId: buildCustomId(NAMESPACES.EVENT, 'detail', event.id),
    label: BUTTON_LABELS.BACK_TO_EVENT,
  });

  const navRow = new ActionRowBuilder().addComponents(addTeamBtn, backBtn);

  return {
    embeds: [embed],
    components: [paginationRow, teamActionRow, navRow],
  };
}
