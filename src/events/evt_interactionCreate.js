import { Events, MessageFlags, PermissionFlagsBits } from 'discord.js';
import {
  getHubPayload,
  getKnowledgePayload,
  getProfilePayload,
  getPersistentHubPayload,
  getEventsPayload,
  getEventDetailPayload,
  getTeamsPayload,
  getMentorsPayload,
  getAssignPayload,
  getDeleteTeamPayload,
  createEventAddModal,
  createTeamAddModal,
} from '../ui/index.js';
import {
  parseCustomId,
  CUSTOM_IDS,
  NAMESPACES,
  buildCustomId,
} from '../config/cfg_customIds.js';
import { ERROR_MESSAGES } from '../messages/msg_errors.js';
import { COMMON_MESSAGES } from '../messages/msg_common.js';
import { EVENT_MESSAGES } from '../messages/msg_events.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import {
  registerEvent,
  getEvent,
  createTeamWithRoles,
  removeTeamWithRoles,
  assignMembersWithRoles,
  assignMentorsWithRoles,
} from '../features/index.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction) {
  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`[ERROR] No command matching '${interaction.commandName}' was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[ERROR] Error executing command '${interaction.commandName}':`, error);

      const errorMessage = {
        content: `${EMOJIS.ERROR} ${ERROR_MESSAGES.OPERATION_FAILED}`,
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(() => {});
      } else {
        await interaction.reply(errorMessage).catch(() => {});
      }
    }
    return;
  }

  // 2. Handle Button Component Interactions
  if (interaction.isButton()) {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed.isBotCustomId) return;

    try {
      // Standard Close button interaction
      if (
        interaction.customId === CUSTOM_IDS.NAV_CLOSE ||
        (parsed.namespace === NAMESPACES.NAV && parsed.action === 'close') ||
        interaction.customId.endsWith(':close')
      ) {
        if (interaction.message?.flags?.has(MessageFlags.Ephemeral)) {
          await interaction.deleteReply().catch(async () => {
            await interaction.update({
              content: `${EMOJIS.CLOSE} ${COMMON_MESSAGES.SESSION_CLOSED}`,
              embeds: [],
              components: [],
            }).catch(() => {});
          });
        } else {
          await interaction.reply({
            content: `${EMOJIS.CLOSE} ${COMMON_MESSAGES.SESSION_CLOSED}`,
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      // Admin action: Deploy persistent hub to the current channel
      if (interaction.customId === 'hub:deploy_persistent') {
        const hasPermission =
          interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
          interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

        if (!hasPermission) {
          return interaction.reply({
            content: `${EMOJIS.LOCK} ${ERROR_MESSAGES.ADMIN_REQUIRED}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.channel.send(getPersistentHubPayload());

        return interaction.reply({
          content: `${EMOJIS.SUCCESS} ${COMMON_MESSAGES.PERSISTENT_DEPLOYED}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Modal triggers for Add Event & Add Team
      if (
        interaction.customId === CUSTOM_IDS.EVENT_ADD ||
        (parsed.namespace === NAMESPACES.EVENT && parsed.action === 'add')
      ) {
        const modal = createEventAddModal({
          customId: buildCustomId(NAMESPACES.MODAL, 'event_add'),
        });
        return await interaction.showModal(modal);
      }

      if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'add') {
        const eventId = parsed.params[0];
        const event = getEvent(eventId);
        const nextNum = (event?.teams?.length || 0) + 1;
        const modal = createTeamAddModal({
          customId: buildCustomId(NAMESPACES.MODAL, 'team_add', eventId),
          defaultNumber: nextNum,
        });
        return await interaction.showModal(modal);
      }

      // Hub & Event Navigation Views
      let payload = null;

      if (
        interaction.customId === CUSTOM_IDS.HUB_MAIN ||
        interaction.customId === 'hub:main' ||
        interaction.customId === CUSTOM_IDS.NAV_HOME ||
        (parsed.namespace === NAMESPACES.HUB && parsed.action === 'main')
      ) {
        payload = getHubPayload(interaction.user, interaction.member);
      } else if (
        interaction.customId === CUSTOM_IDS.HUB_KNOWLEDGE ||
        interaction.customId === 'hub:knowledge' ||
        (parsed.namespace === NAMESPACES.HUB && parsed.action === 'knowledge')
      ) {
        payload = getKnowledgePayload(interaction.user, interaction.member);
      } else if (
        interaction.customId === CUSTOM_IDS.HUB_PROFILE ||
        interaction.customId === 'hub:profile' ||
        (parsed.namespace === NAMESPACES.HUB && parsed.action === 'profile')
      ) {
        payload = getProfilePayload(interaction.user, interaction.member);
      } else if (
        interaction.customId === CUSTOM_IDS.HUB_EVENTS ||
        (parsed.namespace === NAMESPACES.HUB && parsed.action === 'events')
      ) {
        payload = getEventsPayload();
      } else if (parsed.namespace === NAMESPACES.EVENT && parsed.action === 'detail') {
        payload = getEventDetailPayload(parsed.params[0]);
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'view') {
        payload = getTeamsPayload(parsed.params[0]);
      } else if (parsed.namespace === NAMESPACES.MENTOR && parsed.action === 'view') {
        payload = getMentorsPayload(parsed.params[0]);
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'assign_members') {
        payload = getAssignPayload({ eventId: parsed.params[0], type: 'members' });
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'assign_mentors') {
        payload = getAssignPayload({ eventId: parsed.params[0], type: 'mentors' });
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'delete_menu') {
        payload = getDeleteTeamPayload(parsed.params[0]);
      } else {
        return;
      }

      const isEphemeral = interaction.message?.flags?.has(MessageFlags.Ephemeral);

      if (isEphemeral) {
        await interaction.update(payload);
      } else {
        await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error(`[ERROR] Failed to handle button interaction '${interaction.customId}':`, error);
      await sendErrorMessage(interaction);
    }
    return;
  }

  // 3. Handle String Select Menu Interactions
  if (interaction.isStringSelectMenu()) {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed.isBotCustomId) return;

    try {
      // Pick an Event from the directory
      if (
        interaction.customId === CUSTOM_IDS.EVENT_SELECT ||
        (parsed.namespace === NAMESPACES.EVENT && parsed.action === 'select')
      ) {
        const selectedEventId = interaction.values[0];
        const payload = getEventDetailPayload(selectedEventId);
        return await interaction.update(payload);
      }

      // Choose target team in Assign Screen
      if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'assign_target') {
        const eventId = parsed.params[0];
        const type = parsed.params[1] || 'members';
        const selectedTeamId = interaction.values[0];
        const payload = getAssignPayload({ eventId, type, selectedTeamId });
        return await interaction.update(payload);
      }

      // Delete confirmation
      if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'delete_confirm') {
        const eventId = parsed.params[0];
        const teamId = interaction.values[0];
        const deletedTeam = await removeTeamWithRoles({
          guild: interaction.guild,
          eventId,
          teamId,
        });

        const payload = getTeamsPayload(eventId);
        await interaction.update(payload);

        if (deletedTeam) {
          await interaction.followUp({
            content: EVENT_MESSAGES.TEAM_DELETED(deletedTeam.name),
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }
    } catch (error) {
      console.error(`[ERROR] StringSelectMenu failed for '${interaction.customId}':`, error);
      await sendErrorMessage(interaction);
    }
    return;
  }

  // 4. Handle Native Discord User Select Menu Interactions
  if (interaction.isUserSelectMenu()) {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed.isBotCustomId) return;

    try {
      if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'user_select') {
        const eventId = parsed.params[0];
        const teamId = parsed.params[1];
        const type = parsed.params[2]; // 'members' | 'mentors'
        const userIds = interaction.values;

        if (type === 'members') {
          await assignMembersWithRoles({
            guild: interaction.guild,
            eventId,
            teamId,
            userIds,
          });
        } else {
          await assignMentorsWithRoles({
            guild: interaction.guild,
            eventId,
            teamId,
            userIds,
          });
        }

        const payload = getTeamsPayload(eventId);
        await interaction.update(payload);

        const event = getEvent(eventId);
        const team = event?.teams?.find((t) => t.id === teamId);
        const successMsg =
          type === 'members'
            ? EVENT_MESSAGES.MEMBERS_ASSIGNED(team?.name || 'Team', userIds.length)
            : EVENT_MESSAGES.MENTORS_ASSIGNED(team?.name || 'Team', userIds.length);

        await interaction.followUp({
          content: successMsg,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
        return;
      }
    } catch (error) {
      console.error(`[ERROR] UserSelectMenu failed for '${interaction.customId}':`, error);
      await sendErrorMessage(interaction);
    }
    return;
  }

  // 5. Handle Modal Submissions
  if (interaction.isModalSubmit()) {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed.isBotCustomId) return;

    try {
      // Add Event Modal Submit
      if (parsed.namespace === NAMESPACES.MODAL && parsed.action === 'event_add') {
        const name = interaction.fields.getTextInputValue('event_name');
        const description = interaction.fields.getTextInputValue('event_description');

        const newEvent = registerEvent({ name, description });
        const payload = getEventDetailPayload(newEvent.id);

        return await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Add Team Modal Submit
      if (parsed.namespace === NAMESPACES.MODAL && parsed.action === 'team_add') {
        const eventId = parsed.params[0];
        const name = interaction.fields.getTextInputValue('team_name');
        const category = interaction.fields.getTextInputValue('team_category');

        await createTeamWithRoles({
          guild: interaction.guild,
          eventId,
          name,
          category,
        });

        const payload = getTeamsPayload(eventId);
        return await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error(`[ERROR] Modal submission failed for '${interaction.customId}':`, error);
      await sendErrorMessage(interaction);
    }
  }
}

async function sendErrorMessage(interaction) {
  const errorMessage = {
    content: `${EMOJIS.WARNING} ${ERROR_MESSAGES.OPERATION_FAILED}`,
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(errorMessage).catch(() => {});
  } else {
    await interaction.reply(errorMessage).catch(() => {});
  }
}
