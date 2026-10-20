import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { requireCapability } from './srv_authorization.js';
import { eventContext, withEventLock } from './srv_events.js';
import { createTeamRoles, preflightTeamPermissions, assertSafeTeamAssignmentRoles, teamRoleNames, buildTeamChannelOverwrites, CORE_DENIED_PERMISSIONS } from './srv_roles.js';

async function authorize(ctx) {
  const scoped = eventContext(ctx);
  await ctx.guild.roles.fetch();
  const actor = await ctx.guild.members.fetch({ user: ctx.actor.id, force: true });
  requireCapability({ ...ctx, actor, config: undefined }, 'events.manage', { eventId: ctx.eventId });
  return scoped;
}
function locate(store, guildId, eventId, teamId, { allowArchived = false, allowCleanup = false, allowRepair = false } = {}) {
  const event = store.getEventById(eventId, guildId);
  if (!event) throw new Error('Event not found in this server.');
  if (!allowArchived && event.status !== 'ACTIVE') throw new Error('This event is archived. Reactivate it before changing its teams.');
  const team = teamId ? event.teams.find((item) => item.id === teamId) : null;
  if (teamId && !team) throw new Error('Team not found in this event.');
  if (team && !allowCleanup && team.cleanupStatus === 'PENDING') throw new Error('Team cleanup is pending; retry cleanup before editing.');
  if (team && !allowRepair && (['REPAIR_REQUIRED', 'PROVISIONING'].includes(team.provisioningStatus) || ['PREPARED', 'REPAIR_REQUIRED'].includes(team.rosterOperation?.status) || team.repairOperation?.status === 'PREPARED')) throw new Error('This team has an unresolved operation. Review and confirm team repair first.');
  return { event, team };
}
const uniqueUsers = (values) => {
  if (!Array.isArray(values) || values.some((id) => typeof id !== 'string' || !id)) throw new Error('Invalid member selection.');
  return [...new Set(values)];
};
const isMissing = (error) => [10003, 10011].includes(error?.code);
async function fetchChannel(guild, id) {
  try { return await guild.channels.fetch(id, { force: true }); }
  catch (error) { if (error.code === 10003) return null; throw error; }
}
async function fetchTeamRole(guild, id) {
  if (!id) return null;
  try { return await guild.roles.fetch(id, { force: true }); }
  catch (error) { if (error.code === 10011) return null; throw error; }
}
function operationUsers(operation) {
  const users = [];
  for (let current = operation; current; current = current.previousOperation) users.push(...(current.userIds ?? []), current.userId);
  return users.filter(Boolean);
}

export async function createTeamWithRoles(ctx) {
  const { store, guildId } = await authorize(ctx);
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event } = locate(store, guildId, ctx.eventId);
    await preflightTeamPermissions(ctx.guild);
    const number = ctx.number ?? Math.max(0, event.lastTeamNumber ?? 0, ...event.teams.map((team) => team.number)) + 1;
    teamRoleNames(event.name, number);
    if (!Number.isSafeInteger(number) || number < 1 || event.teams.some((team) => team.number === number)) throw new Error('Team number must be unique and positive.');
    if (ctx.name && (!ctx.name.trim() || ctx.name.length > 80)) throw new Error('Team names must contain 1–80 characters.');
    const team = store.addTeam(event.id, { name: ctx.name, number, provisioningStatus: 'PROVISIONING', operationId: randomUUID(), updatedBy: ctx.actor.id }, guildId);
    try {
      const roles = await createTeamRoles(ctx.guild, event.name, number, { onCreated: (field, id) => { store.updateTeam(event.id, team.id, { [field]: id }, guildId); } });
      return store.updateTeam(event.id, team.id, { memberRoleId: roles.memberRole.id, mentorRoleId: roles.mentorRole.id, provisioningStatus: 'READY', operationId: null }, guildId);
    } catch (error) {
      const saved = store.getEventById(event.id, guildId)?.teams.find((item) => item.id === team.id);
      const remaining = error.remainingRoleIds ?? [saved?.memberRoleId, saved?.mentorRoleId].filter(Boolean);
      // A final local-write failure occurs after role creation returned; compensate those roles too.
      if (!error.remainingRoleIds) {
        for (const id of [...remaining]) {
          try { await ctx.guild.roles.delete(id, 'Rollback incomplete team creation'); remaining.splice(remaining.indexOf(id), 1); } catch {}
        }
      }
      try {
        if (!remaining.length) store.deleteTeam(event.id, team.id, guildId);
        else store.updateTeam(event.id, team.id, { provisioningStatus: 'REPAIR_REQUIRED', cleanupStatus: 'PENDING', repairResources: remaining, lastError: 'Team provisioning incomplete' }, guildId);
      } catch { error.repairRequired = true; }
      throw error;
    }
  });
}

