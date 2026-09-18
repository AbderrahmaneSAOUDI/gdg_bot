import { Events, MessageFlags, PermissionFlagsBits } from 'discord.js';
import {
  getHubPayload,
  getTeamPayload,
  getMeetingsPayload,
  getActivitiesPayload,
  getKnowledgePayload,
  getRequestsPayload,
  getProfilePayload,
  getMorePayload,
  getPersistentHubPayload,
} from '../ui/hub.js';

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
        content: '⚠️ There was an error while executing this command!',
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
    if (!interaction.customId.startsWith('hub:')) return;

    try {
      // Admin action: Deploy persistent hub to the current channel
      if (interaction.customId === 'hub:deploy_persistent') {
        const hasPermission =
          interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
          interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

        if (!hasPermission) {
          return interaction.reply({
            content: '🚫 You must have the **Manage Server** or **Administrator** permission to deploy the persistent hub.',
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.channel.send(getPersistentHubPayload());

        return interaction.reply({
          content: `✅ Persistent Team Hub dashboard successfully deployed to ${interaction.channel}!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Hub Navigation Views
      let payload = null;

      switch (interaction.customId) {
        case 'hub:main':
          payload = getHubPayload(interaction.user, interaction.member);
          break;
        case 'hub:team':
          payload = getTeamPayload(interaction.user, interaction.member);
          break;
        case 'hub:meetings':
          payload = getMeetingsPayload(interaction.user, interaction.member);
          break;
        case 'hub:activities':
          payload = getActivitiesPayload(interaction.user, interaction.member);
          break;
        case 'hub:knowledge':
          payload = getKnowledgePayload(interaction.user, interaction.member);
          break;
        case 'hub:requests':
          payload = getRequestsPayload(interaction.user, interaction.member);
          break;
        case 'hub:profile':
          payload = getProfilePayload(interaction.user, interaction.member);
          break;
        case 'hub:more':
          payload = getMorePayload(interaction.user, interaction.member, interaction.client);
          break;
        default:
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
        content: '⚠️ Failed to update the dashboard view. Please try running `/bot` again.',
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

