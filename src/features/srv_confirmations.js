/** Confirmed UI previews are scoped to the authenticated actor and guild, and expire. */
export function createConfirmationStore({ now = Date.now, ttl = 15 * 60_000 } = {}) {
  const previews = new Map();
  const key = (ctx, action, target) => `${ctx.guild.id}:${ctx.actor.id}:${action}:${target}`;
  return {
    preview(ctx, action, target, value) {
      for (const [id, entry] of previews) if (entry.expires <= now()) previews.delete(id);
      previews.set(key(ctx, action, target), { value: structuredClone(value), expires: now() + ttl });
    },
    verify(ctx, action, target, value) {
      const entry = previews.get(key(ctx, action, target));
      if (!entry || entry.expires <= now() || JSON.stringify(entry.value) !== JSON.stringify(value)) {
        const error = new Error('Confirmation expired or changed'); error.code = 'STALE_CONFIRMATION'; throw error;
      }
      previews.delete(key(ctx, action, target));
    },
    cancel(ctx, action, target) {
      if(target!==undefined)previews.delete(key(ctx,action,target));
      else for(const id of previews.keys())if(id.startsWith(`${ctx.guild.id}:${ctx.actor.id}:${action}:`))previews.delete(id);
    },
  };
}
export const confirmations = createConfirmationStore();
