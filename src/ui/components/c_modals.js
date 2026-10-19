import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

/**
 * Creates a Discord Modal containing the provided input fields.
 * Each TextInputBuilder is automatically wrapped in an ActionRowBuilder.
 *
 * @param {object} params
 * @param {string} params.customId
 * @param {string} params.title
 * @param {Array<TextInputBuilder|ActionRowBuilder>} params.inputs
 * @returns {ModalBuilder}
 */
export function createModal({ customId, title, inputs = [] }) {
  if (!customId) throw new Error('Modal must have a customId');
  if (!title) throw new Error('Modal must have a title');

  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  const rows = inputs.map((input) => {
    if (input instanceof ActionRowBuilder) return input;
    return new ActionRowBuilder().addComponents(input);
  });

  if (rows.length > 0) {
    modal.addComponents(...rows);
  }

  return modal;
}

/**
 * Creates a Short Text Input component.
 */
export function createShortTextInput({
  customId,
  label,
  placeholder,
  value,
  required = true,
  minLength,
  maxLength = 100,
}) {
  if (!customId) throw new Error('Text input must have a customId');
  if (!label) throw new Error('Text input must have a label');

  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setRequired(required);

  if (placeholder) input.setPlaceholder(placeholder);
  if (value) input.setValue(String(value));
  if (minLength !== undefined) input.setMinLength(minLength);
  if (maxLength !== undefined) input.setMaxLength(maxLength);

  return input;
}

/**
 * Creates a Long / Paragraph Text Input component.
 */
export function createLongTextInput({
  customId,
  label,
  placeholder,
  value,
  required = true,
  minLength,
  maxLength = 1000,
}) {
  if (!customId) throw new Error('Text input must have a customId');
  if (!label) throw new Error('Text input must have a label');

  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(required);

  if (placeholder) input.setPlaceholder(placeholder);
  if (value) input.setValue(String(value));
  if (minLength !== undefined) input.setMinLength(minLength);
  if (maxLength !== undefined) input.setMaxLength(maxLength);

  return input;
}

/**
 * Creates a URL Input component.
 */
export function createUrlInput({
  customId,
  label = 'URL / Link',
  placeholder = 'https://example.com',
  value,
  required = true,
}) {
  return createShortTextInput({
    customId,
    label,
    placeholder,
    value,
    required,
    maxLength: 512,
  });
}

/**
 * Creates a Date Input component (e.g. YYYY-MM-DD).
 */
export function createDateInput({
  customId,
  label = 'Date',
  placeholder = 'YYYY-MM-DD (e.g. 2026-10-15)',
  value,
  required = true,
}) {
  return createShortTextInput({
    customId,
    label,
    placeholder,
    value,
    required,
    minLength: 10,
    maxLength: 10,
  });
}

/**
 * Creates a Time Input component (e.g. HH:MM).
 */
export function createTimeInput({
  customId,
  label = 'Time',
  placeholder = 'HH:MM (24-hour, e.g. 19:30)',
  value,
  required = true,
}) {
  return createShortTextInput({
    customId,
    label,
    placeholder,
    value,
    required,
    minLength: 5,
    maxLength: 5,
  });
}

/**
 * Creates a Number Input component.
 */
export function createNumberInput({
  customId,
  label = 'Number / Quantity',
  placeholder = 'Enter a number (e.g. 5)',
  value,
  required = true,
  min = 1,
  max = 99999,
}) {
  return createShortTextInput({
    customId,
    label,
    placeholder,
    value: value !== undefined ? String(value) : undefined,
    required,
    minLength: 1,
    maxLength: String(max).length,
  });
}

/**
 * Creates the Add Event Modal.
 */
export function createEventAddModal({ customId = 'bot:modal:event_add' } = {}) {
  const nameInput = createShortTextInput({
    customId: 'event_name',
    label: 'Event / Competition Name',
    placeholder: 'e.g. Hackathon 2026 / DevFest',
    required: true,
    minLength: 3,
    maxLength: 50,
  });

  const descInput = createLongTextInput({
    customId: 'event_description',
    label: 'Description & Competition Rules',
    placeholder: 'Brief overview of the competition, theme, and tracks...',
    required: false,
    maxLength: 500,
  });

  return createModal({
    customId,
    title: 'Create New Event',
    inputs: [nameInput, descInput],
  });
}

/**
 * Creates the Add Team Modal.
 */
export function createTeamAddModal({ customId, defaultNumber = 1 } = {}) {
  const paddedNum = String(defaultNumber).padStart(2, '0');

  const nameInput = createShortTextInput({
    customId: 'team_name',
    label: 'Team Name',
    placeholder: `Team ${paddedNum}`,
    value: `Team ${paddedNum}`,
    required: true,
    minLength: 2,
    maxLength: 30,
  });

  return createModal({
    customId,
    title: 'Add New Team',
    inputs: [nameInput],
  });
}

