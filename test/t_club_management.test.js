import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionFlagsBits, RESTJSONErrorCodes } from 'discord.js';
import { createClubStore, emptyClubData } from '../src/data/json_club.js';
import { createClubServices } from '../src/features/srv_club.js';
import { getCapabilities } from '../src/features/srv_authorization.js';
import { inspectEventSetup } from '../src/features/srv_setupEvents.js';

function fixture(t, storeOptions) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gdg-club-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'club.json');
  const store = createClubStore(file, storeOptions);
  const calls = [];
  const roles = new Map();
  const members = new Map();
  let nextRole = 0;
  const guild = {
    id: 'guild-a', name: 'Test Guild',
    roles: {
      cache: roles,
      fetch: async (id) => id ? roles.get(id) || null : roles,
      create: async (options) => { calls.push(['create', options]); const role = { ...options, id: `created-${++nextRole}`, position: 5, editable: true }; roles.set(role.id, role); return role; },
      delete: async (id) => { calls.push(['delete', id]); roles.delete(id); },
    },
    channels: { fetch: async () => null },
    members: { cache: members, fetch: async (query) => { const id = typeof query === 'string' ? query : query.user; if (!members.has(id)) throw Object.assign(new Error('Unknown Member'), { code: RESTJSONErrorCodes.UnknownMember }); return members.get(id); } },
  };
  function member(id, { admin = false, roleIds = [], name = id } = {}) {
    const cachedRoles = new Map(roleIds.map((roleId) => [roleId, roles.get(roleId) || { id: roleId }]));
    const result = {
      id, guild, displayName: name, user: { id, username: name, bot: false },
      permissions: { has: (bit) => admin && (bit === PermissionFlagsBits.ManageGuild || bit === PermissionFlagsBits.Administrator) },
      roles: {
        cache: cachedRoles,
        add: async (roleId) => { calls.push(['add', id, roleId]); if (result.failAdd) throw new Error('Role grant failed'); cachedRoles.set(roleId, roles.get(roleId)); },
        remove: async (roleId) => { calls.push(['remove', id, roleId]); if (result.failRemove) throw new Error('Role revoke failed'); cachedRoles.delete(roleId); },
      },
    };
    members.set(id, result);
    return result;
  }
  guild.members.me = { permissions: { has: () => true }, roles: { highest: { position: 100 } } };
  roles.set('dev-member', { id: 'dev-member', name: 'Dev Department', position: 4, editable: true });
  roles.set('media-member', { id: 'media-member', name: 'Media Department', position: 4, editable: true });
  roles.set('dev-manager', { id: 'dev-manager', name: 'Dev', position: 4, editable: true });
  roles.set('president', { id: 'president', name: 'President', position: 8, editable: true });
  const admin = member('admin', { admin: true });
  const user = member('user');
  const services = createClubServices({ store, eventStore: { getAllEvents: () => [], snapshot: () => ({ events: [] }) } });
  const ctx = { guild, actor: admin };
  async function configure() { return services.bindRoles(ctx, { trustedRoleIds: { DEV: 'dev-manager', PRESIDENT: 'president' }, departmentRoleIds: { DEV: 'dev-member', MEDIA: 'media-member' }, confirmed: true }); }
  return { store, file, services, guild, member, admin, user, ctx, roles, calls, configure };
}

test('authorization derives trusted guild role IDs and rejects forged names and Manage Roles', async (t) => {
  const f = fixture(t);
  await f.configure();
  const fake = f.member('fake', { roleIds: ['untrusted'] });
  fake.roles.cache.set('untrusted', { name: 'President' });
  fake.permissions.has = (bit) => bit === PermissionFlagsBits.ManageRoles;
  assert.equal(f.services.capabilities({ guild: f.guild, actor: fake }).clubManage, false);
  const member = f.member('dev-member-user', { roleIds: ['dev-member'] });
  assert.equal(f.services.capabilities({ guild: f.guild, actor: member }).approvalReview, false);
  const manager = f.member('manager', { roleIds: ['dev-manager'] });
  assert.deepEqual([...f.services.capabilities({ guild: f.guild, actor: manager }).managedDepartments], ['DEV']);
  assert.equal(getCapabilities({ guild: f.guild, actor: manager, config: f.services.getConfig(f.ctx) }).clubManage, false);
});

