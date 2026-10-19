import path from 'node:path';
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
  createLoadingEmbed,
  createSuccessEmbed,
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
import { EXTRACTOR_MESSAGES } from '../messages/msg_extractor.js';
import { EMOJIS } from '../config/cfg_emojis.js';
import {
  registerEvent,
  getEvent,
  createTeamWithRoles,
  removeTeamWithRoles,
  assignMembersWithRoles,
  assignMentorsWithRoles,
  extractServerData,
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
      if (error?.code !== 10062) {
        console.error(`[ERROR] Error executing command '${interaction.commandName}':`, error);
      }
      await sendErrorMessage(interaction, error);
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

      // Admin action: Extract whole server to server_data folder
      if (
        interaction.customId === CUSTOM_IDS.HUB_EXTRACT_SERVER ||
        (parsed.namespace === NAMESPACES.HUB && parsed.action === 'extract_server')
      ) {
        if (!interaction.guild) {
          return interaction.reply({
            content: `${EMOJIS.WARNING} ${EXTRACTOR_MESSAGES.NO_GUILD}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const hasPermission =
          interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
          interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

        if (!hasPermission) {
          return interaction.reply({
            content: `${EMOJIS.LOCK} ${ERROR_MESSAGES.ADMIN_REQUIRED}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let lastEditTime = 0;
        const onProgress = async ({ stage, current, total, channelName }) => {
          const now = Date.now();
          if (now - lastEditTime < 1500 && current !== total) return;
          lastEditTime = now;

          const progressText =
            stage === 'roles'
              ? EXTRACTOR_MESSAGES.PROGRESS_ROLES
              : EXTRACTOR_MESSAGES.PROGRESS_CHANNELS(current, total, channelName);

          const loadingEmbed = createLoadingEmbed({
            title: EXTRACTOR_MESSAGES.START_TITLE,
            message: progressText,
          });

          await interaction.editReply({
            embeds: [loadingEmbed],
          }).catch(() => {});
        };

        const targetDir = path.resolve(process.cwd(), 'server_data');
        const stats = await extractServerData({
          guild: interaction.guild,
          outputDir: targetDir,
          onProgress,
        });

        const successEmbed = createSuccessEmbed({
          title: EXTRACTOR_MESSAGES.SUCCESS_TITLE,
          description: EXTRACTOR_MESSAGES.SUCCESS_DESC(stats),
        });

        return await interaction.editReply({
          embeds: [successEmbed],
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
        payload = getEventsPayload(interaction.guild);
      } else if (parsed.namespace === NAMESPACES.EVENT && parsed.action === 'detail') {
        payload = getEventDetailPayload(parsed.params[0], interaction.guild);
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'view') {
        payload = getTeamsPayload(parsed.params[0], interaction.guild, 1);
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'page') {
        const eventId = parsed.params[0];
        const page = parseInt(parsed.params[1], 10) || 1;
        payload = getTeamsPayload(eventId, interaction.guild, page);
      } else if (parsed.namespace === NAMESPACES.MENTOR && parsed.action === 'view') {
        payload = getMentorsPayload(parsed.params[0], interaction.guild);
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'assign_members') {
        payload = getAssignPayload({
          eventId: parsed.params[0],
          type: 'members',
          selectedTeamId: parsed.params[1] || null,
          guild: interaction.guild,
        });
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'assign_mentors') {
        payload = getAssignPayload({
          eventId: parsed.params[0],
          type: 'mentors',
          selectedTeamId: parsed.params[1] || null,
          guild: interaction.guild,
        });
      } else if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'delete_menu') {
        payload = getDeleteTeamPayload(parsed.params[0], interaction.guild);
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
      if (error?.code !== 10062) {
        console.error(`[ERROR] Failed to handle button interaction '${interaction.customId}':`, error);
      }
      await sendErrorMessage(interaction, error);
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
        const payload = getEventDetailPayload(selectedEventId, interaction.guild);
        return await interaction.update(payload);
      }

      // Choose target team in Assign Screen
      if (parsed.namespace === NAMESPACES.TEAM && parsed.action === 'assign_target') {
        const eventId = parsed.params[0];
        const type = parsed.params[1] || 'members';
        const selectedTeamId = interaction.values[0];
        const payload = getAssignPayload({ eventId, type, selectedTeamId, guild: interaction.guild });
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

        const payload = getTeamsPayload(eventId, interaction.guild, 1);
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
      if (error?.code !== 10062) {
        console.error(`[ERROR] StringSelectMenu failed for '${interaction.customId}':`, error);
      }
      await sendErrorMessage(interaction, error);
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

        const event = getEvent(eventId);
        const teamIndex = event?.teams?.findIndex((t) => t.id === teamId);
        const targetPage = teamIndex !== -1 && teamIndex !== undefined ? teamIndex + 1 : 1;

        const payload = getTeamsPayload(eventId, interaction.guild, targetPage);
        await interaction.update(payload);

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
      if (error?.code !== 10062) {
        console.error(`[ERROR] UserSelectMenu failed for '${interaction.customId}':`, error);
      }
      await sendErrorMessage(interaction, error);
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
        const payload = getEventDetailPayload(newEvent.id, interaction.guild);

        return await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Add Team Modal Submit
      if (parsed.namespace === NAMESPACES.MODAL && parsed.action === 'team_add') {
        const eventId = parsed.params[0];
        const name = interaction.fields.getTextInputValue('team_name');

        await createTeamWithRoles({
          guild: interaction.guild,
          eventId,
          name,
        });

        const event = getEvent(eventId);
        const lastPage = event?.teams?.length || 1;
        const payload = getTeamsPayload(eventId, interaction.guild, lastPage);

        return await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      if (error?.code !== 10062) {
        console.error(`[ERROR] Modal submission failed for '${interaction.customId}':`, error);
      }
      await sendErrorMessage(interaction, error);
    }
  }
}

async function sendErrorMessage(interaction, error) {
  if (error?.code === 10062) {
    // Discord 3-second acknowledgement window expired
    console.warn(`[WARN] Interaction expired before response could be sent.`);
    return;
  }

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
