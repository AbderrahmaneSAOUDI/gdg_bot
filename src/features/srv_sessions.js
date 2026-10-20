import { randomUUID } from 'node:crypto';

/** Short-lived UI context only. Durable business operations live in the stores. */
export function createSessionStore({ ttl = 15 * 60_000, now = Date.now } = {}) {
  const sessions = new Map();
  return {
    put(ctx, value) {
      for (const [key, entry] of sessions) if (entry.expires <= now()) sessions.delete(key);
      const token = randomUUID().replaceAll('-', '').slice(0, 20);
      sessions.set(token, { guildId: ctx.guild.id, actorId: ctx.actor.id, value: structuredClone(value), expires: now() + ttl });
      return token;
    },
    get(ctx, token) {
      const entry = sessions.get(token);
      if (!entry || entry.expires <= now() || entry.guildId !== ctx.guild.id || entry.actorId !== ctx.actor.id) {
        const error = new Error('This screen has expired. Return Home and open it again.');
        error.code = 'SESSION_EXPIRED';
        throw error;
      }
      return structuredClone(entry.value);
    },
  };
}
export const uiSessions = createSessionStore();
