import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { getHubPayload, getPersistentHubPayload } from '../../ui/view_hub.js';
import { ERROR_MESSAGES } from '../../messages/msg_errors.js';
import { COMMON_MESSAGES } from '../../messages/msg_common.js';
import { EMOJIS } from '../../config/cfg_emojis.js';
import { clubServices } from '../../features/srv_club.js';
import { interactionContext } from '../../utils/f_interactionResponse.js';

export const data = new SlashCommandBuilder()
  .setName('bot')
  .setDescription('Open the GDG Ghardaia Server Hub dashboard')
  .addChannelOption((option) =>
    option
      .setName('deploy_channel')
      .setDescription('(Admin) Deploy a persistent Server Hub dashboard message to a channel')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)
  );

export async function execute(interaction) {
  const ctx = interactionContext(interaction);
  const capabilities = clubServices.capabilities(ctx);
  const targetChannel = interaction.options.getChannel('deploy_channel');

  // Admin deployment flow
  if (targetChannel) {
    const hasPermission = capabilities.setupManage;

    if (!hasPermission) {
      return interaction.reply({
        content: `${EMOJIS.LOCK} ${ERROR_MESSAGES.ADMIN_REQUIRED}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (targetChannel.guild?.id !== ctx.guild.id) throw new Error('The hub channel must belong to this server.');

    const botPermissions = targetChannel.permissionsFor(interaction.client.user);
    if (!botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return interaction.reply({
        content: `${EMOJIS.WARNING} ${ERROR_MESSAGES.CHANNEL_PERMISSIONS_MISSING(targetChannel)}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await ctx.guild.roles.fetch();
    const actor = await ctx.guild.members.fetch({ user: ctx.actor.id, force: true });
    if (!clubServices.capabilities({ guild: ctx.guild, actor }).setupManage) {
      return interaction.editReply({content:`${EMOJIS.LOCK} ${ERROR_MESSAGES.ADMIN_REQUIRED}`,allowedMentions:{parse:[]}});
    }
    await targetChannel.send(getPersistentHubPayload());

    return interaction.editReply({
      content: `${EMOJIS.SUCCESS} ${COMMON_MESSAGES.PERSISTENT_DEPLOYED_TO(targetChannel)}`,
      allowedMentions: { parse: [] },
    });
  }

  // Standard user flow: Ephemeral Team Hub Dashboard
  const payload = getHubPayload(interaction.user, interaction.member, capabilities);

  await interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral,
  });
}
