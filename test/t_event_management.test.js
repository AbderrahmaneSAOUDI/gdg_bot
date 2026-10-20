import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ChannelType, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { createEventsStore } from '../src/data/json_events.js';
import { clubStore } from '../src/data/json_club.js';
import { inspectEventSetup } from '../src/features/srv_setupEvents.js';
import { registerEvent, editEvent, archiveEvent, listEvents, getEvent, bindLegacyEvents } from '../src/features/srv_events.js';
import { createTeamWithRoles, assignMembersWithRoles, assignMentorsWithRoles, assignRosterWithRoles, removeRosterWithRoles, moveMemberWithRoles, getTeamDeletionImpact, removeTeamWithRoles, createTeamChannels, editTeamWithRoles, repairTeamWithRoles, getMyTeams } from '../src/features/srv_teams.js';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gdg-event-management-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createEventsStore({ filePath: path.join(dir, 'events.json') });
  const roles = new Map(); const members = new Map(); const channels = new Map();
  const fail = { roleCreateAt: 0, roleDelete: new Set(), add: new Set(), remove: new Set(), channelDelete: new Set() };
  let roleCreates = 0; let channelCreates = 0;
  const guild = { id: 'guild-a', roles: {}, members: {}, channels: {} };
  const makeMember = (id, admin = false) => {
    const roleCache = new Map();
    const member = { id, guild, displayName: id, user: { bot: false }, permissions: { has: (permission) => admin && [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild].includes(permission) }, roles: { cache: roleCache, highest: { position: 100 }, async add(roleId) { if (fail.add.has(id)) throw new Error('Role add denied'); roleCache.set(roleId, roles.get(roleId)); }, async remove(roleId) { if (fail.remove.has(id) || fail.remove.has(`${id}:${roleId}`)) throw new Error('Role removal denied'); roleCache.delete(roleId); } } };
    members.set(id, member); return member;
  };
  const actor = makeMember('manager', true);
  const bot = makeMember('bot'); bot.permissions = { has: () => true };
  guild.members = { me: bot, cache: members, async fetch(input) { const id = typeof input === 'string' ? input : input.user; if (!members.has(id)) throw Object.assign(new Error('Unknown member'), { code: 10007 }); return members.get(id); } };
  guild.roles = { cache: roles, async fetch(id) { return id === undefined ? roles : roles.get(id) ?? null; }, async create(options) {
    roleCreates += 1; if (fail.roleCreateAt === roleCreates) throw new Error('Role creation denied');
    const role = { ...options, id: `role-${roleCreates}`, guild, position: 1, editable: true, managed: false, async edit(updates) { Object.assign(this, updates); return this; } };
    roles.set(role.id, role); return role;
  }, async delete(id) { if (fail.roleDelete.has(id)) throw new Error('Role deletion denied'); roles.delete(id); } };
  guild.channels = { cache: channels, async fetch(id) { return channels.get(id) ?? null; }, async create(options) {
    channelCreates += 1;
    const overwriteEntries = (values) => values.map((entry) => [entry.id, { ...entry, allow: new PermissionsBitField(entry.allow ?? []), deny: new PermissionsBitField(entry.deny ?? []) }]);
    const channel = { ...options, initialOverwrites: options.permissionOverwrites, id: `channel-${channelCreates}`, guild, guildId: guild.id, permissionsFor() { return { has: () => true }; }, permissionOverwrites: { cache: new Map(overwriteEntries(options.permissionOverwrites ?? [])), async set(values) { this.lastSet = values; this.cache = new Map(overwriteEntries(values)); } }, async edit(updates) { Object.assign(this, updates); return this; }, async delete() { if (fail.channelDelete.has(this.id)) throw new Error('Channel deletion denied'); channels.delete(this.id); } };
    channels.set(channel.id, channel); return channel;
  } };
  roles.set('core', { id: 'core', name: 'CORE', guild, position: 2 });
  const ctx = { guild, actor, store };
  return { ctx, store, guild, actor, roles, channels, members, fail, makeMember, getRoleCreates: () => roleCreates, getChannelCreates: () => channelCreates };
}
async function eventTeam(f) {
  const event = await registerEvent({ ...f.ctx, name: 'Test Event', description: 'Description' });
  const team = await createTeamWithRoles({ ...f.ctx, eventId: event.id });
  return { event, team, ctx: { ...f.ctx, eventId: event.id, teamId: team.id } };
}