test('department membership cannot grant global moderation privileges through a configured role',async(t)=>{
  const f=fixture(t);await f.configure();
  f.roles.get('dev-member').permissions={has:(bit)=>bit===PermissionFlagsBits.ModerateMembers};
  const request=await f.services.submitRequest({guild:f.guild,actor:f.user},{departmentKey:'DEV'});
  await assert.rejects(f.services.resolveRequest(f.ctx,request.id,{decision:'APPROVED'}),{code:'UNSAFE_MEMBERSHIP_ROLE'});
  assert.equal(f.store.snapshot().requests[0].status,'PENDING');assert.equal(f.user.roles.cache.has('dev-member'),false);
  const report=await f.services.checkSetup(f.ctx);assert.equal(report.issues.some(issue=>issue.code==='UNSAFE_MEMBERSHIP_ROLE'),true);
});

test('persisted CORE membership collisions cannot grant or strip protected roles', async (t) => {
  for (const field of ['coreRoleId', 'coreRoleIds']) {
    await t.test(field, async (t) => {
      const f = fixture(t); await f.configure();
      await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' });
      const applicant = f.member('applicant');
      const request = await f.services.submitRequest({ guild: f.guild, actor: applicant }, { departmentKey: 'DEV' });
      // Simulate a collision written by an earlier release before binding validation.
      await f.store.transaction((data) => { data.guilds[0][field] = field === 'coreRoleIds' ? ['dev-member'] : 'dev-member'; });
      const before = f.store.snapshot();
      f.calls.length = 0;
      await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), { code: 'UNSAFE_MEMBERSHIP_ROLE' });
      await assert.rejects(f.services.updateMembership(f.ctx, { userId: 'user', departmentKey: 'MEDIA', confirmed: true }), { code: 'UNSAFE_MEMBERSHIP_ROLE' });
      await assert.rejects(f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED', confirmed: true }), { code: 'UNSAFE_MEMBERSHIP_ROLE' });
      assert.deepEqual(f.calls, []);
      assert.equal(f.user.roles.cache.has('dev-member'), true);
      assert.equal(applicant.roles.cache.has('dev-member'), false);
      assert.deepEqual(f.store.snapshot(), before);
      // A departed account has no Discord roles to change, so its archive remains possible.
      f.guild.members.cache.delete('user');
      const archived = await f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED', confirmed: true });
      assert.equal(archived.status, 'ARCHIVED');
      assert.deepEqual(f.calls, []);
    });
  }
});

test('DM and cross-guild contexts are rejected', (t) => {
  const f = fixture(t);
  assert.throws(() => f.services.listMembers({ actor: f.user }), { code: 'GUILD_REQUIRED' });
  assert.throws(() => f.services.listMembers({ guild: { id: 'other' }, actor: f.user }), { code: 'GUILD_REQUIRED' });
});

test('submit is identity-derived, concurrent duplicate clicks are idempotent, and a second pending department is refused', async (t) => {
  const f = fixture(t);
  const ctx = { guild: f.guild, actor: f.user };
  const requests = await Promise.all(Array.from({ length: 8 }, () => f.services.submitRequest(ctx, { departmentKey: 'DEV', userId: 'admin' })));
  assert.equal(new Set(requests.map((request) => request.id)).size, 1);
  assert.equal(requests[0].userId, 'user');
  await assert.rejects(f.services.submitRequest(ctx, { departmentKey: 'MEDIA' }), { code: 'PENDING_REQUEST' });
  assert.equal(f.store.snapshot().requests.length, 1);
});

test('approval atomically records member/request/audit and remains idempotent under conflicting clicks', async (t) => {
  const f = fixture(t); await f.configure();
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  const [approved, staleRejection] = await Promise.all([
    f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }),
    f.services.resolveRequest(f.ctx, request.id, { decision: 'REJECTED' }),
  ]);
  assert.equal(approved.status, 'APPROVED'); assert.equal(staleRejection.status, 'APPROVED');
  assert.equal(f.user.roles.cache.has('dev-member'), true);
  const data = f.store.snapshot();
  assert.equal(data.members[0].departmentKey, 'DEV');
  assert.equal(data.requests[0].resolvedBy, 'admin');
  assert.equal(data.audit.filter((entry) => entry.action === 'REQUEST_APPROVED').length, 1);
  assert.equal(f.calls.filter(([action]) => action === 'add').length, 1);
});

