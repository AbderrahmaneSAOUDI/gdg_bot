import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import { BUTTON_LABELS } from '../config/cfg_labels.js';
import { CUSTOM_IDS, NAMESPACES, buildCustomId } from '../config/cfg_customIds.js';
import {
  createBackButton,
  createTeamsButton,
  createMentorsButton,
} from './components/c_buttons.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { getEventById } from '../data/json_events.js';
import { formatGuildName } from '../utils/index.js';

/**
 * Builds the payload for a single Event's Dashboard.
 * Presents the key [Teams] and [Mentors] buttons requested by user.
 *
 * @param {string} eventId
 * @param {import('discord.js').Guild} [guild]
 */
export function getEventDetailPayload(eventId, guild = null) {
  const event = getEventById(eventId);
  if (!event) {
    const errorEmbed = createStandardEmbed({
      title: 'Event Not Found',
      description: `Could not find an event with ID \`${eventId}\`.`,
      color: GOOGLE_COLORS.RED,
    });
    return {
      embeds: [errorEmbed],
      components: createActionRows(
        createBackButton({
          customId: CUSTOM_IDS.HUB_EVENTS,
          label: 'Back to Events',
        })
      ),
    };
  }

  const serverName = formatGuildName(guild);
  const teamsCount = event.teams?.length || 0;
  const totalMembers = event.teams?.reduce((acc, t) => acc + (t.members?.length || 0), 0) || 0;
  const totalMentors = event.teams?.reduce((acc, t) => acc + (t.mentors?.length || 0), 0) || 0;

  const embed = createStandardEmbed({
    title: EVENT_MESSAGES.FORMAT_EVENT_TITLE(event.name),
    description: `Server: **${serverName}**\n${event.description || 'Competition & team hub.'}\n\n${EVENT_MESSAGES.CORE_VIEW_ONLY_NOTICE}`,
    color: GOOGLE_COLORS.BLUE,
    fields: [
      {
        name: `${EMOJIS.TEAM} Teams Registered`,
        value: `**${teamsCount}** Active Teams`,
        inline: true,
      },
      {
        name: `${EMOJIS.PROFILE} Enrolled Members`,
        value: `**${totalMembers}** Participants`,
        inline: true,
      },
      {
        name: `${EMOJIS.MENTOR} Active Mentors`,
        value: `**${totalMentors}** Dedicated Mentors`,
        inline: true,
      },
    ],
    footerText: `${serverName} • ${EVENT_MESSAGES.FOOTER}`,
  });

  const teamsBtn = createTeamsButton({
    customId: buildCustomId(NAMESPACES.TEAM, 'view', event.id),
    label: `${BUTTON_LABELS.TEAMS} (${teamsCount})`,
    emoji: EMOJIS.TEAM,
  });

  const mentorsBtn = createMentorsButton({
    customId: buildCustomId(NAMESPACES.MENTOR, 'view', event.id),
    label: `${BUTTON_LABELS.MENTORS} (${totalMentors})`,
    emoji: EMOJIS.MENTOR,
  });

  const backBtn = createBackButton({
    customId: CUSTOM_IDS.HUB_EVENTS,
    label: 'Back to Events',
  });

  return {
    embeds: [embed],
    components: createActionRows(teamsBtn, mentorsBtn, backBtn),
  };
}