test('Event storage preserves corrupt files, isolates snapshots, and retains legacy data until explicit binding', async (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.store.filePath, '{broken');
  assert.throws(() => f.store.getAllEvents(), /Original file preserved/);
  assert.throws(() => f.store.createEvent({ name: 'Overwrite attempt' }), /Original file preserved/);
  assert.equal(fs.readFileSync(f.store.filePath, 'utf8'), '{broken');
  const legacy = [{ id: 'legacy', name: 'Legacy Event', status: 'ACTIVE', customMetadata: { retained: true }, teams: [] }];
  const original = JSON.stringify(legacy);
  fs.writeFileSync(f.store.filePath, original);
  assert.equal(listEvents(f.ctx).length, 0);
  assert.equal(fs.readFileSync(f.store.filePath, 'utf8'), original);
  await assert.rejects(bindLegacyEvents(f.ctx), /Confirm/);
  assert.equal(await bindLegacyEvents({ ...f.ctx, confirmed: true }), 1);
  assert.equal(fs.readFileSync(`${f.store.filePath}.pre-v2.bak`, 'utf8'), original);
  const event = getEvent('legacy', f.ctx);
  event.customMetadata.retained = false;
  assert.equal(getEvent('legacy', f.ctx).customMetadata.retained, true);
  assert.equal(await bindLegacyEvents({ ...f.ctx, confirmed: true }), 0);
  assert.equal(createEventsStore({ filePath: f.store.filePath }).getEventById('legacy', f.guild.id).guildId, f.guild.id);
});

test('Live event services enforce current trusted guild capability and reject cross-guild IDs', async (t) => {
  const f = fixture(t);
  const member = f.makeMember('ordinary');
  member.permissions = { has: (permission) => permission === PermissionFlagsBits.ManageRoles };
  await assert.rejects(registerEvent({ ...f.ctx, actor: member, name: 'Unauthorized', config: { trustedRoleIds: { PRESIDENT: 'pretend' } } }), /authorize/);
  const event = await registerEvent({ ...f.ctx, name: 'Scoped' });
  const otherGuild = { ...f.guild, id: 'guild-b' };
  const otherActor = { ...f.actor, guild: otherGuild };
  const otherCtx = { ...f.ctx, guild: otherGuild, actor: otherActor };
  assert.equal(getEvent(event.id, otherCtx), null);
  await assert.rejects(createTeamWithRoles({ ...otherCtx, eventId: event.id }), /server/);
  assert.equal(f.store.getEventById(event.id, f.guild.id).teams.length, 0);
  await assert.rejects(registerEvent({ ...f.ctx, guild: null, name: 'DM' }), /server/);
  const staleActor = { ...f.actor };
  f.actor.permissions = { has: () => false };
  await assert.rejects(archiveEvent({ ...f.ctx, actor: staleActor, eventId: event.id, confirmed: true }), /authorize/);
});

test('Team numbering remains unique after deletion and role creation uses minimal guild permissions', async (t) => {
  const f = fixture(t); const { event, team, ctx } = await eventTeam(f);
  const second = await createTeamWithRoles({ ...f.ctx, eventId: event.id });
  assert.equal(second.number, 2);
  await assert.rejects(createTeamWithRoles({ ...f.ctx, eventId: event.id, number: 2 }), /unique/);
  assert.deepEqual(f.roles.get(team.memberRoleId).permissions, []);
  assert.equal(f.roles.get(team.mentorRoleId).hoist, true);
  assert.equal(f.roles.get(team.memberRoleId).name, 'Test Event - Team 01 - Member');
  await removeTeamWithRoles({ ...ctx, confirmed: true });
  const third = await createTeamWithRoles({ ...f.ctx, eventId: event.id });
  assert.equal(third.number, 3);
  const fourthAndFifth = await Promise.all([createTeamWithRoles({ ...f.ctx, eventId: event.id }), createTeamWithRoles({ ...f.ctx, eventId: event.id })]);
  assert.deepEqual(fourthAndFifth.map((item) => item.number), [4, 5]);
});

test('Failed second-role creation rolls back only newly created resources, retaining failed cleanup', async (t) => {
  const f = fixture(t);
  const event = await registerEvent({ ...f.ctx, name: 'Failure Event' });
  f.roles.set('preexisting', { id: 'preexisting' });
  f.fail.roleCreateAt = 2;
  await assert.rejects(createTeamWithRoles({ ...f.ctx, eventId: event.id }), /creation denied/);
  assert.equal(f.roles.has('role-1'), false);
  assert.equal(f.roles.has('preexisting'), true);
  assert.equal(f.store.getEventById(event.id, f.guild.id).teams.length, 0);
  f.fail.roleCreateAt = 4; f.fail.roleDelete.add('role-3');
  await assert.rejects(createTeamWithRoles({ ...f.ctx, eventId: event.id }), /creation denied/);
  const partial = f.store.getEventById(event.id, f.guild.id).teams[0];
  assert.equal(partial.provisioningStatus, 'REPAIR_REQUIRED');
  assert.equal(partial.cleanupStatus, 'PENDING');
  assert.ok(partial.repairResources.includes('role-3'));
});