test('Co-Manager sees only scoped joins; transfers and unrelated decisions require club-wide authority', async (t) => {
  const f = fixture(t); await f.configure();
  const manager = f.member('manager', { roleIds: ['dev-manager'] });
  const scoped = { guild: f.guild, actor: manager };
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  assert.equal(f.services.listRequests(scoped).length, 1);
  await f.services.resolveRequest(scoped, request.id, { decision: 'APPROVED' });
  const transfer = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'MEDIA' });
  assert.equal(f.services.listRequests(scoped).some((item) => item.id === transfer.id), false);
  await assert.rejects(f.services.resolveRequest(scoped, transfer.id, { decision: 'APPROVED' }), { code: 'FORBIDDEN' });
  await assert.rejects(f.services.appointLeadership(scoped, { userId: manager.id, roleKey: 'PRESIDENT', confirmed: true }), { code: 'FORBIDDEN' });
});

test('stale local actor roles cannot authorize a mutation after current Discord permissions change', async (t) => {
  const f = fixture(t); await f.configure();
  const stale = f.ctx;
  f.member('admin');
  await assert.rejects(f.services.registerMember(stale, { userId: 'user' }), { code: 'FORBIDDEN' });
  assert.equal(f.store.snapshot().members.length, 0);
});

test('mutations force REST member reads instead of accepting discord.js cached manager permissions', async (t) => {
  const f = fixture(t); await f.configure();
  const stale = f.admin, fresh = f.member('admin');
  const queries = [];
  f.guild.members.fetch = async (query) => {
    queries.push(query);
    // Mirrors GuildMemberManager.fetch(id): a string can return its stale cached member.
    if (typeof query === 'string') return stale;
    return query.user === 'admin' ? fresh : f.user;
  };
  await assert.rejects(f.services.registerMember({ guild: f.guild, actor: stale }, { userId: 'user' }), { code: 'FORBIDDEN' });
  assert.equal(queries.some((query) => query?.user === 'admin' && query.force === true), true);
  assert.equal(f.store.snapshot().members.length, 0);
});

test('guessed cross-guild request and member IDs are isolated', async (t) => {
  const f = fixture(t); await f.configure();
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  const otherGuild = { ...f.guild, id: 'guild-b' };
  const otherActor = { ...f.admin, guild: otherGuild };
  const otherCtx = { guild: otherGuild, actor: otherActor };
  assert.throws(() => f.services.getRequest(otherCtx, request.id), { code: 'NOT_FOUND' });
  assert.equal(f.services.getMember(otherCtx, 'user'), null);
  await assert.rejects(f.services.resolveRequest(otherCtx, request.id, { decision: 'REJECTED' }), { code: 'NOT_FOUND' });
});

test('missing guild or departed target never resolves an approval', async (t) => {
  const f = fixture(t); await f.configure();
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  assert.throws(() => f.services.resolveRequest({ actor: f.admin }, request.id, { decision: 'APPROVED' }), { code: 'GUILD_REQUIRED' });
  f.guild.members.cache.delete('user');
  await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), { code: 'MEMBER_LEFT' });
  assert.equal(f.store.snapshot().requests[0].status, 'PENDING');
});

test('failed new role grant leaves request pending and prior department access intact', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'MEDIA' });
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  f.user.failAdd = true;
  await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), /Role grant failed/);
  assert.equal(f.user.roles.cache.has('media-member'), true);
  assert.equal(f.store.snapshot().members[0].departmentKey, 'MEDIA');
  assert.equal(f.store.snapshot().requests[0].status, 'PENDING');
});

