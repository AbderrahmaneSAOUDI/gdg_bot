import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { getHubPayload, getPersistentHubPayload } from '../../ui/hub.js';
import { ERROR_MESSAGES } from '../../messages/errors.js';
import { COMMON_MESSAGES } from '../../messages/common.js';
import { EMOJIS } from '../../config/emojis.js';

export const data = new SlashCommandBuilder()
  .setName('bot')
  .setDescription('Open the GDG Ghardaia Team Hub dashboard')
  .addChannelOption((option) =>
    option
      .setName('deploy_channel')
      .setDescription('(Admin) Deploy a persistent Team Hub dashboard message to a channel')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)
  );

export async function execute(interaction) {
  const targetChannel = interaction.options.getChannel('deploy_channel');

  // Admin deployment flow
  if (targetChannel) {
    const hasPermission =
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return interaction.reply({
        content: `${EMOJIS.LOCK} ${ERROR_MESSAGES.ADMIN_REQUIRED}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const botPermissions = targetChannel.permissionsFor(interaction.client.user);
    if (!botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return interaction.reply({
        content: `${EMOJIS.WARNING} ${ERROR_MESSAGES.CHANNEL_PERMISSIONS_MISSING(targetChannel)}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await targetChannel.send(getPersistentHubPayload());

    return interaction.reply({
      content: `${EMOJIS.SUCCESS} ${COMMON_MESSAGES.PERSISTENT_DEPLOYED_TO(targetChannel)}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Standard user flow: Ephemeral Team Hub Dashboard
  const payload = getHubPayload(interaction.user, interaction.member);

  await interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral,
  });
}
