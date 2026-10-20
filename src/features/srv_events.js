import { eventsStore } from '../data/json_events.js';
import { assertGuildContext, requireCapability } from './srv_authorization.js';
import { teamRoleNames, preflightTeamPermissions, assertTeamRoleBindings } from './srv_roles.js';

const locks = new Map();
async function authorizeMutation(ctx, capability = 'events.manage') {
  eventContext(ctx);
  await ctx.guild.roles.fetch();
  const actor = await ctx.guild.members.fetch({ user: ctx.actor.id, force: true });
  requireCapability({ ...ctx, actor, config: undefined }, capability, { eventId: ctx.eventId });
}
/** Serialize Discord work and storage commits for each event, including roster operations. */
export async function withEventLock(ctx, eventId, work) {
  const key = `${(ctx.store ?? eventsStore).filePath}:${ctx.guild?.id}:${eventId}`;
  const previous = locks.get(key) ?? Promise.resolve();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  locks.set(key, pending);
  await previous.catch(() => {});
  try { await authorizeMutation(ctx); return await work(); }
  finally { release(); if (locks.get(key) === pending) locks.delete(key); }
}
export function eventContext(ctx) {
  assertGuildContext(ctx);
  for (const id of [ctx.eventId, ctx.teamId, ctx.sourceTeamId].filter((value) => value !== undefined)) {
    if (typeof id !== 'string' || !id || id.length > 100) throw new Error('Invalid event or team identifier.');
  }
  return { store: ctx.store ?? eventsStore, guildId: ctx.guild.id };
}
export function listEvents(ctx = {}) {
  const { store, guildId } = eventContext(ctx);
  return store.getAllEvents(guildId).filter((event) => ctx.includeArchived || event.status === 'ACTIVE');
}
export function getEvent(eventId, ctx = {}) {
  const { store, guildId } = eventContext(ctx);
  return store.getEventById(eventId, guildId);
}
export async function registerEvent(ctx) {
  const { store, guildId } = eventContext(ctx);
  await authorizeMutation(ctx);
  const name = String(ctx.name ?? '').trim();
  teamRoleNames(name, 1);
  if (!name || name.length > 75 || String(ctx.description ?? '').length > 1500) throw new Error('Provide an event name of 1–75 characters and description up to 1500 characters.');
  return store.createEvent({ guildId, name, description: ctx.description ?? '', status: 'ACTIVE', createdBy: ctx.actor.id });
}
export async function editEvent(ctx) {
  const { store, guildId } = eventContext(ctx);
  return withEventLock(ctx, ctx.eventId, async () => {
    const event = store.getEventById(ctx.eventId, guildId);
    if (!event) throw new Error('Event not found in this server.');
    const name = String(ctx.name ?? event.name).trim();
    if (!name || name.length > 75 || String(ctx.description ?? event.description).length > 1500) throw new Error('Invalid event name or description.');
    for (const team of event.teams) teamRoleNames(name, team.number);
    const changed = [];
    try {
      if (name !== event.name) {
        for (const team of event.teams) assertTeamRoleBindings(ctx.guild, { ...team, coreRoleId: event.coreRoleId });
        await preflightTeamPermissions(ctx.guild, { roleIds: event.teams.flatMap((team) => [team.memberRoleId, team.mentorRoleId]), channels: event.teams.some((team) => team.textChannelId || team.voiceChannelId || team.categoryId || Object.values(team.channels ?? {}).length) });
        for (const team of event.teams) {
          const names = teamRoleNames(name, team.number);
          for (const [field, key] of [['memberRoleId', 'member'], ['mentorRoleId', 'mentor']]) {
            if (!team[field]) continue;
            const role = await ctx.guild.roles.fetch(team[field], { force: true });
            const oldName = role.name;
            await role.edit({ name: names[key], reason: 'Explicit event edit' });
            changed.push({ resource: role, oldName });
          }
          const references = new Map(Object.entries(team.channels ?? {}).map(([key, id]) => [id, key]));
          if (team.textChannelId) references.set(team.textChannelId, 'chat');
          if (team.voiceChannelId) references.set(team.voiceChannelId, 'voice');
          if (team.categoryId) references.set(team.categoryId, 'category');
          for (const [channelId, suffix] of references) {
            const channel = await ctx.guild.channels.fetch(channelId);
            if (!channel) throw new Error('Stored team channel is missing; run setup diagnostics.');
            const oldName = channel.name;
            await channel.edit({ name: `${name}-team-${String(team.number).padStart(2, '0')}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100) });
            changed.push({ resource: channel, oldName });
          }
        }
      }
      return store.updateEvent(event.id, { name, description: ctx.description ?? event.description, updatedBy: ctx.actor.id }, guildId);
    } catch (error) {
      const failed = [];
      for (const { resource, oldName } of changed.reverse()) { try { await resource.edit({ name: oldName }); } catch { failed.push(resource.id); } }
      if (failed.length) store.updateEvent(event.id, { repairStatus: 'NAME_SYNC_REQUIRED', repairResources: failed }, guildId);
      throw error;
    }
  });
}
export async function archiveEvent(ctx) {
  const { store, guildId } = eventContext(ctx);
  if (!ctx.confirmed) throw new Error('Confirm the event archive operation first.');
  return withEventLock(ctx, ctx.eventId, async () => {
    const event = store.getEventById(ctx.eventId, guildId);
    if (!event) throw new Error('Event not found in this server.');
    if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== JSON.stringify(event)) throw new Error('The event changed after this preview. Review its current impact and confirm again.');
    return store.updateEvent(ctx.eventId, { status: ctx.archived === false ? 'ACTIVE' : 'ARCHIVED', updatedBy: ctx.actor.id }, guildId);
  });
}
/** Supported removal entry point now preserves the completed event record. */
export function removeEvent(ctx) { return archiveEvent(ctx); }
export async function bindLegacyEvents(ctx) {
  const { store, guildId } = eventContext(ctx);
  if (!ctx.confirmed) throw new Error('Confirm which server owns the legacy events first.');
  await authorizeMutation(ctx, 'setup.manage');
  return store.bindLegacyEvents(guildId);
}
