import { Events, MessageFlags, PermissionFlagsBits } from 'discord.js';
import {
  getHubPayload,
  getKnowledgePayload,
  getProfilePayload,
  getPersistentHubPayload,
} from '../ui/hub.js';
import { parseCustomId, CUSTOM_IDS, NAMESPACES } from '../config/customIds.js';
import { ERROR_MESSAGES } from '../messages/errors.js';
import { COMMON_MESSAGES } from '../messages/common.js';
import { EMOJIS } from '../config/emojis.js';

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
          // In ephemeral messages, deleteReply cleans up the screen
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

      // Hub Navigation Views
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
      } else {
        return;
      }

      const isEphemeral = interaction.message?.flags?.has(MessageFlags.Ephemeral);

      if (isEphemeral) {
        // In-place navigation within active ephemeral session
        await interaction.update(payload);
      } else {
        // Opening private session from persistent channel message
        await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error(`[ERROR] Failed to handle button interaction '${interaction.customId}':`, error);

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
  }
}