test('Assignments deduplicate selections, persist successes only, and allow mentors across teams', async (t) => {
  const f = fixture(t); const { event, team, ctx } = await eventTeam(f);
  f.makeMember('good'); f.makeMember('bad'); f.fail.add.add('bad');
  const result = await assignMembersWithRoles({ ...ctx, userIds: ['good', 'good', 'bad', 'left-server'] });
  assert.equal(result.successCount, 1); assert.equal(result.failedCount, 2);
  assert.deepEqual(result.team.members, ['good']);
  const second = await createTeamWithRoles({ ...f.ctx, eventId: event.id });
  const collision = await assignMembersWithRoles({ ...ctx, teamId: second.id, userIds: ['good'] });
  assert.equal(collision.failedCount, 1); assert.equal(collision.failures[0].code, 'MOVE_CONFIRMATION_REQUIRED');
  await assignMentorsWithRoles({ ...ctx, userIds: ['good'] });
  await assignMentorsWithRoles({ ...ctx, teamId: second.id, userIds: ['good'] });
  assert.equal(getMyTeams({ ...f.ctx, actor: f.members.get('good') }).length, 2);
  await assert.rejects(assignRosterWithRoles({ ...ctx, type: 'evil', userIds: ['good'] }), /Unknown/);
  await assert.rejects(removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['good'] }), /Confirm/);
  const removed = await removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['good'], confirmed: true });
  assert.equal(removed.team.members.length, 0);
  assert.equal(f.members.get('good').roles.cache.has(team.memberRoleId), false);
  assert.equal(f.members.get('good').roles.cache.has(team.mentorRoleId), true);
});

test('A local assignment commit failure compensates the Discord grant', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('member');
  const original = f.store.updateTeam;
  f.store.updateTeam = (...args) => {
    if (args[2].members) throw new Error('Disk unavailable');
    return original(...args);
  };
  await assert.rejects(assignMembersWithRoles({ ...ctx, userIds: ['member'] }), /Disk unavailable/);
  f.store.updateTeam = original;
  assert.equal(f.members.get('member').roles.cache.has(team.memberRoleId), false);
  assert.deepEqual(f.store.getEventById(ctx.eventId, f.guild.id).teams[0].members, []);
});

test('Confirmed moves grant before revoke, compensate failures, and atomically persist both rosters', async (t) => {
  const f = fixture(t); const { event, team, ctx } = await eventTeam(f); f.makeMember('moving');
  const target = await createTeamWithRoles({ ...f.ctx, eventId: event.id });
  await assignMembersWithRoles({ ...ctx, userIds: ['moving'] });
  const move = { ...ctx, teamId: target.id, sourceTeamId: team.id, userId: 'moving' };
  await assert.rejects(moveMemberWithRoles(move), /Confirm/);
  f.fail.remove.add(`moving:${team.memberRoleId}`);
  await assert.rejects(moveMemberWithRoles({ ...move, confirmed: true }), /removal denied/);
  assert.equal(f.members.get('moving').roles.cache.has(target.memberRoleId), false);
  assert.deepEqual(f.store.getEventById(event.id, f.guild.id).teams[0].members, ['moving']);
  f.fail.remove.clear();
  await moveMemberWithRoles({ ...move, confirmed: true });
  const saved = f.store.getEventById(event.id, f.guild.id);
  assert.deepEqual(saved.teams[0].members, []); assert.deepEqual(saved.teams[1].members, ['moving']);
  assert.equal(f.members.get('moving').roles.cache.has(team.memberRoleId), false);
});

test('Deletion is preview/confirm gated and preserves a durable retry list for partial cleanup', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  const impact = getTeamDeletionImpact(ctx);
  assert.equal(impact.resources.length, 2);
  assert.equal(impact.resources[0].name, 'Test Event - Team 01 - Member');
  await assert.rejects(removeTeamWithRoles(ctx), /confirm first/);
  assert.equal(f.roles.has(team.memberRoleId), true);
  f.fail.roleDelete.add(team.mentorRoleId);
  const partial = await removeTeamWithRoles({ ...ctx, confirmed: true });
  assert.equal(partial.deleted, false); assert.equal(partial.failedResources.length, 1);
  const saved = f.store.getEventById(ctx.eventId, f.guild.id).teams[0];
  assert.equal(saved.cleanupStatus, 'PENDING'); assert.equal(saved.cleanupResources.length, 1);
  f.fail.roleDelete.clear();
  const final = await removeTeamWithRoles({ ...ctx, confirmed: true });
  assert.equal(final.deleted, true); assert.equal(f.store.getEventById(ctx.eventId, f.guild.id).teams.length, 0);
});

