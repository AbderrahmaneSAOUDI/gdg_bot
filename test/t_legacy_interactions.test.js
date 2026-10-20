import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionFlagsBits } from 'discord.js';
import { createClubStore } from '../src/data/json_club.js';
import { createEventsStore } from '../src/data/json_events.js';
import { createClubServices } from '../src/features/srv_club.js';
import { createSessionStore } from '../src/features/srv_sessions.js';
import { createConfirmationStore } from '../src/features/srv_confirmations.js';
import { handleEventInteraction } from '../src/features/srv_eventInteractions.js';
import * as teamServices from '../src/features/srv_teams.js';
import { createInteractionHandler } from '../src/events/evt_interactionCreate.js';
import { EXTRACTOR_MESSAGES } from '../src/messages/msg_extractor.js';
import { INTERACTION_ERRORS, INTERACTION_MESSAGES } from '../src/messages/msg_interactions.js';

function fixture(t, { extractor } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gdg-legacy-interactions-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const trace = [];
  const eventStore = createEventsStore({ filePath: path.join(directory, 'events.json') });
  const store = createClubStore(path.join(directory, 'club.json'));
  const roleCache = new Map();
  const memberCache = new Map();
  const guild = {
    id: '100000000000000001', name: 'Legacy Test Guild',
    roles: { cache: roleCache, async fetch(id) { trace.push('roles.fetch'); return id ? roleCache.get(id) ?? null : roleCache; } },
    channels: { cache: new Map(), async fetch() { trace.push('channels.fetch'); return null; } },
    members: { cache: memberCache, async fetch(input) { trace.push('members.fetch'); return memberCache.get(input.user); } },
  };
  const makeActor = (administrator = true) => ({
    id: '100000000000000002', guild, displayName: 'Test Manager',
    user: { id: '100000000000000002', username: 'manager', bot: false },
    permissions: { has: (permission) => administrator && [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild].includes(permission) },
    roles: { cache: new Map() },
  });
  const actor = makeActor();
  memberCache.set(actor.id, actor);
  const event = eventStore.createEvent({ id: 'legacy-event', guildId: guild.id, name: 'Legacy Event' });
  const teams = [1, 2].map((number) => eventStore.addTeam(event.id, { id: `team-${number}`, name: `Team ${number}`, number, memberRoleId: `member-role-${number}`, mentorRoleId: `mentor-role-${number}` }, guild.id));
  for (const team of teams) {
    roleCache.set(team.memberRoleId, { id: team.memberRoleId, name: `${team.name} Member` });
    roleCache.set(team.mentorRoleId, { id: team.mentorRoleId, name: `${team.name} Mentor` });
  }
  const snapshot = store.snapshot;
  store.snapshot = () => { trace.push('club.snapshot'); return snapshot(); };
  const originalServices = createClubServices({ store, eventStore });
  const services = { ...originalServices, capabilities(ctx) { trace.push('capabilities'); return originalServices.capabilities(ctx); } };
  const sessions = createSessionStore();
  const previews = createConfirmationStore();
  let deleteCalls = 0;
  const currentTeams = { ...teamServices, async removeTeamWithRoles() { deleteCalls += 1; throw new Error('Selection must not delete resources'); } };
  const dispatch = createInteractionHandler({
    services,
    eventHandler: (interaction, parsed) => handleEventInteraction(interaction, parsed, { club: services, sessions, previews, teamServices: currentTeams }),
    ...(extractor ? { extractor } : {}),
  });
  function interaction(customId, { values = [], modal = false, publicMessage = false, member = actor } = {}) {
    trace.length = 0;
    const calls = [];
    const current = {
      customId, guild, member, user: member.user, values,
      fields: { getTextInputValue() { throw new Error('Stale modal fields must never be applied'); } },
      message: { flags: { has: () => !publicMessage } },
      isChatInputCommand: () => false, isModalSubmit: () => modal,
      async deferReply() { this.deferred = true; trace.push('ack'); calls.push('deferReply'); },
      async deferUpdate() { this.deferred = true; trace.push('ack'); calls.push('deferUpdate'); },
      async reply(payload) { this.replied = true; this.payload = payload; trace.push('reply'); calls.push('reply'); },
      async editReply(payload) { this.payload = payload; trace.push('editReply'); calls.push('editReply'); },
      async showModal(value) { this.replied = true; this.modal = value.toJSON(); trace.push('showModal'); calls.push('showModal'); },
    };
    return { current, calls };
  }
  return { actor, guild, makeActor, memberCache, eventStore, event, teams, services, sessions, trace, dispatch, interaction, deleteCalls: () => deleteCalls };
}

const components = (payload) => payload.components.flatMap((row) => row.toJSON().components);
const embed = (payload) => payload.embeds[0].toJSON();

