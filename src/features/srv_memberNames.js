import { formatUserName } from '../utils/f_formatters.js';

/** Resolve only the identities a screen displays, without a full guild sync. */
export async function resolveMemberNames(guild, userIds = []) {
  const entries = await Promise.all([...new Set(userIds)].map(async (userId) => {
    const cached = guild.members.cache?.get(userId);
    const member = cached || await guild.members.fetch({ user: userId, force: true }).catch(() => null);
    const name = member?.guild?.id === guild.id
      ? member.displayName || member.user?.globalName || member.user?.username
      : undefined;
    return [userId, name || formatUserName(guild, userId)];
  }));
  return Object.fromEntries(entries);
}
