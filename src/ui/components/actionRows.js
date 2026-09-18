import { ActionRowBuilder, ButtonBuilder } from 'discord.js';

/**
 * Splits an array of components (primarily buttons) into ActionRowBuilder rows,
 * respecting Discord's limit of 5 buttons per row, and placing Select Menus in dedicated rows.
 *
 * @param {Array<any>} components
 * @returns {ActionRowBuilder[]}
 */
export function createActionRows(...components) {
  const flattened = components.flat(Infinity).filter(Boolean);
  const rows = [];
  let currentButtonRow = new ActionRowBuilder();

  for (const component of flattened) {
    if (component instanceof ActionRowBuilder) {
      if (currentButtonRow.components.length > 0) {
        rows.push(currentButtonRow);
        currentButtonRow = new ActionRowBuilder();
      }
      rows.push(component);
      continue;
    }

    if (component instanceof ButtonBuilder) {
      if (currentButtonRow.components.length >= 5) {
        rows.push(currentButtonRow);
        currentButtonRow = new ActionRowBuilder();
      }
      currentButtonRow.addComponents(component);
    } else {
      // Any other component (like SelectMenuBuilder) takes its own row
      if (currentButtonRow.components.length > 0) {
        rows.push(currentButtonRow);
        currentButtonRow = new ActionRowBuilder();
      }
      rows.push(new ActionRowBuilder().addComponents(component));
    }
  }

  if (currentButtonRow.components.length > 0) {
    rows.push(currentButtonRow);
  }

  return rows;
}
