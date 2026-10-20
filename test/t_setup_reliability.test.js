import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionFlagsBits } from 'discord.js';
import { CORE_TEAM, getAllTeams } from '../src/config/cfg_teams.js';
import { createClubStore } from '../src/data/json_club.js';
import { createClubServices } from '../src/features/srv_club.js';
import { createConfirmationStore } from '../src/features/srv_confirmations.js';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gdg-setup-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = createClubStore(path.join(directory, 'club.json'));
  const roles = new Map();
  const members = new Map();
  const guild = {
    id: 'setup-guild',
    roles: { cache: roles, fetch: async (id) => id ? roles.get(id) || null : roles },
    members: { cache: members, fetch: async ({ user }) => members.get(user) || null },
    channels: { fetch: async () => null },
  };
  const admin = { id: 'admin', guild, user: { bot: false }, permissions: { has: () => true }, roles: { cache: new Map() } };
  members.set(admin.id, admin);
  guild.members.me = { permissions: { has: () => true }, roles: { highest: { position: 100 } } };
  const trustedRoleIds = {}, departmentRoleIds = {};
  for (const [key, definition] of Object.entries(CORE_TEAM)) {
    const id = `trusted-${key}`;
    trustedRoleIds[key] = id;
    roles.set(id, { id, name: definition.name, position: 1, editable: true });
  }
  for (const team of getAllTeams()) {
    const id = `department-${team.key}`;
    departmentRoleIds[team.key] = id;
    roles.set(id, { id, name: team.name, position: 1, editable: true });
  }
  const services = createClubServices({ store, eventStore: { getAllEvents: () => [], snapshot: () => ({ events: [] }) } });
  const ctx = { guild, actor: admin };
  const configure = () => services.bindRoles(ctx, { trustedRoleIds, departmentRoleIds, confirmed: true });
  return { store, roles, members, guild, admin, services, ctx, configure };
}

test('explicit bindings resolve duplicate canonical names without deleting unrelated Discord roles', async (t) => {
  const f = fixture(t);
  f.roles.set('other-president', { id: 'other-president', name: 'President' });
  f.roles.set('other-dev', { id: 'other-dev', name: 'Dev Department' });
  const before = f.store.snapshot();
  const unbound = await f.services.checkSetup(f.ctx);
  assert.equal(unbound.issues.filter(({ code }) => code === 'DUPLICATE_ROLE').length, 2);
  assert.deepEqual(f.store.snapshot(), before);
  assert.equal(fs.existsSync(f.store.storagePath), false);
  await f.configure();
  const bound = await f.services.checkSetup(f.ctx);
  assert.deepEqual(bound.issues, []);
  assert.equal(bound.healthy, true);
  assert.equal(f.roles.has('other-president'), true);
  assert.equal(f.roles.has('other-dev'), true);
});

test('a broken retained binding does not block correcting another binding, and remains diagnosed', async (t) => {
  const f = fixture(t);
  await f.configure();
  f.roles.delete('trusted-PRESIDENT');
  f.roles.get('department-MEDIA').permissions = { has: (bit) => bit === PermissionFlagsBits.Administrator };
  f.roles.set('replacement-dev', { id: 'replacement-dev', name: 'Dev Department', position: 1, editable: true });
  await f.services.bindRoles(f.ctx, { departmentRoleIds: { DEV: 'replacement-dev' }, confirmed: true });
  assert.equal(f.services.getConfig(f.ctx).departmentRoleIds.DEV, 'replacement-dev');
  const report = await f.services.checkSetup(f.ctx);
  assert.equal(report.issues.some((issue) => issue.code === 'ROLE_MISSING' && issue.roleKey === 'PRESIDENT'), true);
  assert.equal(report.issues.some((issue) => issue.code === 'UNSAFE_MEMBERSHIP_ROLE' && issue.departmentKey === 'MEDIA'), true);
  await assert.rejects(f.services.bindRoles(f.ctx, { departmentRoleIds: { MEDIA: 'department-MEDIA' }, confirmed: true }), { code: 'UNSAFE_MEMBERSHIP_ROLE' });
  assert.equal(f.services.getConfig(f.ctx).trustedRoleIds.PRESIDENT, 'trusted-PRESIDENT');
});

