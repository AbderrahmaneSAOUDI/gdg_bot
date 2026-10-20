import { randomUUID } from 'node:crypto';
import { ClubError, assertGuildContext } from './srv_authorization.js';
import { getTeam } from '../config/cfg_teams.js';

/** Approval workflows share the member transaction, so a resolution and membership cannot diverge. */
export function createApprovalServices({ store, authorizedContext, membershipTransaction, audit }) {
  function visible(ctx, data, request, own = false) {
    if (request.guildId !== ctx.guild.id) return false;
    if (own) return request.userId === ctx.actor.id;
    const { caps } = authorizedContext(ctx, data);
    if (request.type === 'TRANSFER') return caps.clubManage;
    const current = data.members.find((item) => item.guildId === ctx.guild.id && item.userId === request.userId);
    const source = request.type === 'TRANSFER' ? request.currentDepartmentKey : (current?.departmentKey || request.currentDepartmentKey);
    return caps.clubManage || (caps.managedDepartments.has(request.departmentKey) && (!source || source === request.departmentKey));
  }
  return {
    listRequests(ctx, { status, own = false } = {}) {
      assertGuildContext(ctx);
      const data = store.snapshot();
      if (!own) authorizedContext(ctx, data, 'approvals.review');
      return data.requests.filter((request) => visible(ctx, data, request, own) && (!status || status === 'ALL' || request.status === status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    getRequest(ctx, requestId) {
      assertGuildContext(ctx);
      const data = store.snapshot();
      const request = data.requests.find((item) => item.guildId === ctx.guild.id && item.id === requestId);
      if (!request || !(request.userId === ctx.actor.id || visible(ctx, data, request))) throw new ClubError('NOT_FOUND');
      return request;
    },
    async submitRequest(ctx, { departmentKey }) {
      assertGuildContext(ctx);
      const team = getTeam(departmentKey);
      if (!team) throw new ClubError('INVALID_DEPARTMENT');
      // Identity is derived exclusively from the authenticated member.
      await ctx.guild.members.fetch({ user: ctx.actor.id, force: true });
      return store.transaction((data) => {
        assertGuildContext(ctx);
        const pending = data.requests.find((item) => item.guildId === ctx.guild.id && item.userId === ctx.actor.id && item.status === 'PENDING');
        if (pending) {
          if (pending.departmentKey === team.key) return pending;
          throw new ClubError('PENDING_REQUEST');
        }
        const member = data.members.find((item) => item.guildId === ctx.guild.id && item.userId === ctx.actor.id);
        if (member?.status === 'ACTIVE' && member.departmentKey === team.key) throw new ClubError('ALREADY_MEMBER');
        const request = { id: randomUUID(), guildId: ctx.guild.id, userId: ctx.actor.id, type: member?.departmentKey ? 'TRANSFER' : 'JOIN', currentDepartmentKey: member?.departmentKey || null, departmentKey: team.key, status: 'PENDING', createdAt: new Date().toISOString(), resolvedAt: null, resolvedBy: null, reason: null };
        data.requests.push(request);
        audit(data, ctx, 'REQUEST_SUBMIT', { requestId: request.id, userId: request.userId }, null, request);
        return request;
      });
    },
    cancelRequest(ctx, requestId) {
      assertGuildContext(ctx);
      return store.transaction((data) => {
        const request = data.requests.find((item) => item.guildId === ctx.guild.id && item.id === requestId && item.userId === ctx.actor.id);
        if (!request) throw new ClubError('NOT_FOUND');
        if (request.status !== 'PENDING') return request;
        const before = structuredClone(request);
        Object.assign(request, { status: 'CANCELLED', resolvedAt: new Date().toISOString(), resolvedBy: ctx.actor.id });
        audit(data, ctx, 'REQUEST_CANCEL', { requestId }, before, request);
        return request;
      });
    },
    resolveRequest(ctx, requestId, { decision, reason = '' } = {}) {
      assertGuildContext(ctx);
      if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ClubError('INVALID_DECISION');
      if (typeof reason !== 'string' || reason.length > 1000) throw new ClubError('INVALID_REASON');
      return membershipTransaction(ctx, async (data, tx, freshCtx) => {
        ctx = freshCtx;
        const request = data.requests.find((item) => item.guildId === ctx.guild.id && item.id === requestId);
        if (!request) throw new ClubError('NOT_FOUND');
        const current = data.members.find((item) => item.guildId === ctx.guild.id && item.userId === request.userId);
        const resource = { departmentKey: request.departmentKey, currentDepartmentKey: request.type === 'TRANSFER' ? request.currentDepartmentKey : (current?.departmentKey || request.currentDepartmentKey) };
        authorizedContext(ctx, data, request.type === 'TRANSFER' ? 'members.manage' : 'approvals.resolve', resource);
        if (request.status !== 'PENDING') return request;
        const before = structuredClone(request);
        if (decision === 'APPROVED') await tx.changeMembership({ userId: request.userId, departmentKey: request.departmentKey, status: 'ACTIVE', requestId, confirmed: true });
        Object.assign(request, { status: decision, reason: reason.trim() || null, resolvedBy: ctx.actor.id, resolvedAt: new Date().toISOString() });
        audit(data, ctx, `REQUEST_${decision}`, { requestId, userId: request.userId }, before, request);
        return request;
      });
    },
  };
}
