import { randomUUID } from 'node:crypto';
import { PermissionFlagsBits, RESTJSONErrorCodes } from 'discord.js';
import { clubStore } from '../data/json_club.js';
import { eventsStore } from '../data/json_events.js';
import { CORE_TEAM, getAllTeams, getTeam } from '../config/cfg_teams.js';
import { resolveColor } from '../config/cfg_colors.js';
import { UNSAFE_ASSIGNMENT_PERMISSION_NAMES } from '../config/cfg_permissions.js';
import { ClubError, assertGuildContext, getCapabilities, requireCapability } from './srv_authorization.js';
import { createApprovalServices } from './srv_approvals.js';
import { createSetupServices } from './srv_setup.js';

export function createClubServices({ store = clubStore, eventStore = eventsStore } = {}) {
  const now = () => new Date().toISOString();
  const memberFor = (data, guildId, userId) => data.members.find((item) => item.guildId === guildId && item.userId === userId);
  const configFor = (data, guildId) => data.guilds.find((item) => item.guildId === guildId) || { guildId, trustedRoleIds: {}, departmentRoleIds: {} };
  function authorizedContext(ctx, data = store.snapshot(), capability, resource) {
    assertGuildContext(ctx);
    // Ignore caller-supplied config; authorization always uses this store's current bindings.
    const trusted = { guild: ctx.guild, actor: ctx.actor, config: configFor(data, ctx.guild.id) };
    return { ...trusted, caps: capability ? requireCapability(trusted, capability, resource) : getCapabilities(trusted) };
  }
  function audit(data, ctx, action, targets, before, after, outcome = 'SUCCESS') {
    data.audit.push({ id: randomUUID(), guildId: ctx.guild.id, actorId: ctx.actor.id, action, targets, timestamp: now(), before: structuredClone(before), after: structuredClone(after), outcome });
  }
  function preflight(guild, role) {
    const bot = guild.members.me;
    if (!bot?.permissions?.has(PermissionFlagsBits.ManageRoles)) throw new ClubError('BOT_MANAGE_ROLES');
    if (role && (role.id === guild.id || role.managed || role.editable === false || !bot.roles?.highest || bot.roles.highest.position <= role.position)) throw new ClubError('ROLE_HIERARCHY');
  }
  async function fetchRole(guild, id) {
    if (!id) return null;
    try { return await guild.roles.fetch(id, { force: true }); } catch { throw new ClubError('ROLE_MISSING'); }
  }
  async function membershipTransaction(ctx, callback) {
    assertGuildContext(ctx);
    // Authorization must use a fresh GuildMember at mutation time, not stale buttons/caches.
    return store.transaction(async (data, storageTx) => {
      await ctx.guild.roles.fetch();
      await ctx.guild.members.fetchMe?.({ force: true });
      const actor = await ctx.guild.members.fetch({ user: ctx.actor.id, force: true }).catch(() => null);
      if (!actor) throw new ClubError('GUILD_REQUIRED');
      ctx = { ...ctx, actor };
      let operation;
      const compensations = [];
      storageTx.onRollback(async () => {
        let success = true;
        for (const compensate of compensations.reverse()) { try { await compensate(); } catch { success = false; } }
        return success;
      });
      async function journal(userId, requested) {
        operation = { id: randomUUID(), guildId: ctx.guild.id, userId, actorId: ctx.actor.id, action: 'MEMBERSHIP_SYNC', before: structuredClone(memberFor(data, ctx.guild.id, userId) || null), requested, status: 'PREPARED', createdAt: now(), updatedAt: now(), createdRoleIds: [] };
        data.operations.push(operation);
        storageTx.checkpoint();
      }
      async function changeMembership({ userId, departmentKey = null, status = 'ACTIVE', requestId = null, confirmed = false }) {
        if (typeof userId !== 'string' || !userId || userId.length > 100) throw new ClubError('INVALID_MEMBER');
        if (!['ACTIVE', 'ARCHIVED'].includes(status)) throw new ClubError('INVALID_STATUS');
        const team = departmentKey === null ? null : getTeam(departmentKey);
        if (departmentKey !== null && !team) throw new ClubError('INVALID_DEPARTMENT');
        const before = structuredClone(memberFor(data, ctx.guild.id, userId) || null);
        let target;
        try { target = await ctx.guild.members.fetch({ user: userId, force: true }); }
        catch (error) {
          // A departed member has no guild roles to revoke. Other fetch failures must
          // still stop the archive, because the member may retain department access.
          if (status !== 'ARCHIVED' || !before || error.code !== RESTJSONErrorCodes.UnknownMember) throw new ClubError('MEMBER_LEFT');
        }
        if (target ? target.guild?.id !== ctx.guild.id || target.user?.bot : status !== 'ARCHIVED' || !before) throw new ClubError('MEMBER_LEFT');
        if (target) {
          const config = configFor(data, ctx.guild.id);
          preflight(ctx.guild);
          // Inspect all canonical membership roles; only these roles are ever revoked.
          const boundRoles = [];
          const coreRoleIds = new Set([config.coreRoleId, ...(config.coreRoleIds || [])].filter(Boolean));
          for (const [key, id] of Object.entries(config.departmentRoleIds)) {
            if (coreRoleIds.has(id)) throw new ClubError('UNSAFE_MEMBERSHIP_ROLE');
            const role = await fetchRole(ctx.guild, id);
            if (!role) throw new ClubError('ROLE_MISSING');
            const definition = getTeam(key);
            if (!definition || role.name !== definition.name || UNSAFE_ASSIGNMENT_PERMISSION_NAMES.some(key=>role.permissions?.has?.(PermissionFlagsBits[key]))) throw new ClubError('UNSAFE_MEMBERSHIP_ROLE');
            if (target.roles.cache.has(role.id) || key === team?.key) preflight(ctx.guild, role);
            boundRoles.push({ key, role });
          }
          let nextRole = status === 'ACTIVE' && team ? boundRoles.find(({ key }) => key === team.key)?.role : null;
          if (!confirmed && boundRoles.some(({ role }) => target.roles.cache.has(role.id) && role.id !== nextRole?.id)) throw new ClubError('CONFIRM_REQUIRED');
          // Existing unbound names are candidates for explicit setup binding, never implicit trust.
          if (status === 'ACTIVE' && team && !nextRole) {
            await ctx.guild.roles.fetch();
            if ([...ctx.guild.roles.cache.values()].some((role) => role.name === team.name)) throw new ClubError('ROLE_BINDING_REQUIRED');
          }
          await journal(userId, { departmentKey: team?.key || null, status, requestId });
          if (status === 'ACTIVE' && team && !nextRole) {
            nextRole = await ctx.guild.roles.create({ name: team.name, color: resolveColor(team.color), permissions: [], mentionable: false, reason: 'Club membership role provisioning' });
            operation.createdRoleIds.push(nextRole.id);
            compensations.push(() => ctx.guild.roles.delete(nextRole.id, 'Compensating failed club membership change'));
            storageTx.checkpoint();
            preflight(ctx.guild, nextRole);
            config.departmentRoleIds[team.key] = nextRole.id;
            if (!data.guilds.some((item) => item.guildId === ctx.guild.id)) data.guilds.push(config);
          }
          if (nextRole && !target.roles.cache.has(nextRole.id)) {
            await target.roles.add(nextRole.id, 'Approved club membership');
            compensations.push(() => target.roles.remove(nextRole.id, 'Compensating failed club membership change'));
          }
          for (const { role } of boundRoles) {
            if (role.id !== nextRole?.id && target.roles.cache.has(role.id)) {
              await target.roles.remove(role.id, 'Club primary department changed');
              compensations.push(() => target.roles.add(role.id, 'Restoring prior club membership'));
            }
          }
        } else {
          await journal(userId, { departmentKey: team?.key || null, status, requestId });
        }
        const timestamp = now();
        const updated = { ...(before || {}), guildId: ctx.guild.id, userId, displayName: target?.displayName || target?.user?.username || before?.displayName || userId, departmentKey: team?.key || null, status, createdAt: before?.createdAt || timestamp, updatedAt: timestamp };
        if (before) Object.assign(memberFor(data, ctx.guild.id, userId), updated); else data.members.push(updated);
        operation.status = 'COMPLETED';
        operation.updatedAt = timestamp;
        audit(data, ctx, 'MEMBERSHIP_UPDATE', { userId, requestId }, before, updated);
        return updated;
      }
      return callback(data, { changeMembership }, ctx);
    });
  }
  const services = {
    store,
    eventStore,
    getConfig(ctx) { assertGuildContext(ctx); return configFor(store.snapshot(), ctx.guild.id); },
    capabilities(ctx) { return authorizedContext(ctx).caps; },
    listMembers(ctx, { search = '', departmentKey, status } = {}) {
      assertGuildContext(ctx);
      const query = String(search).toLowerCase().replace(/[<@!>]/g, '');
      return store.snapshot().members.filter((item) => item.guildId === ctx.guild.id && (!departmentKey || departmentKey === 'ALL' || item.departmentKey === departmentKey) && (!status || status === 'ALL' || item.status === status) && (!query || item.displayName.toLowerCase().includes(query) || item.userId === query)).sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
    getMember(ctx, userId = ctx.actor?.id) {
      assertGuildContext(ctx);
      return memberFor(store.snapshot(), ctx.guild.id, userId) || null;
    },
    listDepartments(ctx) {
      assertGuildContext(ctx);
      const data = store.snapshot();
      const config = configFor(data, ctx.guild.id);
      return getAllTeams().map((team) => ({ ...team, memberCount: data.members.filter((member) => member.guildId === ctx.guild.id && member.status === 'ACTIVE' && member.departmentKey === team.key).length, coManagerRoleId: config.trustedRoleIds[team.key] || null, roleId: config.departmentRoleIds[team.key] || null, coManagers: [...(ctx.guild.members.cache?.values() || [])].filter((member) => config.trustedRoleIds[team.key] && member.roles?.cache?.has(config.trustedRoleIds[team.key])).map((member) => ({ userId: member.id, displayName: member.displayName || member.id })) }));
    },
    registerMember(ctx, { userId, departmentKey = null, reason = '', confirmed = false } = {}) {
      return membershipTransaction(ctx, async (data, tx, freshCtx) => {
        ctx = freshCtx;
        authorizedContext(ctx, data, 'members.manage');
        const existing = memberFor(data, ctx.guild.id, userId);
        if (existing && existing.status === 'ACTIVE') throw new ClubError('ALREADY_REGISTERED');
        if (existing && !confirmed) throw new ClubError('CONFIRM_REQUIRED');
        const before = structuredClone(existing || null);
        const result = await tx.changeMembership({ userId, departmentKey, status: 'ACTIVE', confirmed });
        audit(data, ctx, 'MEMBER_REGISTER', { userId }, before, { ...result, reason });
        return result;
      });
    },
    updateMembership(ctx, { userId, departmentKey, status, reason = '', confirmed = false } = {}) {
      return membershipTransaction(ctx, async (data, tx, freshCtx) => {
        ctx = freshCtx;
        authorizedContext(ctx, data, 'members.manage');
        const existing = memberFor(data, ctx.guild.id, userId);
        if (!existing) throw new ClubError('NOT_FOUND');
        const nextDepartment = departmentKey === undefined ? existing.departmentKey : departmentKey;
        const nextStatus = status || existing.status;
        if ((existing.departmentKey !== nextDepartment || existing.status !== nextStatus) && !confirmed) throw new ClubError('CONFIRM_REQUIRED');
        const before = structuredClone(existing);
        const result = await tx.changeMembership({ userId, departmentKey: nextDepartment, status: nextStatus, confirmed });
        audit(data, ctx, 'MEMBER_ADMIN', { userId }, before, { ...result, reason });
        return result;
      });
    },
    async appointLeadership(ctx, { userId, roleKey, confirmed = false } = {}) {
      assertGuildContext(ctx);
      if (!confirmed) throw new ClubError('CONFIRM_REQUIRED');
      if (!Object.hasOwn(CORE_TEAM, roleKey)) throw new ClubError('INVALID_ROLE');
      return store.transaction(async (data, tx) => {
        await ctx.guild.roles.fetch();
        await ctx.guild.members.fetchMe?.({ force: true });
        const actor = await ctx.guild.members.fetch({ user: ctx.actor.id, force: true });
        ctx = { ...ctx, actor };
        authorizedContext(ctx, data, 'club.manage');
        const role = await fetchRole(ctx.guild, configFor(data, ctx.guild.id).trustedRoleIds[roleKey]);
        if (!role) throw new ClubError('ROLE_BINDING_REQUIRED');
        preflight(ctx.guild, role);
        const target = await ctx.guild.members.fetch({ user: userId, force: true }).catch(() => null);
        if (!target || target.guild?.id !== ctx.guild.id) throw new ClubError('MEMBER_LEFT');
        if (target.user?.bot) throw new ClubError('INVALID_MEMBER');
        const hadRole = target.roles.cache.has(role.id);
        const operation = { id: randomUUID(), guildId: ctx.guild.id, userId, actorId: actor.id, action: 'LEADERSHIP_APPOINT', requested: { roleKey, roleId: role.id }, status: 'PREPARED', createdAt: now() };
        data.operations.push(operation);
        tx.checkpoint();
        tx.onRollback(async () => { if (!hadRole) await target.roles.remove(role.id); return true; });
        if (!hadRole) await target.roles.add(role.id, 'Confirmed club leadership appointment');
        operation.status = 'COMPLETED';
        audit(data, ctx, 'LEADERSHIP_APPOINT', { userId, roleKey, roleId: role.id }, { hadRole }, { hasRole: true });
        return { userId, roleKey, roleId: role.id };
      });
    },
    overview(ctx) {
      const { caps } = authorizedContext(ctx, store.snapshot(), 'approvals.review');
      const members = services.listMembers(ctx);
      return { activeMembers: members.filter((member) => member.status === 'ACTIVE').length, archivedMembers: members.filter((member) => member.status === 'ARCHIVED').length, departments: services.listDepartments(ctx), pendingRequests: services.listRequests(ctx, { status: 'PENDING' }).length, clubWide: caps.clubManage };
    },
  };
  Object.assign(services, createApprovalServices({ store, authorizedContext, membershipTransaction, audit }));
  Object.assign(services, createSetupServices({ store, eventStore, authorizedContext, membershipTransaction, audit, configFor, preflight }));
  return services;
}

export const clubServices = createClubServices();

