import { ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { createConfirmButton, createCancelButton } from './c_buttons.js';
import { STATUS_COLORS } from '../../config/cfg_colors.js';
import { EMOJIS } from '../../config/cfg_emojis.js';
import { CONFIRMATION_MESSAGES } from '../../messages/msg_confirmations.js';
import { BUTTON_LABELS } from '../../config/cfg_labels.js';

/**
 * Creates an ActionRow containing Confirm and Cancel buttons.
 *
 * @param {object} params
 * @param {string} params.confirmCustomId
 * @param {string} params.cancelCustomId
 * @param {boolean} [params.isDestructive=false]
 * @param {string} [params.confirmLabel]
 * @param {string} [params.cancelLabel]
 * @param {boolean} [params.disabled=false]
 * @returns {ActionRowBuilder}
 */
export function createConfirmationActionRow({
  confirmCustomId,
  cancelCustomId,
  isDestructive = false,
  confirmLabel = BUTTON_LABELS.CONFIRM,
  cancelLabel = BUTTON_LABELS.CANCEL,
  disabled = false,
}) {
  const confirmBtn = createConfirmButton({
    customId: confirmCustomId,
    label: confirmLabel,
    isDestructive,
    disabled,
  });

  const cancelBtn = createCancelButton({
    customId: cancelCustomId,
    label: cancelLabel,
    disabled,
  });

  return new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
}

/**
 * Creates a complete Confirmation Message Payload with an embed and action row.
 *
 * @param {object} params
 * @param {string} [params.title]
 * @param {string} [params.description]
 * @param {string} params.confirmCustomId
 * @param {string} params.cancelCustomId
 * @param {boolean} [params.isDestructive=false]
 * @param {string} [params.confirmLabel]
 * @param {string} [params.cancelLabel]
 * @param {Array<{ name: string, value: string, inline?: boolean }>} [params.fields]
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
export function createConfirmationPayload({
  title,
  description,
  confirmCustomId,
  cancelCustomId,
  isDestructive = false,
  confirmLabel = BUTTON_LABELS.CONFIRM,
  cancelLabel = BUTTON_LABELS.CANCEL,
  fields = [],
}) {
  const defaultTitle = isDestructive
    ? `${EMOJIS.WARNING} ${CONFIRMATION_MESSAGES.DESTRUCTIVE_TITLE}`
    : `${EMOJIS.HELP} ${CONFIRMATION_MESSAGES.DEFAULT_TITLE}`;

  const defaultDesc = isDestructive
    ? CONFIRMATION_MESSAGES.DESTRUCTIVE_DESCRIPTION
    : CONFIRMATION_MESSAGES.DEFAULT_DESCRIPTION;

  const embed = new EmbedBuilder()
    .setColor(isDestructive ? STATUS_COLORS.ERROR : STATUS_COLORS.WARNING)
    .setTitle(title || defaultTitle)
    .setDescription(description || defaultDesc)
    .setFooter({ text: 'GDG Ghardaia • Confirmation Required' })
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  const row = createConfirmationActionRow({
    confirmCustomId,
    cancelCustomId,
    isDestructive,
    confirmLabel,
    cancelLabel,
  });

  return {
    embeds: [embed],
    components: [row],
  };
}