function resourceReferences(team) {
  const result = [];
  for (const field of ['memberRoleId', 'mentorRoleId']) if (team[field]) result.push({ type: 'role', field, id: team[field] });
  const channelIds = new Set([team.textChannelId, team.voiceChannelId, ...Object.values(team.channels ?? {}), team.categoryId].filter(Boolean));
  for (const item of team.channelRepair ?? []) if (item.id) channelIds.add(item.id);
  for (const id of channelIds) result.push({ type: 'channel', id });
  for (const id of team.repairResources ?? []) if (!result.some((item) => item.id === id)) result.push({ type: 'role', id });
  return result;
}
export function getTeamDeletionImpact(ctx) {
  const { store, guildId } = eventContext(ctx);
  requireCapability({ ...ctx, config: undefined }, 'events.manage', { eventId: ctx.eventId });
  const { event, team } = locate(store, guildId, ctx.eventId, ctx.teamId, { allowArchived: true, allowCleanup: true, allowRepair: true });
  return { event, team, memberCount: team.members.length, mentorCount: team.mentors.length, resources: resourceReferences(team).map((resource) => ({ ...resource, name: (resource.type === 'role' ? ctx.guild.roles.cache?.get(resource.id)?.name : ctx.guild.channels.cache?.get(resource.id)?.name) ?? resource.id })) };
}
export async function removeTeamWithRoles(ctx) {
  const { store, guildId } = await authorize(ctx);
  if (!ctx.confirmed) throw new Error('Review the team deletion impact and confirm first.');
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event, team } = locate(store, guildId, ctx.eventId, ctx.teamId, { allowArchived: true, allowCleanup: true, allowRepair: true });
    if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== JSON.stringify(team)) throw new Error('The team changed after this preview. Review its current impact and confirm again.');
    const resources = team.cleanupResources ?? resourceReferences(team);
    await preflightTeamPermissions(ctx.guild, { channels: resources.some((item) => item.type === 'channel') });
    store.updateTeam(event.id, team.id, { cleanupStatus: 'PENDING', cleanupResources: resources, cleanupStartedBy: ctx.actor.id }, guildId);
    const failedResources = [];
    const deletedResources = [];
    for (const resource of resources) {
      try {
        if (resource.type === 'role') {
          const role = await ctx.guild.roles.fetch(resource.id, { force: true });
          if (role) {
            await preflightTeamPermissions(ctx.guild, { roleIds: [resource.id] });
            await ctx.guild.roles.delete(resource.id, 'Confirmed team deletion');
          }
        } else {
          const channel = await fetchChannel(ctx.guild, resource.id);
          if (channel) await channel.delete('Confirmed team deletion');
        }
        deletedResources.push(resource);
      } catch (error) {
        if (isMissing(error)) deletedResources.push(resource);
        else failedResources.push({ ...resource, error: 'Discord cleanup failed; check permissions and retry.' });
      }
      // Keep a durable retry list, including work not yet attempted if interrupted.
      const pending = resources.filter((item) => !deletedResources.some((deleted) => deleted.id === item.id));
      store.updateTeam(event.id, team.id, { cleanupResources: pending }, guildId);
    }
    if (failedResources.length) {
      store.updateTeam(event.id, team.id, { cleanupStatus: 'PENDING', cleanupResources: failedResources }, guildId);
      return { team, deleted: false, failedResources, deletedResources };
    }
    store.deleteTeam(event.id, team.id, guildId);
    return { team, deleted: true, failedResources: [], deletedResources };
  });
}