test('failed old role revoke compensates the new grant and preserves unrelated roles', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'MEDIA' });
  f.user.roles.cache.set('event-role', { id: 'event-role' });
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  let failOnce = true;
  const originalRemove = f.user.roles.remove;
  f.user.roles.remove = async (id) => { if (id === 'media-member' && failOnce) { failOnce = false; throw new Error('revoke failure'); } return originalRemove(id); };
  await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), /revoke failure/);
  assert.equal(f.user.roles.cache.has('dev-member'), false);
  assert.equal(f.user.roles.cache.has('media-member'), true);
  assert.equal(f.user.roles.cache.has('event-role'), true);
  assert.equal(f.store.snapshot().requests[0].status, 'PENDING');
});

test('failed compensation retains an unresolved operation and truthful prior member/request state', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'MEDIA' });
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  f.user.failRemove = true;
  await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), /Role revoke failed/);
  const data = f.store.snapshot();
  assert.equal(data.requests[0].status, 'PENDING');
  assert.equal(data.members[0].departmentKey, 'MEDIA');
  assert.equal(data.operations.at(-1).status, 'REPAIR_REQUIRED');
  const report = await f.services.checkSetup(f.ctx);
  assert.equal(report.issues.some((issue) => issue.code === 'UNRESOLVED_OPERATION' && issue.repairable), true);
  f.user.failRemove = false;
  await f.services.repairMembership(f.ctx, { userId: 'user', confirmed: true });
  assert.equal(f.user.roles.cache.has('dev-member'), false);
  assert.equal(f.user.roles.cache.has('media-member'), true);
  assert.equal(f.store.snapshot().operations.some((operation) => operation.status === 'REPAIR_REQUIRED'), false);
});

test('rollback deletes only the membership role created by the failed operation', async (t) => {
  const f = fixture(t); await f.configure();
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DESIGN' });
  f.user.failAdd = true;
  await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), /Role grant failed/);
  assert.equal(f.roles.has('dev-member'), true); assert.equal(f.roles.has('media-member'), true);
  assert.deepEqual(f.calls.filter(([action]) => action === 'delete').map(([, id]) => id), ['created-1']);
  assert.equal(f.roles.has('created-1'), false);
  assert.equal(f.services.getConfig(f.ctx).departmentRoleIds.DESIGN, undefined);
  assert.equal(f.store.snapshot().requests[0].status, 'PENDING');
});

test('successful transfer grants new role before removing old and keeps leadership/event roles', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'MEDIA' });
  f.user.roles.cache.set('president', f.roles.get('president'));
  f.user.roles.cache.set('event', { id: 'event' });
  f.calls.length = 0;
  await f.services.updateMembership(f.ctx, { userId: 'user', departmentKey: 'DEV', confirmed: true });
  assert.deepEqual(f.calls.filter(([action]) => ['add', 'remove'].includes(action)).map(([action, , id]) => [action, id]), [['add', 'dev-member'], ['remove', 'media-member']]);
  assert.equal(f.user.roles.cache.has('president'), true); assert.equal(f.user.roles.cache.has('event'), true);
});

test('archive/transfer require confirmation and reactivation preserves stored metadata', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' });
  await f.store.transaction((data) => { data.members[0].leadershipMetadata = { legacy: true }; });
  await assert.rejects(f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED' }), { code: 'CONFIRM_REQUIRED' });
  await f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED', confirmed: true });
  assert.equal(f.user.roles.cache.has('dev-member'), false);
  await f.services.updateMembership(f.ctx, { userId: 'user', status: 'ACTIVE', confirmed: true });
  assert.deepEqual(f.services.getMember(f.ctx, 'user').leadershipMetadata, { legacy: true });
  assert.equal(f.user.roles.cache.has('dev-member'), true);
});

