import { MessageFlags } from 'discord.js';
import { getClubNoticePayload } from '../ui/view_club.js';

export const privateMessage = (interaction) => Boolean(interaction.message?.flags?.has?.(MessageFlags.Ephemeral));
export async function acknowledge(interaction) {
  if (interaction.deferred || interaction.replied) return;
  if (!interaction.isModalSubmit?.() && privateMessage(interaction)) await interaction.deferUpdate();
  else await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}
export async function respond(interaction, payload) {
  const safe = { content: '', ...payload, allowedMentions: { parse: [] } };
  if (interaction.deferred || interaction.replied) return interaction.editReply(safe);
  if (privateMessage(interaction) && !interaction.isModalSubmit?.()) return interaction.update(safe);
  return interaction.reply({ ...safe, flags: MessageFlags.Ephemeral });
}
export function interactionContext(interaction) {
  const guild = interaction.guild;
  const actor = interaction.member;
  if (!guild?.id || !actor?.id || actor.id !== interaction.user?.id || actor.guild?.id !== guild.id) {
    const error = new Error('Use this action in a server.'); error.code = 'GUILD_REQUIRED'; throw error;
  }
  return { guild, actor };
}
export async function reportInteractionError(interaction, error) {
  // Codes and exception class are enough for correlation; API responses can include secrets or user data.
  console.error('[INTERACTION]', { code: String(error?.code || 'OPERATION_FAILED').slice(0, 60), type: error?.name || 'Error' });
  const { INTERACTION_ERRORS } = await import('../messages/msg_interactions.js');
  const message = INTERACTION_ERRORS[error?.code] || INTERACTION_ERRORS.OPERATION_FAILED;
  const payload = getClubNoticePayload({ title: INTERACTION_ERRORS.TITLE, message, backAction: 'profile' });
  if (interaction.replied || interaction.deferred) return interaction.editReply({ content: '', ...payload }).catch(() => {});
  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
}