/** Add or remove only successful Discord assignments. Local-write failures compensate role changes. */
async function changeRoster(ctx, type, remove = false) {
  const { store, guildId } = await authorize(ctx);
  if (!['members', 'mentors'].includes(type)) throw new Error('Unknown team assignment type.');
  const userIds = uniqueUsers(ctx.userIds ?? []);
  if (remove && !ctx.confirmed) throw new Error('Confirm removal of team access first.');
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event, team } = locate(store, guildId, ctx.eventId, ctx.teamId, { allowRepair: remove, allowCleanup: remove });
    if (remove && team.cleanupStartedBy) throw new Error('This team is pending confirmed deletion. Retry its cleanup first.');
    const roleId = type === 'members' ? team.memberRoleId : team.mentorRoleId;
    const role = await fetchTeamRole(ctx.guild, roleId);
    if (!remove && (!role || team.provisioningStatus === 'REPAIR_REQUIRED')) throw new Error('Team roles need repair before assigning members.');
    if (role) await preflightTeamPermissions(ctx.guild, { roleIds: [roleId] });
    if (!remove) await assertSafeTeamAssignmentRoles(ctx.guild, { memberRoleId: team.memberRoleId, mentorRoleId: team.mentorRoleId, coreRoleId: event.coreRoleId, assignmentRoleIds: [roleId] });
    const previousOperation = ['PREPARED', 'REPAIR_REQUIRED'].includes(team.rosterOperation?.status) ? team.rosterOperation : null;
    const needsRepair = remove && (!role || team.provisioningStatus === 'REPAIR_REQUIRED' || team.provisioningStatus === 'PROVISIONING' || previousOperation || team.repairOperation || team.cleanupStatus === 'PENDING');
    const operation = { id: randomUUID(), type, remove, userIds, actorId: ctx.actor.id, status: 'PREPARED', createdAt: new Date().toISOString(), ...(previousOperation ? { previousOperation } : {}) };
    store.updateTeam(event.id, team.id, { rosterOperation: operation }, guildId);
    const successes = [];
    const failures = [];
    const changed = [];
    let departedCount = 0;
    let localOnlyCount = 0;
    for (const id of userIds) {
      if (!remove && type === 'members' && event.teams.some((other) => other.id !== team.id && other.members.includes(id))) {
        failures.push({ userId: id, code: 'MOVE_CONFIRMATION_REQUIRED' }); continue;
      }
      try {
        const member = await ctx.guild.members.fetch({ user: id, force: true });
        if (!member) throw new Error('Member left the server.');
        const hasRole = role && (member.roles.cache?.has(roleId) ?? team[type].includes(id));
        if (role && (remove ? hasRole : !hasRole)) {
          await member.roles[remove ? 'remove' : 'add'](roleId);
          changed.push({ member, roleId });
        }
        if (remove && !role) localOnlyCount += 1;
        successes.push(id);
      } catch (error) {
        if (remove && error.code === 10007) { successes.push(id); departedCount += 1; localOnlyCount += 1; }
        else failures.push({ userId: id, code: 'DISCORD_SYNC_FAILED' });
      }
    }
    try {
      const roster = remove ? team[type].filter((id) => !successes.includes(id)) : [...new Set([...team[type], ...successes])];
      const updated = store.updateTeam(event.id, team.id, { [type]: roster, rosterOperation: previousOperation, ...(needsRepair ? { provisioningStatus: 'REPAIR_REQUIRED' } : {}), updatedBy: ctx.actor.id }, guildId);
      return { team: updated, successCount: successes.length, failedCount: failures.length, failures, departedCount, localOnlyCount };
    } catch (error) {
      const repair = [];
      for (const { member, roleId } of changed.reverse()) {
        try { await member.roles[remove ? 'add' : 'remove'](roleId); } catch { repair.push({ userId: member.id, roleId }); }
      }
      try { store.updateTeam(event.id, team.id, { ...(repair.length ? { provisioningStatus: 'REPAIR_REQUIRED', rosterRepair: repair } : {}), rosterOperation: { ...operation, status: repair.length ? 'REPAIR_REQUIRED' : 'ROLLED_BACK' } }, guildId); } catch {}
      throw error;
    }
  });
}
export function assignMembersWithRoles(ctx) { return changeRoster(ctx, 'members'); }
export function assignMentorsWithRoles(ctx) { return changeRoster(ctx, 'mentors'); }
export function removeRosterWithRoles(ctx) { return changeRoster(ctx, ctx.type, true); }
export function assignRosterWithRoles(ctx) { return changeRoster(ctx, ctx.type); }