test('confirmed archive preserves a departed member record without requiring Discord role changes', async (t) => {
  const f = fixture(t); await f.configure();
  f.user.displayName = 'Former Member';
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' });
  const original = f.services.getMember(f.ctx, 'user');
  f.guild.members.cache.delete('user');
  f.guild.members.me.permissions.has = () => false;
  f.roles.delete('dev-member');
  f.calls.length = 0;
  await assert.rejects(f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED' }), { code: 'CONFIRM_REQUIRED' });
  const archived = await f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED', confirmed: true });
  assert.equal(archived.status, 'ARCHIVED');
  assert.equal(archived.departmentKey, 'DEV');
  assert.equal(archived.displayName, original.displayName);
  assert.equal(archived.createdAt, original.createdAt);
  assert.deepEqual(f.calls, []);
  const reloaded = createClubStore(f.file).snapshot();
  assert.equal(reloaded.members[0].status, 'ARCHIVED');
  assert.equal(reloaded.operations.at(-1).status, 'COMPLETED');
  assert.equal(reloaded.audit.at(-1).action, 'MEMBER_ADMIN');
  await assert.rejects(f.services.updateMembership(f.ctx, { userId: 'user', status: 'ACTIVE', confirmed: true }), { code: 'MEMBER_LEFT' });
});

test('archive does not treat a Discord fetch outage as a departed member', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' });
  const fetch = f.guild.members.fetch;
  f.guild.members.fetch = async (query) => {
    if (query.user === 'user') throw new Error('Temporary Discord outage');
    return fetch(query);
  };
  f.calls.length = 0;
  await assert.rejects(f.services.updateMembership(f.ctx, { userId: 'user', status: 'ARCHIVED', confirmed: true }), { code: 'MEMBER_LEFT' });
  assert.equal(f.services.getMember(f.ctx, 'user').status, 'ACTIVE');
  assert.equal(f.user.roles.cache.has('dev-member'), true);
  assert.deepEqual(f.calls, []);
});

test('request ownership, cancellation, rejection reason and history are durable', async (t) => {
  const f = fixture(t); await f.configure();
  const ctx = { guild: f.guild, actor: f.user };
  const first = await f.services.submitRequest(ctx, { departmentKey: 'DEV' });
  await assert.rejects(f.services.cancelRequest(f.ctx, first.id), { code: 'NOT_FOUND' });
  await f.services.cancelRequest(ctx, first.id);
  const next = await f.services.submitRequest(ctx, { departmentKey: 'MEDIA' });
  await f.services.resolveRequest(f.ctx, next.id, { decision: 'REJECTED', reason: 'Please discuss your preferred department.' });
  assert.deepEqual(f.services.listRequests(ctx, { own: true }).map((item) => item.status).sort(), ['CANCELLED', 'REJECTED']);
  const reloaded = createClubStore(f.file).snapshot();
  assert.equal(reloaded.requests.find((item) => item.id === next.id).reason, 'Please discuss your preferred department.');
  assert.equal(reloaded.members.length, 0);
});

