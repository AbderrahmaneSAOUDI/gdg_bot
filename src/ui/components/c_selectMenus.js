import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
} from 'discord.js';
import { SELECT_LABELS } from '../../config/cfg_labels.js';
import { getAllTeams } from '../../config/cfg_teams.js';
import { EMOJIS } from '../../config/cfg_emojis.js';

/**
 * Creates a generic String Select Menu.
 */
export function createOptionSelectMenu({
  customId,
  placeholder = SELECT_LABELS.OPTION_PLACEHOLDER,
  options = [],
  minValues = 1,
  maxValues = 1,
  disabled = false,
}) {
  if (!customId) throw new Error('Select menu must have a customId');

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(minValues)
    .setMaxValues(maxValues)
    .setDisabled(disabled);

  if (options.length > 0) {
    menu.addOptions(
      options.map((opt) => {
        if (opt instanceof StringSelectMenuOptionBuilder) return opt;
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setValue(opt.value);

        if (opt.description) option.setDescription(opt.description);
        if (opt.emoji) option.setEmoji(opt.emoji);
        if (opt.default) option.setDefault(opt.default);

        return option;
      })
    );
  }

  return menu;
}

/**
 * Creates a native User/Member Select Menu.
 */
export function createMemberSelectMenu({
  customId,
  placeholder = SELECT_LABELS.MEMBER_PLACEHOLDER,
  minValues = 1,
  maxValues = 1,
  disabled = false,
}) {
  if (!customId) throw new Error('Select menu must have a customId');

  return new UserSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(minValues)
    .setMaxValues(maxValues)
    .setDisabled(disabled);
}

/**
 * Creates a native Role Select Menu.
 */
export function createRoleSelectMenu({
  customId,
  placeholder = SELECT_LABELS.ROLE_PLACEHOLDER,
  minValues = 1,
  maxValues = 1,
  disabled = false,
}) {
  if (!customId) throw new Error('Select menu must have a customId');

  return new RoleSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(minValues)
    .setMaxValues(maxValues)
    .setDisabled(disabled);
}

/**
 * Creates a Team/Department Select Menu using configured GDG squads.
 */
export function createTeamSelectMenu({
  customId,
  placeholder = SELECT_LABELS.TEAM_PLACEHOLDER,
  teams = getAllTeams(),
  minValues = 1,
  maxValues = 1,
  disabled = false,
}) {
  const options = teams.map((team) => ({
    label: team.name,
    value: team.key,
    description: team.description?.slice(0, 100) || `GDG ${team.name} Squad`,
    emoji: EMOJIS.TEAM,
  }));

  return createOptionSelectMenu({
    customId,
    placeholder,
    options,
    minValues,
    maxValues,
    disabled,
  });
}

/**
 * Creates an Activity / Event Select Menu.
 */
export function createActivitySelectMenu({
  customId,
  placeholder = SELECT_LABELS.ACTIVITY_PLACEHOLDER,
  activities = [],
  minValues = 1,
  maxValues = 1,
  disabled = false,
}) {
  const options = activities.map((act) => ({
    label: act.name || act.label,
    value: act.id || act.value,
    description: act.description?.slice(0, 100),
    emoji: act.emoji || EMOJIS.ACTIVITIES,
  }));

  return createOptionSelectMenu({
    customId,
    placeholder,
    options,
    minValues,
    maxValues,
    disabled,
  });
}

/**
 * Creates a Category Select Menu.
 */
export function createCategorySelectMenu({
  customId,
  placeholder = SELECT_LABELS.CATEGORY_PLACEHOLDER,
  categories = [],
  minValues = 1,
  maxValues = 1,
  disabled = false,
}) {
  const options = categories.map((cat) => ({
    label: cat.name || cat.label,
    value: cat.id || cat.value,
    description: cat.description?.slice(0, 100),
    emoji: cat.emoji || EMOJIS.RESOURCE,
  }));

  return createOptionSelectMenu({
    customId,
    placeholder,
    options,
    minValues,
    maxValues,
    disabled,
  });
}
