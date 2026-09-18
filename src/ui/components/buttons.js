import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJIS } from '../../config/emojis.js';
import { BUTTON_LABELS } from '../../config/labels.js';
import { CUSTOM_IDS } from '../../config/customIds.js';

/**
 * Creates a Button with a specified style.
 */
function createButton({ style, customId, url, label, emoji, disabled = false }) {
  const button = new ButtonBuilder().setStyle(style).setDisabled(disabled);

  if (label) button.setLabel(label);
  if (emoji) button.setEmoji(emoji);

  if (style === ButtonStyle.Link) {
    if (!url) throw new Error('Link button must have a valid URL');
    button.setURL(url);
  } else {
    if (!customId) throw new Error('Interactive button must have a valid customId');
    button.setCustomId(customId);
  }

  return button;
}

// ==========================================
// 1. Core Button Variants
// ==========================================

export function createPrimaryButton({ customId, label, emoji, disabled = false }) {
  return createButton({ style: ButtonStyle.Primary, customId, label, emoji, disabled });
}

export function createSecondaryButton({ customId, label, emoji, disabled = false }) {
  return createButton({ style: ButtonStyle.Secondary, customId, label, emoji, disabled });
}

export function createSuccessButton({ customId, label, emoji, disabled = false }) {
  return createButton({ style: ButtonStyle.Success, customId, label, emoji, disabled });
}

export function createDangerButton({ customId, label, emoji, disabled = false }) {
  return createButton({ style: ButtonStyle.Danger, customId, label, emoji, disabled });
}

export function createLinkButton({ url, label, emoji, disabled = false }) {
  return createButton({ style: ButtonStyle.Link, url, label, emoji, disabled });
}

// ==========================================
// 2. Standard Common Action Buttons
// ==========================================

export function createBackButton({
  customId = CUSTOM_IDS.NAV_BACK,
  label = BUTTON_LABELS.BACK,
  emoji = EMOJIS.BACK,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createHomeButton({
  customId = CUSTOM_IDS.NAV_HOME,
  label = BUTTON_LABELS.HOME,
  emoji = EMOJIS.HOME,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createCloseButton({
  customId = CUSTOM_IDS.NAV_CLOSE,
  label = BUTTON_LABELS.CLOSE,
  emoji = EMOJIS.CLOSE,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createCancelButton({
  customId = CUSTOM_IDS.CONFIRM_NO,
  label = BUTTON_LABELS.CANCEL,
  emoji = EMOJIS.CANCEL,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createConfirmButton({
  customId = CUSTOM_IDS.CONFIRM_YES,
  label = BUTTON_LABELS.CONFIRM,
  emoji = EMOJIS.CONFIRM,
  isDestructive = false,
  disabled = false,
} = {}) {
  const style = isDestructive ? ButtonStyle.Danger : ButtonStyle.Success;
  return createButton({ style, customId, label, emoji, disabled });
}

export function createSaveButton({
  customId,
  label = BUTTON_LABELS.SAVE,
  emoji = EMOJIS.SAVE,
  disabled = false,
}) {
  return createSuccessButton({ customId, label, emoji, disabled });
}

export function createEditButton({
  customId,
  label = BUTTON_LABELS.EDIT,
  emoji = EMOJIS.EDIT,
  disabled = false,
}) {
  return createPrimaryButton({ customId, label, emoji, disabled });
}

export function createDeleteButton({
  customId,
  label = BUTTON_LABELS.DELETE,
  emoji = EMOJIS.DELETE,
  disabled = false,
}) {
  return createDangerButton({ customId, label, emoji, disabled });
}

export function createCreateButton({
  customId,
  label = BUTTON_LABELS.CREATE,
  emoji = EMOJIS.CREATE,
  disabled = false,
}) {
  return createSuccessButton({ customId, label, emoji, disabled });
}

export function createRefreshButton({
  customId = CUSTOM_IDS.NAV_REFRESH,
  label = BUTTON_LABELS.REFRESH,
  emoji = EMOJIS.REFRESH,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createNextButton({
  customId = CUSTOM_IDS.PAGE_NEXT,
  label = BUTTON_LABELS.NEXT,
  emoji = EMOJIS.NEXT,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createPreviousButton({
  customId = CUSTOM_IDS.PAGE_PREV,
  label = BUTTON_LABELS.PREVIOUS,
  emoji = EMOJIS.PREVIOUS,
  disabled = false,
} = {}) {
  return createSecondaryButton({ customId, label, emoji, disabled });
}

export function createViewButton({
  customId,
  label = BUTTON_LABELS.VIEW,
  emoji = EMOJIS.VIEW,
  disabled = false,
}) {
  return createPrimaryButton({ customId, label, emoji, disabled });
}

export function createOpenButton({
  customId,
  label = BUTTON_LABELS.OPEN,
  emoji = EMOJIS.OPEN,
  disabled = false,
}) {
  return createPrimaryButton({ customId, label, emoji, disabled });
}