test('setup rechecks current actor and bot permissions without changing local storage', async (t) => {
  const f = fixture(t);
  await f.configure();
  const bytes = fs.readFileSync(f.store.storagePath, 'utf8');
  let botReads = 0;
  f.guild.members.fetchMe = async ({ force }) => {
    assert.equal(force, true);
    botReads++;
    f.guild.members.me = { ...f.guild.members.me, permissions: { has: (bit) => bit !== PermissionFlagsBits.ManageRoles } };
    return f.guild.members.me;
  };
  const report = await f.services.checkSetup(f.ctx);
  assert.equal(botReads, 1);
  assert.equal(report.issues.some((issue) => issue.code === 'BOT_PERMISSION_MISSING' && issue.permission === 'ManageRoles'), true);
  f.members.set(f.admin.id, { ...f.admin, permissions: { has: () => false } });
  await assert.rejects(f.services.checkSetup(f.ctx), { code: 'FORBIDDEN' });
  assert.equal(fs.readFileSync(f.store.storagePath, 'utf8'), bytes);
});

test('an invalid bound trusted role is diagnosed even when its ID still exists', async (t) => {
  const f = fixture(t);
  await f.configure();
  f.roles.get('trusted-PRESIDENT').managed = true;
  const report = await f.services.checkSetup(f.ctx);
  assert.equal(report.issues.some((issue) => issue.code === 'ROLE_HIERARCHY' && issue.roleKey === 'PRESIDENT'), true);
});

test('department membership and CORE bindings cannot overlap in either update direction', async (t) => {
  const f = fixture(t);
  await f.services.bindRoles(f.ctx, { coreRoleId: 'department-DEV', confirmed: true });
  await assert.rejects(f.services.bindRoles(f.ctx, { departmentRoleIds: { DEV: 'department-DEV' }, confirmed: true }), { code: 'AMBIGUOUS_ROLE_BINDING' });
  assert.deepEqual(f.services.getConfig(f.ctx).departmentRoleIds, {});
  await f.services.bindRoles(f.ctx, { coreRoleId: 'trusted-PRESIDENT', departmentRoleIds: { DEV: 'department-DEV' }, confirmed: true });
  await assert.rejects(f.services.bindRoles(f.ctx, { coreRoleId: 'department-DEV', confirmed: true }), { code: 'AMBIGUOUS_ROLE_BINDING' });
  assert.equal(f.services.getConfig(f.ctx).coreRoleId, 'trusted-PRESIDENT');
  // A leadership role may also serve as a CORE view-only role.
  await f.services.bindRoles(f.ctx, { trustedRoleIds: { PRESIDENT: 'trusted-PRESIDENT' }, confirmed: true });
  assert.equal(f.services.getConfig(f.ctx).trustedRoleIds.PRESIDENT, 'trusted-PRESIDENT');
});

test('retained CORE role arrays prevent overlap and existing collisions are diagnosed read-only', async (t) => {
  const f = fixture(t);
  await f.configure();
  await f.store.transaction((data) => { data.guilds[0].coreRoleIds = ['department-DEV']; });
  const before = fs.readFileSync(f.store.storagePath, 'utf8');
  const report = await f.services.checkSetup(f.ctx);
  const issue = report.issues.find(({ code }) => code === 'CORE_MEMBERSHIP_ROLE_COLLISION');
  assert.equal(issue.departmentKey, 'DEV');
  assert.match(issue.message, /CORE view-only role/);
  assert.equal(fs.readFileSync(f.store.storagePath, 'utf8'), before);
  await assert.rejects(f.services.bindRoles(f.ctx, { departmentRoleIds: { DEV: 'department-DEV' }, confirmed: true }), { code: 'AMBIGUOUS_ROLE_BINDING' });
  f.roles.set('replacement-dev', { id: 'replacement-dev', name: 'Dev Department', position: 1, editable: true });
  await f.services.bindRoles(f.ctx, { departmentRoleIds: { DEV: 'replacement-dev' }, confirmed: true });
  const repaired = await f.services.checkSetup(f.ctx);
  assert.equal(repaired.issues.some(({ code }) => code === 'CORE_MEMBERSHIP_ROLE_COLLISION'), false);
});

test('a rejected stale confirmation cannot become valid again after the target changes back', () => {
  const previews = createConfirmationStore();
  const ctx = { guild: { id: 'guild' }, actor: { id: 'actor' } };
  previews.preview(ctx, 'binding', 'DEV', { roleId: 'before' });
  assert.throws(() => previews.verify(ctx, 'binding', 'DEV', { roleId: 'after' }), { code: 'STALE_CONFIRMATION' });
  assert.throws(() => previews.verify(ctx, 'binding', 'DEV', { roleId: 'before' }), { code: 'STALE_CONFIRMATION' });
  previews.preview(ctx, 'binding', 'DEV', { roleId: 'before' });
  previews.verify(ctx, 'binding', 'DEV', { roleId: 'before' });
  assert.throws(() => previews.verify(ctx, 'binding', 'DEV', { roleId: 'before' }), { code: 'STALE_CONFIRMATION' });
});