export async function moveMemberWithRoles(ctx) {
  const { store, guildId } = await authorize(ctx);
  if (!ctx.confirmed) throw new Error('Confirm the move and access removal first.');
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event, team: destination } = locate(store, guildId, ctx.eventId, ctx.teamId);
    const source = event.teams.find((item) => item.id === ctx.sourceTeamId);
    if (!source || source.id === destination.id) throw new Error('Select a different source team in this event.');
    if (!source.members.includes(ctx.userId)) throw new Error('This member no longer belongs to the source team.');
    if (source.cleanupStatus === 'PENDING' || source.provisioningStatus === 'REPAIR_REQUIRED' || ['PREPARED', 'REPAIR_REQUIRED'].includes(source.rosterOperation?.status)) throw new Error('Source team cleanup or repair is pending.');
    const roleIds = [source.memberRoleId, destination.memberRoleId];
    if (roleIds.some((id) => !id)) throw new Error('Both teams need valid membership roles.');
    await preflightTeamPermissions(ctx.guild, { roleIds });
    await assertSafeTeamAssignmentRoles(ctx.guild, { memberRoleId: destination.memberRoleId, mentorRoleId: destination.mentorRoleId, coreRoleId: event.coreRoleId, assignmentRoleIds: [destination.memberRoleId] });
    const member = await ctx.guild.members.fetch({ user: ctx.userId, force: true });
    if (!member) throw new Error('Member left the server.');
    const hadDestinationRole = member.roles.cache?.has(destination.memberRoleId) ?? false;
    const hadSourceRole = member.roles.cache?.has(source.memberRoleId) ?? true;
    const operation = { id: randomUUID(), type: 'MOVE', userId: member.id, sourceTeamId: source.id, destinationTeamId: destination.id, actorId: ctx.actor.id, status: 'PREPARED', createdAt: new Date().toISOString() };
    store.transaction((draft) => {
      const current = draft.events.find((item) => item.id === event.id && item.guildId === guildId);
      for (const item of current.teams.filter((item) => [source.id, destination.id].includes(item.id))) item.rosterOperation = operation;
    });
    let granted = false; let removed = false;
    try {
      if (!hadDestinationRole) { await member.roles.add(destination.memberRoleId); granted = true; }
      if (hadSourceRole) { await member.roles.remove(source.memberRoleId); removed = true; }
      store.transaction((draft) => {
        const current = draft.events.find((item) => item.id === event.id && item.guildId === guildId);
        const from = current.teams.find((item) => item.id === source.id);
        const to = current.teams.find((item) => item.id === destination.id);
        from.members = from.members.filter((id) => id !== member.id);
        to.members = [...new Set([...to.members, member.id])];
        from.rosterOperation = to.rosterOperation = null;
        from.updatedBy = to.updatedBy = ctx.actor.id;
      });
      return { sourceTeamId: source.id, team: store.getEventById(event.id, guildId).teams.find((item) => item.id === destination.id) };
    } catch (error) {
      const repair = [];
      if (removed) { try { await member.roles.add(source.memberRoleId); } catch { repair.push(source.memberRoleId); } }
      if (granted) { try { await member.roles.remove(destination.memberRoleId); } catch { repair.push(destination.memberRoleId); } }
      try {
        store.transaction((draft) => {
          const current = draft.events.find((item) => item.id === event.id && item.guildId === guildId);
          for (const item of current.teams.filter((item) => [source.id, destination.id].includes(item.id))) {
            item.rosterOperation = { ...operation, status: repair.length ? 'REPAIR_REQUIRED' : 'ROLLED_BACK' };
            if (repair.length) { item.provisioningStatus = 'REPAIR_REQUIRED'; item.rosterRepair = [{ userId: member.id, roles: repair }]; }
          }
        });
      } catch {}
      throw error;
    }
  });
}

