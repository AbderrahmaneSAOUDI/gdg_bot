import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import { BUTTON_LABELS } from '../config/cfg_labels.js';
import { CUSTOM_IDS, NAMESPACES, buildCustomId } from '../config/cfg_customIds.js';
import {
  createBackButton,
  createAddEventButton,
  createPrimaryButton,
} from './components/c_buttons.js';
import { createOptionSelectMenu } from './components/c_selectMenus.js';
import { createActionRows } from './components/c_actionRows.js';
import { createStandardEmbed } from './embeds/c_embedBuilder.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { getAllEvents } from '../data/json_events.js';

/**
 * Builds the payload for the Events & Competitions Directory.
 */
export function getEventsPayload() {
  const events = getAllEvents();

  const embed = createStandardEmbed({
    title: EVENT_MESSAGES.DIRECTORY_TITLE,
    description: events.length > 0 ? EVENT_MESSAGES.DIRECTORY_DESCRIPTION : EVENT_MESSAGES.EMPTY_DIRECTORY,
    color: GOOGLE_COLORS.BLUE,
    footerText: EVENT_MESSAGES.FOOTER,
  });

  if (events.length > 0) {
    embed.addFields(
      events.map((evt) => ({
        name: `${EMOJIS.EVENT} ${evt.name}`,
        value: `${evt.description || 'No description provided.'}\n• **Teams**: ${evt.teams?.length || 0} registered\n• **Status**: \`${evt.status}\``,
        inline: false,
      }))
    );
  }

  // Row 1: Event Selector if events exist
  const components = [];
  if (events.length > 0) {
    const eventSelectMenu = createOptionSelectMenu({
      customId: CUSTOM_IDS.EVENT_SELECT,
      placeholder: 'Select a competition or event...',
      options: events.map((evt) => ({
        label: evt.name,
        value: evt.id,
        description: `${evt.teams?.length || 0} teams registered • ${evt.status}`,
        emoji: EMOJIS.EVENT,
      })),
    });
    components.push(eventSelectMenu);
  }

  // Row 2: Add Event & Back to Hub
  const addEventBtn = createAddEventButton();
  const backBtn = createBackButton({
    customId: CUSTOM_IDS.HUB_MAIN,
    label: BUTTON_LABELS.BACK_TO_HUB,
  });

  components.push(...createActionRows(addEventBtn, backBtn));

  return {
    embeds: [embed],
    components,
  };
}