test('Explicit private channel creation is idempotent and includes bot/CORE access policy', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  assert.equal(f.getChannelCreates(), 0);
  f.store.updateEvent(ctx.eventId, { coreRoleId: 'core' }, f.guild.id);
  f.makeMember('core-team').roles.cache.set('core', f.roles.get('core'));
  f.members.get('core-team').roles.cache.set(team.memberRoleId, f.roles.get(team.memberRoleId));
  const created = await createTeamChannels({ ...ctx, voice: true });
  assert.equal(created.createdCount, 2); assert.equal(created.conflicts.length, 1);
  const channel = f.channels.get(created.team.textChannelId);
  const policy = channel.initialOverwrites;
  assert.deepEqual(policy.find((entry) => entry.id === f.guild.id).deny, [PermissionFlagsBits.ViewChannel]);
  const core = policy.find((entry) => entry.id === 'core');
  assert.ok(core.allow.includes(PermissionFlagsBits.ReadMessageHistory));
  for (const permission of ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads', 'SendMessagesInThreads', 'Speak']) assert.ok(core.deny.includes(PermissionFlagsBits[permission]));
  assert.equal(policy.find((entry) => entry.id === 'bot').type, 1);
  const second = await createTeamChannels({ ...ctx, voice: true });
  assert.equal(second.createdCount, 0); assert.equal(f.getChannelCreates(), 2);
  assert.equal(second.team.textChannelId, created.team.textChannelId);
  assert.ok(created.team.voiceChannelId);
});

test('Event/team edits synchronize managed role names and archive preserves completed records', async (t) => {
  const f = fixture(t); const { event, team, ctx } = await eventTeam(f);
  await editTeamWithRoles({ ...ctx, name: 'Builders', number: 7 });
  assert.equal(f.roles.get(team.memberRoleId).name, 'Test Event - Team 07 - Member');
  await editEvent({ ...ctx, name: 'Renamed Event', description: 'Updated' });
  assert.equal(f.roles.get(team.mentorRoleId).name, 'Renamed Event - Team 07 - Mentor');
  await archiveEvent({ ...ctx, confirmed: true });
  assert.equal(listEvents(f.ctx).length, 0);
  assert.equal(listEvents({ ...f.ctx, includeArchived: true }).length, 1);
  assert.equal(getEvent(event.id, f.ctx).teams[0].name, 'Builders');
  await assert.rejects(createTeamWithRoles({ ...f.ctx, eventId: event.id }), /archived/);
  await archiveEvent({ ...ctx, archived: false, confirmed: true });
  assert.equal(listEvents(f.ctx).length, 1);
});

test('Atomic event replacement failures preserve the last valid snapshot and remove temporary files', (t) => {
  const f = fixture(t);
  f.store.createEvent({ id: 'kept', guildId: f.guild.id, name: 'Kept' });
  const before = fs.readFileSync(f.store.filePath, 'utf8');
  const failing = createEventsStore({ filePath: f.store.filePath, fileSystem: { ...fs, renameSync() { throw new Error('Disk replacement failed'); } } });
  assert.throws(() => failing.createEvent({ name: 'Lost' }), /previous snapshot preserved/);
  assert.equal(fs.readFileSync(f.store.filePath, 'utf8'), before);
  assert.equal(fs.readdirSync(path.dirname(f.store.filePath)).some((name) => name.endsWith('.tmp')), false);
});

test('Confirmed repair recovers interrupted roster changes from the durable operation journal', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  const member = f.makeMember('interrupted');
  await member.roles.add(team.memberRoleId);
  f.store.updateTeam(ctx.eventId, team.id, { rosterOperation: { status: 'PREPARED', type: 'members', userIds: [member.id] } }, f.guild.id);
  await assert.rejects(repairTeamWithRoles(ctx), /confirm first/);
  assert.equal(member.roles.cache.has(team.memberRoleId), true);
  const result = await repairTeamWithRoles({ ...ctx, confirmed: true });
  assert.equal(result.rosterChanges, 1);
  assert.equal(member.roles.cache.has(team.memberRoleId), false);
  assert.equal(result.team.rosterOperation, null);
  assert.deepEqual(result.team.members, []);
  assert.equal(result.team.provisioningStatus, 'READY');
});