export async function editTeamWithRoles(ctx) {
  const { store, guildId } = await authorize(ctx);
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event, team } = locate(store, guildId, ctx.eventId, ctx.teamId);
    const name = String(ctx.name ?? team.name).trim();
    const number = ctx.number ?? team.number;
    if (!name || name.length > 80 || !Number.isSafeInteger(number) || number < 1 || event.teams.some((item) => item.id !== team.id && item.number === number)) throw new Error('Provide a valid team name and unique positive number.');
    const names = teamRoleNames(event.name, number);
    await preflightTeamPermissions(ctx.guild, { roleIds: [team.memberRoleId, team.mentorRoleId], channels: !!(team.textChannelId || team.voiceChannelId || team.categoryId || Object.values(team.channels ?? {}).length) });
    const changed = [];
    try {
      for (const [field, key] of [['memberRoleId', 'member'], ['mentorRoleId', 'mentor']]) {
        if (!team[field]) continue;
        const resource = await ctx.guild.roles.fetch(team[field], { force: true });
        const oldName = resource.name; await resource.edit({ name: names[key] }); changed.push({ resource, oldName });
      }
      const references = new Map(Object.entries(team.channels ?? {}).map(([key, id]) => [id, key]));
      if (team.textChannelId) references.set(team.textChannelId, 'chat');
      if (team.voiceChannelId) references.set(team.voiceChannelId, 'voice');
      if (team.categoryId) references.set(team.categoryId, 'category');
      for (const [channelId, suffix] of references) {
        const resource = await fetchChannel(ctx.guild, channelId);
        if (!resource) throw new Error('Stored team channel is missing.');
        const oldName = resource.name;
        await resource.edit({ name: `${channelName(event.name, number, name, false).replace(/-chat$/, '')}-${suffix}`.slice(0, 100) }); changed.push({ resource, oldName });
      }
      return store.updateTeam(event.id, team.id, { name, number, updatedBy: ctx.actor.id }, guildId);
    } catch (error) {
      const failed = [];
      for (const { resource, oldName } of changed.reverse()) { try { await resource.edit({ name: oldName }); } catch { failed.push(resource.id); } }
      if (failed.length) store.updateTeam(event.id, team.id, { provisioningStatus: 'REPAIR_REQUIRED', renameRepair: failed }, guildId);
      throw error;
    }
  });
}
function channelName(eventName, number, name, voice = false) {
  return `${eventName}-team-${String(number).padStart(2, '0')}-${name}-${voice ? 'voice' : 'chat'}`.normalize('NFKD').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').toLowerCase().slice(0, 100);
}
export async function createTeamChannels(ctx) {
  const { store, guildId } = await authorize(ctx);
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event, team } = locate(store, guildId, ctx.eventId, ctx.teamId);
    const bot = await preflightTeamPermissions(ctx.guild, { channels: true, roleIds: [team.memberRoleId, team.mentorRoleId] });
    if (!team.memberRoleId || !team.mentorRoleId) throw new Error('Provision team roles before creating channels.');
    // CORE is an access policy binding, separate from the management capability mapping.
    const { clubStore } = await import('../data/json_club.js');
    const config = clubStore.snapshot().guilds.find((item) => item.guildId === guildId) ?? {};
    const coreRoleIds = [...new Set([event.coreRoleId, config.coreRoleId, ...(config.coreRoleIds ?? [])].filter(Boolean))];
    if (!coreRoleIds.length) throw new Error('Configure a trusted CORE view-only role before creating team channels.');
    for (const id of coreRoleIds) if (!await ctx.guild.roles.fetch(id, { force: true })) throw new Error('Configured CORE role is missing.');
    const overwrites = buildTeamChannelOverwrites({ everyoneRoleId: guildId, coreRoleIds, memberRoleId: team.memberRoleId, mentorRoleId: team.mentorRoleId, botMemberId: bot.id });
    const created = [];
    const changes = {};
    try {
      store.updateTeam(event.id, team.id, { provisioningStatus: 'CHANNELS_PROVISIONING' }, guildId);
      for (const [field, type] of [['textChannelId', ChannelType.GuildText], ...(ctx.voice ? [['voiceChannelId', ChannelType.GuildVoice]] : [])]) {
        const existingId = team[field] ?? (field === 'textChannelId' ? team.channels?.chat : team.channels?.room);
        let channel;
        if (existingId) {
          channel = await fetchChannel(ctx.guild, existingId);
          if (!channel) throw new Error('A stored channel is missing. Review and repair its reference before creating another.');
          if (channel.guildId && channel.guildId !== guildId) throw new Error('Stored channel belongs to another guild.');
          if (channel.type !== undefined && channel.type !== type) throw new Error('Stored channel has an unexpected type.');
        } else {
          channel = await ctx.guild.channels.create({ name: channelName(event.name, team.number, team.name, field === 'voiceChannelId'), type, permissionOverwrites: overwrites, reason: 'Explicit private team channel creation' });
          created.push({ field, channel });
        }
        changes[field] = channel.id;
        store.updateTeam(event.id, team.id, { [field]: channel.id }, guildId);
      }
      const conflicts = [];
      for (const member of ctx.guild.members.cache?.values() ?? []) {
        if (coreRoleIds.some((id) => member.roles.cache?.has(id)) && [team.memberRoleId, team.mentorRoleId].some((id) => member.roles.cache?.has(id))) conflicts.push({ userId: member.id, code: 'CORE_TEAM_ROLE_ALLOW_CONFLICT' });
      }
      // Also detect unexpected explicit grants on reused channels; do not silently rewrite existing resources.
      for (const id of Object.values(changes)) {
        const channel = await fetchChannel(ctx.guild, id);
        for (const overwrite of channel.permissionOverwrites?.cache?.values() ?? []) {
          if (![guildId, bot.id, team.memberRoleId, team.mentorRoleId].includes(overwrite.id) && CORE_DENIED_PERMISSIONS.some((permission) => overwrite.allow?.has(permission))) conflicts.push({ channelId: id, roleId: overwrite.id, code: 'CHANNEL_ALLOW_CONFLICT' });
        }
      }
      const updated = store.updateTeam(event.id, team.id, { ...changes, provisioningStatus: 'READY', channelWarnings: conflicts, updatedBy: ctx.actor.id }, guildId);
      return { team: updated, conflicts, createdCount: created.length };
    } catch (error) {
      const remaining = [];
      for (const { field, channel } of created.reverse()) {
        try { await channel.delete('Rollback incomplete channel creation'); changes[field] = null; }
        catch { remaining.push({ field, id: channel.id }); }
      }
      try { store.updateTeam(event.id, team.id, { ...changes, provisioningStatus: remaining.length ? 'REPAIR_REQUIRED' : 'READY', channelRepair: remaining }, guildId); } catch { error.repairRequired = true; }
      throw error;
    }
  });
}

