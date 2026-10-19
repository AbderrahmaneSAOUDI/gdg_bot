import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import { BUTTON_LABELS } from '../config/cfg_labels.js';
import { NAMESPACES, buildCustomId } from '../config/cfg_customIds.js';
import {
  createBackButton,
  createAssignMentorsButton,
} from './components/c_buttons.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { getEventById } from '../data/json_events.js';
import { formatUserName, formatGuildName } from '../utils/index.js';

/**
 * Builds the payload for the Mentors Roster of an event.
 * Resolves mentors to human-readable names.
 *
 * @param {string} eventId
 * @param {import('discord.js').Guild} [guild]
 */
export function getMentorsPayload(eventId, guild = null) {
  const event = getEventById(eventId);
  if (!event) {
    const errorEmbed = createStandardEmbed({
      title: 'Event Not Found',
      description: `Could not find an event with ID \`${eventId}\`.`,
      color: GOOGLE_COLORS.RED,
    });
    return { embeds: [errorEmbed], components: [] };
  }

  const serverName = formatGuildName(guild);

  // Aggregate mentors and their team assignments
  const mentorMap = new Map(); // mentorId -> array of team names
  for (const team of event.teams || []) {
    for (const mentorId of team.mentors || []) {
      if (!mentorMap.has(mentorId)) {
        mentorMap.set(mentorId, []);
      }
      mentorMap.get(mentorId).push(team.name);
    }
  }

  const embed = createStandardEmbed({
    title: EVENT_MESSAGES.FORMAT_MENTORS_TITLE(event.name),
    description:
      mentorMap.size > 0
        ? `Server: **${serverName}**\nDedicated mentors guiding teams during **${event.name}**.\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`
        : `Server: **${serverName}**\n${EVENT_MESSAGES.NO_MENTORS_ASSIGNED}\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`,
    color: GOOGLE_COLORS.YELLOW,
    footerText: `${serverName} • ${EVENT_MESSAGES.FOOTER}`,
  });

  if (mentorMap.size > 0) {
    embed.addFields(
      Array.from(mentorMap.entries()).map(([mentorId, teamNames]) => {
        const mentorName = formatUserName(guild, mentorId);
        return {
          name: `${EMOJIS.MENTOR} ${mentorName}`,
          value: `• Guiding: **${teamNames.join(', ')}**\n• Status: \`Active Mentor\``,
          inline: true,
        };
      })
    );
  }

  const assignMentorsBtn = createAssignMentorsButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'assign_mentors', event.id),
    disabled: !event.teams || event.teams.length === 0,
  });

  const backBtn = createBackButton({
    customId: buildCustomId(NAMESPACES.EVENT, 'detail', event.id),
    label: BUTTON_LABELS.BACK_TO_EVENT,
  });

  return {
    embeds: [embed],
    components: createActionRows(assignMentorsBtn, backBtn),
  };
}