test('Confirmed repair reuses surviving provisioned roles and creates only the missing role', async (t) => {
  const f = fixture(t); const event = await registerEvent({ ...f.ctx, name: 'Repair Event' });
  f.fail.roleCreateAt = 2; f.fail.roleDelete.add('role-1');
  await assert.rejects(createTeamWithRoles({ ...f.ctx, eventId: event.id }), /creation denied/);
  const partial = f.store.getEventById(event.id, f.guild.id).teams[0];
  const result = await repairTeamWithRoles({ ...f.ctx, eventId: event.id, teamId: partial.id, confirmed: true });
  assert.equal(result.team.memberRoleId, 'role-1');
  assert.equal(result.team.mentorRoleId, 'role-3');
  assert.equal(f.getRoleCreates(), 3);
  assert.equal(result.team.cleanupStatus, null);
  assert.equal(result.team.provisioningStatus, 'READY');
});

test('Confirmed repair recreates a missing stored channel and reuses accessible channels', async (t) => {
  const f = fixture(t); const { ctx } = await eventTeam(f);
  f.store.updateEvent(ctx.eventId, { coreRoleId: 'core' }, f.guild.id);
  const provisioned = await createTeamChannels({ ...ctx, voice: true });
  const originalTextId = provisioned.team.textChannelId;
  const originalVoiceId = provisioned.team.voiceChannelId;
  f.channels.delete(originalTextId);
  const repaired = await repairTeamWithRoles({ ...ctx, confirmed: true });
  assert.notEqual(repaired.team.textChannelId, originalTextId);
  assert.equal(repaired.team.voiceChannelId, originalVoiceId);
  assert.equal(f.getChannelCreates(), 3);
  assert.ok(f.channels.get(originalVoiceId).permissionOverwrites.lastSet.some((item) => item.id === 'core'));
  assert.ok(f.channels.get(repaired.team.textChannelId).initialOverwrites.some((item) => item.id === 'core'));
});

test('Deletion rejects a stale reviewed team version inside the mutation lock before Discord cleanup', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  const preview = getTeamDeletionImpact(ctx);
  f.makeMember('new-member');
  await assignMembersWithRoles({ ...ctx, userIds: ['new-member'] });
  await assert.rejects(removeTeamWithRoles({ ...ctx, confirmed: true, expectedVersion: JSON.stringify(preview.team) }), /changed after this preview/);
  assert.equal(f.roles.has(team.memberRoleId), true);
  assert.equal(f.store.getEventById(ctx.eventId, f.guild.id).teams.length, 1);
});

test('A queued team mutation rechecks a revoked manager after the preceding operation releases its lock', async (t) => {
  const f = fixture(t); const event = await registerEvent({ ...f.ctx, name: 'Queued' });
  const { withEventLock } = await import('../src/features/srv_events.js');
  let release; let signalStarted;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { signalStarted = resolve; });
  const holding = withEventLock(f.ctx, event.id, async () => { signalStarted(); await gate; });
  await started;
  const queued = createTeamWithRoles({ ...f.ctx, eventId: event.id });
  await new Promise(setImmediate);
  f.actor.permissions = { has: () => false };
  release(); await holding;
  await assert.rejects(queued, /authorize/);
  assert.equal(f.getRoleCreates(), 0);
  assert.equal(f.store.getEventById(event.id, f.guild.id).teams.length, 0);
});

test('Explicit roster removal clears departed users during repair while preserving unresolved journals', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  f.makeMember('departed');
  await assignMembersWithRoles({ ...ctx, userIds: ['departed'] });
  const journal = { id: 'interrupted', type: 'members', userIds: ['departed'], status: 'PREPARED' };
  f.store.updateTeam(ctx.eventId, team.id, { provisioningStatus: 'REPAIR_REQUIRED', rosterOperation: journal }, f.guild.id);
  f.members.delete('departed');
  await assert.rejects(repairTeamWithRoles({ ...ctx, confirmed: true }), /Explicitly remove/);
  const removed = await removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['departed'], confirmed: true });
  assert.equal(removed.successCount, 1); assert.equal(removed.failedCount, 0); assert.equal(removed.departedCount, 1);
  assert.deepEqual(removed.team.members, []);
  assert.equal(removed.team.provisioningStatus, 'REPAIR_REQUIRED');
  assert.deepEqual(removed.team.rosterOperation, journal);
  const repaired = await repairTeamWithRoles({ ...ctx, confirmed: true });
  assert.equal(repaired.team.provisioningStatus, 'READY');
  assert.equal(repaired.team.rosterOperation, null);
});