export function getMyTeams(ctx) {
  const { store, guildId } = eventContext(ctx);
  const result = [];
  for (const event of store.getAllEvents(guildId)) {
    for (const team of event.teams) {
      const member = team.members.includes(ctx.actor.id); const mentor = team.mentors.includes(ctx.actor.id);
      if (member || mentor) result.push({ eventId: event.id, eventName: event.name, eventStatus: event.status, team, member, mentor });
    }
  }
  return result;
}

/** Explicit confirmed reconciliation to the durable roster; never deletes pre-existing resources. */
export async function repairTeamWithRoles(ctx) {
  const { store, guildId } = await authorize(ctx);
  if (!ctx.confirmed) throw new Error('Review the role and channel repair impact and confirm first.');
  return withEventLock(ctx, ctx.eventId, async () => {
    const { event, team } = locate(store, guildId, ctx.eventId, ctx.teamId, { allowArchived: true, allowCleanup: true, allowRepair: true });
    if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== JSON.stringify(team)) throw new Error('The team changed after this preview. Review its current repair impact and confirm again.');
    if (team.cleanupStartedBy) throw new Error('This team is pending confirmed deletion. Retry cleanup instead of restoring its access.');
    const channelReferences = new Map(Object.entries(team.channels ?? {}).map(([key, id]) => [id, key]));
    if (team.textChannelId) channelReferences.set(team.textChannelId, 'chat');
    if (team.voiceChannelId) channelReferences.set(team.voiceChannelId, 'voice');
    if (team.categoryId) channelReferences.set(team.categoryId, 'category');
    const bot = await preflightTeamPermissions(ctx.guild, { channels: channelReferences.size > 0 });
    const { clubStore } = await import('../data/json_club.js');
    const config = clubStore.snapshot().guilds.find((item) => item.guildId === guildId) ?? {};
    const protectedRoles = new Set([...Object.values(config.trustedRoleIds ?? {}), ...Object.values(config.departmentRoleIds ?? {}), config.coreRoleId, event.coreRoleId].filter(Boolean));
    if ([team.memberRoleId, team.mentorRoleId].some((id) => protectedRoles.has(id))) throw new Error('A team role conflicts with a protected club role. Correct the binding before repair.');
    const operation = { id: randomUUID(), actorId: ctx.actor.id, status: 'PREPARED', createdAt: new Date().toISOString() };
    store.updateTeam(event.id, team.id, { repairOperation: operation, provisioningStatus: 'REPAIR_REQUIRED' }, guildId);
    const names = teamRoleNames(event.name, team.number);
    const created = [];
    const createdChannels = [];
    const rollback = [];
    const updates = {};
    let rosterChanges = 0;
    try {
      for (const [field, kind] of [['memberRoleId', 'member'], ['mentorRoleId', 'mentor']]) {
        let role = await fetchTeamRole(ctx.guild, team[field]);
        if (!role) {
          const matches = [...(ctx.guild.roles.cache?.values() ?? [])].filter((item) => item.id !== team[field] && item.name === names[kind]);
          if (matches.length) throw new Error('An unbound role already has the expected team name. Resolve that ambiguity before repair.');
          role = await ctx.guild.roles.create({ name: names[kind], color: kind === 'member' ? GOOGLE_COLORS.BLUE : GOOGLE_COLORS.YELLOW, permissions: [], hoist: kind === 'mentor', mentionable: false, reason: 'Confirmed team repair' });
          created.push(role.id);
          store.updateTeam(event.id, team.id, { [field]: role.id }, guildId);
        } else {
          await preflightTeamPermissions(ctx.guild, { roleIds: [role.id] });
          const before = { name: role.name, permissions: role.permissions?.bitfield ?? role.permissions ?? [], hoist: role.hoist, mentionable: role.mentionable, color: role.color };
          await role.edit({ name: names[kind], permissions: [], hoist: kind === 'mentor', mentionable: false, color: kind === 'member' ? GOOGLE_COLORS.BLUE : GOOGLE_COLORS.YELLOW });
          rollback.push(() => role.edit(before));
        }
        updates[field] = role.id;
      }
      const operationIds = [...operationUsers(team.rosterOperation), ...(team.rosterRepair ?? []).map((item) => item.userId)].filter(Boolean);
      const cachedRoleHolders = [...(ctx.guild.members.cache?.values() ?? [])].filter((member) => Object.values(updates).some((id) => member.roles.cache?.has(id))).map((member) => member.id);
      const users = new Set([...team.members, ...team.mentors, ...operationIds, ...cachedRoleHolders]);
      for (const userId of users) {
        let member;
        try { member = await ctx.guild.members.fetch({ user: userId, force: true }); }
        catch (error) {
          if (error.code === 10007 && !team.members.includes(userId) && !team.mentors.includes(userId)) continue;
          if (error.code === 10007) throw new Error('A stored team member has left this server. Explicitly remove that user from the roster, then retry repair.');
          throw error;
        }
        if (!member) throw new Error('A stored team member has left the server. Review the roster before retrying repair.');
        for (const [field, roleField] of [['members', 'memberRoleId'], ['mentors', 'mentorRoleId']]) {
          const roleId = updates[roleField];
          const desired = team[field].includes(userId);
          const actual = member.roles.cache?.has(roleId) ?? false;
          if (actual === desired) continue;
          await member.roles[desired ? 'add' : 'remove'](roleId);
          rollback.push(() => member.roles[desired ? 'remove' : 'add'](roleId));
          rosterChanges += 1;
        }
      }
      let overwrites;
      let mentorOverwrites;
      if (channelReferences.size) {
        const coreRoleIds = [...new Set([event.coreRoleId, config.coreRoleId, ...(config.coreRoleIds ?? [])].filter(Boolean))];
        if (!coreRoleIds.length) throw new Error('Configure a CORE role before repairing team channels.');
        for (const id of coreRoleIds) if (!await ctx.guild.roles.fetch(id, { force: true })) throw new Error('Configured CORE role is missing.');
        overwrites = buildTeamChannelOverwrites({ everyoneRoleId: guildId, coreRoleIds, ...updates, botMemberId: bot.id });
        mentorOverwrites = buildTeamChannelOverwrites({ everyoneRoleId: guildId, coreRoleIds, mentorRoleId: updates.mentorRoleId, botMemberId: bot.id });
      }
      const updatedLegacyChannels = { ...(team.channels ?? {}) };
      for (const [channelId, suffix] of [...channelReferences].sort((a, b) => Number(b[1] === 'category') - Number(a[1] === 'category'))) {
        let channel = await fetchChannel(ctx.guild, channelId);
        if (channel?.guildId && channel.guildId !== guildId) throw new Error('A stored team channel belongs to another server.');
        if (!channel) {
          const type = suffix === 'category' ? ChannelType.GuildCategory : /room|voice/i.test(suffix) ? ChannelType.GuildVoice : ChannelType.GuildText;
          channel = await ctx.guild.channels.create({ name: `${channelName(event.name, team.number, team.name, false).replace(/-chat$/, '')}-${suffix}`.slice(0, 100), type, permissionOverwrites: /mentor/i.test(suffix) ? mentorOverwrites : overwrites, ...(suffix !== 'category' && (updates.categoryId ?? team.categoryId) ? { parent: updates.categoryId ?? team.categoryId } : {}), reason: 'Confirmed repair of missing team channel' });
          createdChannels.push(channel);
          for (const field of ['textChannelId', 'voiceChannelId', 'categoryId']) if (team[field] === channelId) updates[field] = channel.id;
          for (const [key, id] of Object.entries(updatedLegacyChannels)) if (id === channelId) updatedLegacyChannels[key] = channel.id;
          if (Object.keys(updatedLegacyChannels).length) updates.channels = updatedLegacyChannels;
          store.updateTeam(event.id, team.id, updates, guildId);
          continue;
        }
        const oldName = channel.name;
        await channel.edit({ name: `${channelName(event.name, team.number, team.name, false).replace(/-chat$/, '')}-${suffix}`.slice(0, 100) });
        rollback.push(() => channel.edit({ name: oldName }));
        // Legacy mentor-only rooms preserve their specialized access; standard collaboration rooms use the shared policy.
        if (['chat', 'room', 'voice', 'category'].includes(suffix)) {
          const previous = [...(channel.permissionOverwrites.cache?.values() ?? [])].map((item) => ({ id: item.id, type: item.type, allow: item.allow.bitfield, deny: item.deny.bitfield }));
          await channel.permissionOverwrites.set(overwrites);
          rollback.push(() => channel.permissionOverwrites.set(previous));
        }
      }
      const repaired = store.updateTeam(event.id, team.id, { ...updates, provisioningStatus: 'READY', cleanupStatus: null, repairOperation: null, rosterOperation: null, rosterRepair: [], renameRepair: [], channelRepair: [], repairResources: [], updatedBy: ctx.actor.id }, guildId);
      return { team: repaired, repairedRoles: 2, rosterChanges, channelCount: channelReferences.size };
    } catch (error) {
      let compensationFailed = false;
      for (const undo of rollback.reverse()) { try { await undo(); } catch { compensationFailed = true; } }
      const remaining = [];
      const remainingChannels = [];
      for (const channel of createdChannels.reverse()) { try { await channel.delete('Rollback incomplete team repair'); } catch { remainingChannels.push({ id: channel.id }); } }
      for (const id of created.reverse()) { try { await ctx.guild.roles.delete(id, 'Rollback incomplete team repair'); } catch { remaining.push(id); } }
      try { store.updateTeam(event.id, team.id, { provisioningStatus: 'REPAIR_REQUIRED', repairOperation: { ...operation, status: 'REPAIR_REQUIRED' }, channelRepair: [...(team.channelRepair ?? []), ...remainingChannels], repairResources: [...new Set([...(team.repairResources ?? []), ...remaining])], lastError: compensationFailed ? 'Team repair and compensation incomplete' : 'Team repair incomplete' }, guildId); } catch { error.repairRequired = true; }
      throw error;
    }
  });
}