test('Old team Previous/Next IDs open the requested page through the current controller', async (t) => {
  const f = fixture(t);
  for (const [legacyPage, expectedTeam] of [[1, 'Team 1'], [2, 'Team 2']]) {
    const { current } = f.interaction(`bot:team:page:${f.event.id}:${legacyPage}`);
    await f.dispatch(current);
    assert.ok(embed(current.payload).title.includes(expectedTeam));
    const indicator = components(current.payload).find((control) => control.disabled && control.label?.startsWith('Team '));
    assert.equal(indicator.label, `Team ${legacyPage} of 2`);
    assert.equal(f.trace[0], 'ack');
  }
});

test('Old Add Event and Add Team buttons open current modals without a defer or network read', async (t) => {
  const f = fixture(t);
  for (const [customId, modalId] of [
    ['bot:event:add', 'bot:em:addsave'],
    [`bot:team:add:${f.event.id}`, `bot:em:taddsave:${f.event.id}`],
  ]) {
    const { current, calls } = f.interaction(customId);
    await f.dispatch(current);
    assert.deepEqual(calls, ['showModal']);
    assert.equal(current.modal.custom_id, modalId);
    assert.equal(f.trace.some((operation) => operation.endsWith('.fetch') || operation === 'ack'), false);
  }
});

test('Old assignment buttons and target selectors create scoped current assignment sessions', async (t) => {
  const f = fixture(t);
  for (const [customId, values, teamId, type] of [
    [`bot:team:assign_members:${f.event.id}:${f.teams[0].id}`, [], f.teams[0].id, 'members'],
    [`bot:team:assign_mentors:${f.event.id}:${f.teams[1].id}`, [], f.teams[1].id, 'mentors'],
    [`bot:team:assign_target:${f.event.id}:mentors`, [f.teams[1].id], f.teams[1].id, 'mentors'],
  ]) {
    const { current } = f.interaction(customId, { values });
    await f.dispatch(current);
    const selector = components(current.payload).find((control) => control.custom_id?.startsWith('bot:em:assign:'));
    assert.ok(selector, 'Old assignment entry opens the current member selector');
    const [, , , token, assignmentType] = selector.custom_id.split(':');
    assert.equal(assignmentType, type);
    assert.deepEqual(f.sessions.get({ guild: f.guild, actor: f.actor }, token), { eventId: f.event.id, teamId });
    assert.equal(f.trace[0], 'ack');
  }
  const fallback = f.interaction(`bot:team:assign_mentors:${f.event.id}`);
  await f.dispatch(fallback.current);
  assert.ok(embed(fallback.current.payload).title.includes('Team 1'));
});

test('Old team delete menus and selections open impact review and never delete on selection', async (t) => {
  const f = fixture(t);
  const before = f.eventStore.snapshot();
  const menu = f.interaction(`bot:team:delete_menu:${f.event.id}:${f.teams[1].id}`);
  await f.dispatch(menu.current);
  assert.ok(components(menu.current.payload).some((control) => control.custom_id === `bot:em:deleteselect:${f.event.id}`));
  const selected = f.interaction(`bot:team:delete_confirm:${f.event.id}`, { values: [f.teams[1].id] });
  await f.dispatch(selected.current);
  assert.ok(embed(selected.current.payload).title.includes('impact review'));
  const confirm = components(selected.current.payload).find((control) => control.custom_id?.startsWith('bot:em:confirm:'));
  assert.ok(confirm);
  const token = confirm.custom_id.split(':')[3];
  const review = f.sessions.get({ guild: f.guild, actor: f.actor }, token);
  assert.equal(review.kind, 'delete');
  assert.equal(review.teamId, f.teams[1].id);
  assert.equal(f.deleteCalls(), 0);
  assert.deepEqual(f.eventStore.snapshot(), before);
});

test('A stale event deletion preview is consumed even if the earlier record is restored', async (t) => {
  const f = fixture(t);
  const before = f.eventStore.snapshot();
  const selected = f.interaction(`bot:team:delete_confirm:${f.event.id}`, { values: [f.teams[0].id] });
  await f.dispatch(selected.current);
  const confirm = components(selected.current.payload).find((control) => control.custom_id?.startsWith('bot:em:confirm:'));
  f.eventStore.updateTeam(f.event.id, f.teams[0].id, { name: 'Changed after review' }, f.guild.id);
  const stale = f.interaction(confirm.custom_id);
  await f.dispatch(stale.current);
  assert.equal(embed(stale.current.payload).description, INTERACTION_ERRORS.STALE_CONFIRMATION);
  f.eventStore.transaction((draft) => { draft.events = before.events; });
  const replay = f.interaction(confirm.custom_id);
  await f.dispatch(replay.current);
  assert.equal(embed(replay.current.payload).description, INTERACTION_ERRORS.STALE_CONFIRMATION);
  assert.equal(f.deleteCalls(), 0);
});