test('Roster removal tolerates positively missing roles but never treats unknown fetch failures as departure', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  f.makeMember('present'); f.makeMember('temporarily-unavailable');
  await assignMembersWithRoles({ ...ctx, userIds: ['present', 'temporarily-unavailable'] });
  f.roles.delete(team.memberRoleId);
  const roleFetch = f.guild.roles.fetch;
  f.guild.roles.fetch = async (id, options) => {
    if (id === team.memberRoleId) throw Object.assign(new Error('Unknown role'), { code: 10011 });
    return roleFetch(id, options);
  };
  const memberFetch = f.guild.members.fetch;
  f.guild.members.fetch = async (input) => {
    if (input.user === 'temporarily-unavailable') throw Object.assign(new Error('Discord unavailable'), { code: 50013 });
    return memberFetch(input);
  };
  const result = await removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['present', 'temporarily-unavailable'], confirmed: true });
  assert.equal(result.successCount, 1); assert.equal(result.failedCount, 1); assert.equal(result.departedCount, 0); assert.equal(result.localOnlyCount, 1);
  assert.deepEqual(result.team.members, ['temporarily-unavailable']);
  assert.equal(result.team.provisioningStatus, 'REPAIR_REQUIRED');
  f.guild.members.fetch = memberFetch;
  const repaired = await repairTeamWithRoles({ ...ctx, confirmed: true });
  assert.notEqual(repaired.team.memberRoleId, team.memberRoleId);
  assert.ok(f.members.get('temporarily-unavailable').roles.cache.has(repaired.team.memberRoleId));
});

test('Assignments reject unsafe team permissions and protected or identical role bindings; removal remains available', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('target');
  for (const permission of ['Administrator', 'ManageRoles', 'ManageGuild', 'ManageChannels', 'KickMembers', 'BanMembers', 'ManageWebhooks', 'ModerateMembers']) {
    f.roles.get(team.memberRoleId).permissions = [PermissionFlagsBits[permission]];
    await assert.rejects(assignMembersWithRoles({ ...ctx, userIds: ['target'] }), /unsafe server-wide permissions/);
    assert.equal(f.members.get('target').roles.cache.has(team.memberRoleId), false);
    assert.deepEqual(f.store.getEventById(ctx.eventId, f.guild.id).teams[0].members, []);
  }
  f.roles.get(team.memberRoleId).permissions = [];
  f.store.updateEvent(ctx.eventId, { coreRoleId: team.memberRoleId }, f.guild.id);
  await assert.rejects(assignMembersWithRoles({ ...ctx, userIds: ['target'] }), /protected club role/);
  f.store.updateEvent(ctx.eventId, { coreRoleId: null }, f.guild.id);
  f.store.updateTeam(ctx.eventId, team.id, { mentorRoleId: team.memberRoleId }, f.guild.id);
  await assert.rejects(assignMembersWithRoles({ ...ctx, userIds: ['target'] }), /distinct IDs/);
  f.store.updateTeam(ctx.eventId, team.id, { mentorRoleId: team.mentorRoleId, members: ['target'] }, f.guild.id);
  await f.members.get('target').roles.add(team.memberRoleId);
  f.roles.get(team.memberRoleId).permissions = [PermissionFlagsBits.Administrator];
  const removed = await removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['target'], confirmed: true });
  assert.equal(removed.successCount, 1); assert.deepEqual(removed.team.members, []);
  assert.equal(f.members.get('target').roles.cache.has(team.memberRoleId), false);
});

test('A move cannot grant an unsafe destination role and leaves the original membership intact', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('moving-safe');
  await assignMembersWithRoles({ ...ctx, userIds: ['moving-safe'] });
  const destination = await createTeamWithRoles({ ...f.ctx, eventId: ctx.eventId });
  f.roles.get(destination.memberRoleId).permissions = [PermissionFlagsBits.ManageRoles];
  await assert.rejects(moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving-safe', confirmed: true }), /unsafe server-wide permissions/);
  assert.ok(f.members.get('moving-safe').roles.cache.has(team.memberRoleId));
  assert.equal(f.members.get('moving-safe').roles.cache.has(destination.memberRoleId), false);
  assert.deepEqual(f.store.getEventById(ctx.eventId, f.guild.id).teams[0].members, ['moving-safe']);
});