test('role hierarchy, managed roles, and bot permission preflight stop before access changes', async (t) => {
  const f = fixture(t); await f.configure();
  f.roles.get('dev-member').managed = true;
  await assert.rejects(f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' }), { code: 'ROLE_HIERARCHY' });
  f.roles.get('dev-member').managed = false;
  f.guild.members.me.permissions.has = () => false;
  await assert.rejects(f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' }), { code: 'BOT_MANAGE_ROLES' });
  assert.equal(f.calls.length, 0);
});

test('ambiguous unbound canonical roles require explicit binding rather than duplicate creation', async (t) => {
  const f = fixture(t);
  await assert.rejects(f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' }), { code: 'ROLE_BINDING_REQUIRED' });
  assert.equal(f.calls.filter(([action]) => action === 'create').length, 0);
});

test('concurrent members create an unbound missing membership role exactly once', async (t) => {
  const f = fixture(t); await f.configure(); f.member('second');
  await Promise.all([
    f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DESIGN' }),
    f.services.registerMember(f.ctx, { userId: 'second', departmentKey: 'DESIGN' }),
  ]);
  const creations = f.calls.filter(([action]) => action === 'create');
  assert.equal(creations.length, 1);
  assert.equal(creations[0][1].name, 'Design Department');
  assert.deepEqual(creations[0][1].permissions, []);
});

test('setup diagnostics observe drift without writes or Discord mutations and repairs require confirmation', async (t) => {
  const f = fixture(t); await f.configure();
  await f.services.registerMember(f.ctx, { userId: 'user', departmentKey: 'DEV' });
  f.user.roles.cache.delete('dev-member'); f.calls.length = 0;
  const before = fs.readFileSync(f.file, 'utf8');
  const setup = await f.services.checkSetup(f.ctx);
  assert.equal(setup.issues.some((issue) => issue.code === 'MEMBERSHIP_DRIFT'), true);
  assert.equal(fs.readFileSync(f.file, 'utf8'), before); assert.deepEqual(f.calls, []);
  assert.throws(() => f.services.repairMembership(f.ctx, { userId: 'user' }), { code: 'CONFIRM_REQUIRED' });
  await f.services.repairMembership(f.ctx, { userId: 'user', confirmed: true });
  assert.equal(f.user.roles.cache.has('dev-member'), true);
});

test('leadership appointments require club-wide authority, bindings and confirmation', async (t) => {
  const f = fixture(t); await f.configure();
  await assert.rejects(f.services.appointLeadership(f.ctx, { userId: 'user', roleKey: 'PRESIDENT' }), { code: 'CONFIRM_REQUIRED' });
  await f.services.appointLeadership(f.ctx, { userId: 'user', roleKey: 'PRESIDENT', confirmed: true });
  assert.equal(f.user.roles.cache.has('president'), true);
  assert.equal(f.store.snapshot().audit.some((item) => item.action === 'LEADERSHIP_APPOINT'), true);
});

test('leadership appointments reject bot accounts before journaling or granting authority', async (t) => {
  const f = fixture(t); await f.configure();
  f.user.user.bot = true;
  f.calls.length = 0;
  const before = f.store.snapshot();
  await assert.rejects(f.services.appointLeadership(f.ctx, { userId: 'user', roleKey: 'PRESIDENT', confirmed: true }), { code: 'INVALID_MEMBER' });
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.store.snapshot(), before);
});

test('snapshots are isolated, writes survive reload, and failed transactions do not leak mutations', async (t) => {
  const f = fixture(t); await f.configure();
  f.store.snapshot().guilds[0].trustedRoleIds.PRESIDENT = 'forged';
  assert.equal(f.store.snapshot().guilds[0].trustedRoleIds.PRESIDENT, 'president');
  await assert.rejects(f.store.transaction((data) => { data.members.push({ userId: 'bad' }); throw new Error('abort'); }), /abort/);
  assert.equal(createClubStore(f.file).snapshot().members.length, 0);
  assert.equal(fs.readdirSync(path.dirname(f.file)).some((name) => name.endsWith('.tmp')), false);
});

test('corrupt and structurally invalid JSON is preserved and never replaced by empty data', async (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, '{broken');
  const corrupt = createClubStore(f.file);
  assert.throws(() => corrupt.snapshot(), /Original file preserved/);
  await assert.rejects(corrupt.transaction(() => null), /Original file preserved/);
  assert.equal(fs.readFileSync(f.file, 'utf8'), '{broken');
  fs.writeFileSync(f.file, JSON.stringify({ schemaVersion: 1, members: [] }));
  assert.throws(() => createClubStore(f.file).snapshot(), /Invalid club storage collection/);
});

test('legacy snapshots stay read-only; first mutation backs up and migrates idempotently', async (t) => {
  const f = fixture(t);
  const data = emptyClubData(); delete data.schemaVersion;
  fs.writeFileSync(f.file, JSON.stringify(data));
  const legacyBytes = fs.readFileSync(f.file, 'utf8');
  const migrated = createClubStore(f.file);
  assert.equal(migrated.snapshot().schemaVersion, 1);
  assert.equal(fs.readFileSync(f.file, 'utf8'), legacyBytes);
  assert.equal(fs.readdirSync(path.dirname(f.file)).filter((name) => name.endsWith('.bak')).length, 0);
  await createClubServices({ store: migrated, eventStore: { getAllEvents: () => [], snapshot: () => ({ events: [] }) } }).checkSetup(f.ctx);
  assert.equal(fs.readFileSync(f.file, 'utf8'), legacyBytes);
  await migrated.transaction(() => null);
  await createClubStore(f.file).transaction(() => null);
  assert.equal(fs.readdirSync(path.dirname(f.file)).filter((name) => name.endsWith('.bak')).length, 1);
});

test('failed final atomic write compensates Discord and preserves pending request plus recovery journal', async (t) => {
  let fail = false;
  const fileSystem = Object.create(fs);
  fileSystem.renameSync = (source, target) => { if (fail) { fail = false; throw new Error('simulated disk failure'); } return fs.renameSync(source, target); };
  const f = fixture(t, { fileSystem }); await f.configure();
  const request = await f.services.submitRequest({ guild: f.guild, actor: f.user }, { departmentKey: 'DEV' });
  const originalAdd = f.user.roles.add;
  f.user.roles.add = async (id) => { await originalAdd(id); fail = true; };
  await assert.rejects(f.services.resolveRequest(f.ctx, request.id, { decision: 'APPROVED' }), /simulated disk failure/);
  const disk = createClubStore(f.file).snapshot();
  assert.equal(disk.requests[0].status, 'PENDING'); assert.equal(disk.members.length, 0);
  assert.equal(f.user.roles.cache.has('dev-member'), false);
  assert.equal(disk.operations.at(-1).status, 'ROLLED_BACK');
});

test('setup validates scoped event/team resources and leaves all stores and Discord unchanged', async (t) => {
  const f = fixture(t); await f.configure();
  const events = [
    { id: 'legacy', guildId: null, teams: [] },
    { id: 'other', guildId: 'guild-b', teams: [{ id: 'secret', members: ['foreign-user'] }] },
    { id: 'event', guildId: f.guild.id, name: 'Test Event', teams: [{ id: 'team', guildId: f.guild.id, eventId: 'event', name: 'Team 01', members: ['departed', 'user'], mentors: [], memberRoleId: 'missing-member-role', mentorRoleId: null, textChannelId: 'missing-channel', provisioningStatus: 'PARTIAL' }] },
  ];
  const eventStore = { getAllEvents: (guildId) => structuredClone(events.filter((event) => event.guildId === guildId)), snapshot: () => ({ events: structuredClone(events) }) };
  const services = createClubServices({ store: f.store, eventStore });
  const before = fs.readFileSync(f.file, 'utf8');
  const report = await services.checkSetup(f.ctx);
  assert.equal(report.unboundLegacyEvents, 1);
  for (const code of ['TEAM_ROLE_MISSING', 'TEAM_MEMBER_LEFT', 'TEAM_ROLE_DRIFT', 'TEAM_PARTIAL_OPERATION', 'CHANNEL_INACCESSIBLE', 'CORE_BINDING_MISSING']) assert.ok(report.issues.some((issue) => issue.code === code), code);
  assert.equal(report.issues.some((issue) => issue.userId === 'foreign-user'), false);
  assert.equal(report.issues.every((issue) => typeof issue.message === 'string' && issue.message.length > 10), true);
  assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  assert.deepEqual(f.calls, []);
});

test('setup detects actual CORE overlapping allows and Administrator bypass without claiming deny supremacy', async (t) => {
  const f = fixture(t);
  f.admin.roles.cache.set('core', { id: 'core' });
  f.admin.roles.cache.set('dev-member', f.roles.get('dev-member'));
  const has = (bits) => ({ has: (bit) => bits.includes(bit) });
  const overwrites = new Map([
    ['core', { id: 'core', allow: has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]), deny: has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.Speak]) }],
    ['dev-member', { id: 'dev-member', allow: has([PermissionFlagsBits.SendMessages]), deny: has([]) }],
  ]);
  f.guild.channels.fetch = async (id) => ({ id, guild: f.guild, name: 'team-chat', permissionsFor: () => ({ has: () => true }), permissionOverwrites: { cache: overwrites } });
  const events = [{ id: 'event', guildId: f.guild.id, name: 'Event', coreRoleId: 'core', teams: [{ id: 'team', name: 'Team 01', members: [], mentors: [], memberRoleId: 'dev-member', mentorRoleId: 'dev-manager', textChannelId: 'chat' }] }];
  const issues = await inspectEventSetup(f.ctx, { config: {}, eventStore: { getAllEvents: () => events, snapshot: () => ({ events }) } });
  assert.equal(issues.some((issue) => issue.code === 'CORE_OVERWRITE_MISSING'), false);
  assert.equal(issues.some((issue) => issue.code === 'CORE_OVERWRITE_CONFLICT' && issue.conflictingId === 'dev-member'), true);
  assert.equal(issues.some((issue) => issue.code === 'CORE_ADMIN_OVERRIDE' && issue.userId === 'admin'), true);
  assert.deepEqual(f.calls, []);
});