test('Current event and hub buttons acknowledge before capability storage and Discord reads', async (t) => {
  const f = fixture(t);
  for (const customId of [`bot:em:teams:${f.event.id}:0`, 'bot:hub:events', 'bot:hub:main', 'bot:nav:home']) {
    const { current } = f.interaction(customId, { publicMessage: true });
    await f.dispatch(current);
    assert.equal(f.trace[0], 'ack', customId);
    assert.ok(f.trace.includes('capabilities'), customId);
    assert.ok(f.trace.includes('club.snapshot'), customId);
    assert.ok(f.trace.includes('members.fetch'), customId);
    assert.ok(current.payload.embeds.length);
  }
  const knowledge = f.interaction('bot:hub:knowledge');
  await f.dispatch(knowledge.current);
  assert.deepEqual(f.trace, ['ack', 'editReply']);
});

test('Stale old submissions and malformed bot controls respond with an expired screen and Home', async (t) => {
  const f = fixture(t);
  const before = f.eventStore.snapshot();
  for (const [customId, modal] of [
    ['bot:modal:event_add', true],
    [`bot:modal:team_add:${f.event.id}`, true],
    [`bot:team:user_select:${f.event.id}:${f.teams[0].id}:members`, false],
    ['bot:', false],
    ['bot:missing:unknown', false],
  ]) {
    const { current } = f.interaction(customId, { modal, values: [f.actor.id] });
    await f.dispatch(current);
    assert.equal(f.trace[0], 'ack');
    assert.equal(embed(current.payload).description, INTERACTION_ERRORS.SESSION_EXPIRED);
    assert.ok(components(current.payload).some((control) => control.custom_id === 'bot:hub:main'));
  }
  assert.deepEqual(f.eventStore.snapshot(), before);
  assert.equal(f.deleteCalls(), 0);
});

test('Legacy pagination Close and persistent deployment controls have safe working responses', async (t) => {
  const f = fixture(t);
  for (const customId of ['bot:page:list:close', 'bot:page:teams:event:close']) {
    const { current } = f.interaction(customId);
    await f.dispatch(current);
    assert.equal(current.payload.content, INTERACTION_MESSAGES.closed);
    assert.deepEqual(current.payload.components, []);
    assert.deepEqual(f.trace, ['ack', 'editReply']);
  }
  const deployment = f.interaction('hub:deploy_persistent');
  await f.dispatch(deployment.current);
  assert.equal(embed(deployment.current.payload).description.replaceAll('\\_', '_'), INTERACTION_MESSAGES.deployHelp);
  assert.deepEqual(f.trace, ['ack', 'editReply']);
});

test('A stale registered slash command responds with guidance instead of staying unacknowledged', async (t) => {
  const f = fixture(t);
  const { current, calls } = f.interaction(undefined);
  current.isChatInputCommand = () => true;
  current.commandName = 'retired-command';
  current.client = { commands: new Map() };
  await f.dispatch(current);
  assert.deepEqual(calls, ['reply']);
  assert.equal(embed(current.payload).description, INTERACTION_ERRORS.COMMAND_UNAVAILABLE);
  assert.ok(components(current.payload).some((control) => control.custom_id === 'bot:hub:main'));
});

test('Extractor buttons refresh a revoked administrator after acknowledging and cannot start an export', async (t) => {
  let exports = 0;
  const f = fixture(t, { extractor: async () => { exports += 1; throw new Error('Revoked administrator must not export'); } });
  f.memberCache.set(f.actor.id, f.makeActor(false));
  const { current } = f.interaction('bot:hub:extract_server', { member: f.actor, publicMessage: true });
  await f.dispatch(current);
  assert.equal(f.trace[0], 'ack');
  assert.ok(f.trace.indexOf('members.fetch') < f.trace.indexOf('capabilities'));
  assert.equal(exports, 0);
  assert.equal(embed(current.payload).description, INTERACTION_ERRORS.FORBIDDEN);
});

test('Extractor buttons report incomplete histories using the partial result title', async (t) => {
  let exportedGuild;
  const stats = { complete: false, outputDir: 'isolated-mock-export', totalRoles: 2, totalCategories: 1, totalChannels: 2, textChannels: 1, voiceChannels: 1, totalMessages: 0, failedMessageChannels: 1, partialMessageChannels: 0 };
  const f = fixture(t, { extractor: async ({ guild }) => { exportedGuild = guild.id; return stats; } });
  const { current } = f.interaction('bot:hub:extract_server', { publicMessage: true });
  await f.dispatch(current);
  assert.equal(f.trace[0], 'ack');
  assert.equal(exportedGuild, f.guild.id);
  assert.equal(embed(current.payload).title, EXTRACTOR_MESSAGES.PARTIAL_TITLE);
  assert.ok(embed(current.payload).description.includes('partial server export'));
});