test('A confirmed move cannot revoke a protected source role or write a move journal', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('moving-protected');
  await assignMembersWithRoles({ ...ctx, userIds: ['moving-protected'] });
  const destination = await createTeamWithRoles({ ...f.ctx, eventId: ctx.eventId });
  f.store.updateEvent(ctx.eventId, { coreRoleId: team.memberRoleId }, f.guild.id);
  const before = f.store.snapshot();
  await assert.rejects(moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving-protected', confirmed: true }), /protected club role/);
  assert.equal(f.members.get('moving-protected').roles.cache.has(team.memberRoleId), true);
  assert.equal(f.members.get('moving-protected').roles.cache.has(destination.memberRoleId), false);
  assert.deepEqual(f.store.snapshot(), before);
});

test('A confirmed move rejects shared source and destination membership roles before access changes', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('moving-shared');
  await assignMembersWithRoles({ ...ctx, userIds: ['moving-shared'] });
  const destination = await createTeamWithRoles({ ...f.ctx, eventId: ctx.eventId });
  f.store.updateTeam(ctx.eventId, destination.id, { memberRoleId: team.memberRoleId }, f.guild.id);
  const before = f.store.snapshot();
  await assert.rejects(moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving-shared', confirmed: true }), { code: 'UNSAFE_TEAM_ROLE' });
  assert.equal(f.members.get('moving-shared').roles.cache.has(team.memberRoleId), true);
  assert.deepEqual(f.store.snapshot(), before);
});

test('Confirmed repair applies CORE policy to every legacy channel while keeping mentor rooms private', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  f.store.updateEvent(ctx.eventId, { coreRoleId: 'core' }, f.guild.id);
  f.roles.set('extra-core', { id: 'extra-core', name: 'Additional CORE', position: 2 });
  const config = { guildId: f.guild.id, trustedRoleIds: {}, departmentRoleIds: {}, coreRoleIds: ['extra-core'] };
  t.mock.method(clubStore, 'snapshot', () => ({ guilds: [config] }));
  const legacyChannels = {};
  for (const suffix of ['chat', 'resources', 'results', 'room', 'mentorsChat', 'mentorsRoom']) {
    const channel = await f.guild.channels.create({ name: suffix, type: /room/i.test(suffix) ? ChannelType.GuildVoice : ChannelType.GuildText, permissionOverwrites: [] });
    legacyChannels[suffix] = channel.id;
  }
  const category = await f.guild.channels.create({ name: 'category', type: ChannelType.GuildCategory, permissionOverwrites: [] });
  f.store.updateTeam(ctx.eventId, team.id, { channels: legacyChannels, categoryId: category.id }, f.guild.id);
  const before = await inspectEventSetup(ctx, { eventStore: f.store, config });
  assert.equal(before.filter((issue) => issue.code === 'CORE_OVERWRITE_MISSING').length, 14);
  await repairTeamWithRoles({ ...ctx, confirmed: true });
  for (const [suffix, channelId] of Object.entries({ ...legacyChannels, category: category.id })) {
    const policy = f.channels.get(channelId).permissionOverwrites.lastSet;
    assert.equal(policy.some((entry) => entry.id === team.memberRoleId), !/mentor/i.test(suffix));
    assert.ok(policy.some((entry) => entry.id === team.mentorRoleId));
    for (const roleId of ['core', 'extra-core']) {
      const core = policy.find((entry) => entry.id === roleId);
      assert.ok(core.allow.includes(PermissionFlagsBits.ViewChannel));
      assert.ok(core.deny.includes(PermissionFlagsBits.Speak));
    }
  }
  assert.deepEqual(await inspectEventSetup(ctx, { eventStore: f.store, config }), []);
});

test('Stored team references cannot edit, delete, or remove a protected CORE role through team workflows', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('target');
  t.mock.method(clubStore, 'snapshot', () => ({ guilds: [{ guildId: f.guild.id, coreRoleIds: [team.memberRoleId] }] }));
  const before = f.store.snapshot();
  const role = f.roles.get(team.memberRoleId);
  const originalName = role.name;
  const actions = [
    () => editEvent({ ...ctx, name: 'Unsafe rename' }),
    () => editTeamWithRoles({ ...ctx, name: 'Unsafe team rename' }),
    () => removeTeamWithRoles({ ...ctx, confirmed: true }),
    () => repairTeamWithRoles({ ...ctx, confirmed: true }),
    () => createTeamChannels({ ...ctx }),
    () => removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['target'], confirmed: true }),
  ];
  for (const action of actions) await assert.rejects(action(), /protected club role/);
  assert.equal(f.roles.get(team.memberRoleId), role);
  assert.equal(role.name, originalName);
  assert.deepEqual(role.permissions, []);
  assert.deepEqual(f.store.snapshot(), before);
  assert.equal(f.getChannelCreates(), 0);
});

test('Repair rejects identical role bindings before changing resources or declaring the team ready', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f);
  f.store.updateTeam(ctx.eventId, team.id, { mentorRoleId: team.memberRoleId, provisioningStatus: 'REPAIR_REQUIRED' }, f.guild.id);
  const before = f.store.snapshot();
  const originalName = f.roles.get(team.memberRoleId).name;
  await assert.rejects(repairTeamWithRoles({ ...ctx, confirmed: true }), /distinct IDs/);
  assert.deepEqual(f.store.snapshot(), before);
  assert.equal(f.roles.get(team.memberRoleId).name, originalName);
});

test('Team numbering retains edited numbers after deletion and restart', async (t) => {
  const f = fixture(t); const { ctx } = await eventTeam(f);
  await editTeamWithRoles({ ...ctx, name: 'Renumbered', number: 40 });
  await removeTeamWithRoles({ ...ctx, confirmed: true });
  const reopened = createEventsStore({ filePath: f.store.filePath });
  const next = await createTeamWithRoles({ ...f.ctx, store: reopened, eventId: ctx.eventId });
  assert.equal(next.number, 41);
});

test('Interrupted channel provisioning blocks assignments and moves out of the affected source team', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('moving');
  await assignMembersWithRoles({ ...ctx, userIds: ['moving'] });
  const destination = await createTeamWithRoles({ ...f.ctx, eventId: ctx.eventId });
  f.store.updateTeam(ctx.eventId, team.id, { provisioningStatus: 'CHANNELS_PROVISIONING' }, f.guild.id);
  await assert.rejects(assignMembersWithRoles({ ...ctx, userIds: ['moving'] }), /unresolved operation/);
  await assert.rejects(moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving', confirmed: true }), /unresolved operation/);
  assert.equal(f.members.get('moving').roles.cache.has(destination.memberRoleId), false);
  await repairTeamWithRoles({ ...ctx, confirmed: true });
  await moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving', confirmed: true });
  assert.equal(f.members.get('moving').roles.cache.has(destination.memberRoleId), true);
});

test('Confirmed roster removal and moves validate reviewed versions after waiting for the event lock', async (t) => {
  const f = fixture(t); const { team, ctx } = await eventTeam(f); f.makeMember('moving'); f.makeMember('new-member');
  await assignMembersWithRoles({ ...ctx, userIds: ['moving'] });
  const destination = await createTeamWithRoles({ ...f.ctx, eventId: ctx.eventId });
  const expectedRosterVersion = JSON.stringify(f.store.getEventById(ctx.eventId, f.guild.id).teams);
  const { withEventLock } = await import('../src/features/srv_events.js');
  let release; let started;
  const gate = new Promise((resolve) => { release = resolve; });
  const holding = withEventLock(ctx, ctx.eventId, async () => { started(); await gate; });
  // The lock acquires asynchronously, so install its start signal before the microtask resumes.
  const acquired = new Promise((resolve) => { started = resolve; });
  await acquired;
  const queuedRemoval = removeRosterWithRoles({ ...ctx, type: 'members', userIds: ['moving'], expectedRosterVersion, confirmed: true });
  const queuedMove = moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving', expectedRosterVersion, confirmed: true });
  f.store.updateTeam(ctx.eventId, team.id, { members: ['moving', 'new-member'] }, f.guild.id);
  release(); await holding;
  await assert.rejects(queuedRemoval, { code: 'STALE_CONFIRMATION' });
  await assert.rejects(queuedMove, { code: 'STALE_CONFIRMATION' });
  assert.equal(f.members.get('moving').roles.cache.has(team.memberRoleId), true);
  assert.equal(f.members.get('moving').roles.cache.has(destination.memberRoleId), false);
  const currentVersion = JSON.stringify(f.store.getEventById(ctx.eventId, f.guild.id).teams);
  const moved = await moveMemberWithRoles({ ...ctx, teamId: destination.id, sourceTeamId: team.id, userId: 'moving', expectedRosterVersion: currentVersion, confirmed: true });
  assert.equal(moved.rosterVersion, JSON.stringify(f.store.getEventById(ctx.eventId, f.guild.id).teams));
  const removed = await removeRosterWithRoles({ ...ctx, teamId: destination.id, type: 'members', userIds: ['moving'], expectedRosterVersion: moved.rosterVersion, confirmed: true });
  assert.equal(removed.rosterVersion, JSON.stringify(f.store.getEventById(ctx.eventId, f.guild.id).teams));
});
