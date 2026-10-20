import { PermissionFlagsBits } from 'discord.js';
import { CORE_TEAM, getAllTeams } from '../config/cfg_teams.js';
import { ClubError, assertGuildContext } from './srv_authorization.js';
import { describeSetupIssue } from '../messages/msg_setup.js';
import { inspectEventSetup } from './srv_setupEvents.js';
import { UNSAFE_ASSIGNMENT_PERMISSION_NAMES } from '../config/cfg_permissions.js';

/** Diagnostics only observe Discord. Repairs are distinct, confirmed service mutations. */
export function createSetupServices({ store, eventStore, authorizedContext, membershipTransaction, audit, configFor, preflight }) {
  return {
    async bindRoles(ctx, { trustedRoleIds = {}, departmentRoleIds = {}, coreRoleId, confirmed = false } = {}) {
      assertGuildContext(ctx);
      if (!confirmed) throw new ClubError('CONFIRM_REQUIRED');
      return store.transaction(async (data) => {
        await ctx.guild.roles.fetch();
        ctx = { ...ctx, actor: await ctx.guild.members.fetch({ user: ctx.actor.id, force: true }) };
        authorizedContext(ctx, data, 'setup.manage');
        const config = configFor(data, ctx.guild.id);
        const nextTrusted = { ...config.trustedRoleIds, ...trustedRoleIds };
        const nextDepartments = { ...config.departmentRoleIds, ...departmentRoleIds };
        for (const key of Object.keys(nextTrusted)) if (!Object.hasOwn(CORE_TEAM, key)) throw new ClubError('INVALID_ROLE');
        const departmentKeys = new Set(getAllTeams().map(({ key }) => key));
        for (const key of Object.keys(nextDepartments)) if (!departmentKeys.has(key)) throw new ClubError('INVALID_DEPARTMENT');
        const ids = [...Object.values(nextTrusted), ...Object.values(nextDepartments)];
        if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new ClubError('AMBIGUOUS_ROLE_BINDING');
        for (const id of [...ids, ...(coreRoleId ? [coreRoleId] : [])]) {
          const role = await ctx.guild.roles.fetch(id, { force: true }).catch(() => null);
          if (!role || role.id === ctx.guild.id || role.managed) throw new ClubError('INVALID_ROLE');
        }
        for (const [key, id] of Object.entries(nextDepartments)) {
          const role = await ctx.guild.roles.fetch(id, { force: true });
          const definition = getAllTeams().find((team) => team.key === key);
          if (role.name !== definition.name || UNSAFE_ASSIGNMENT_PERMISSION_NAMES.some(key=>role.permissions?.has?.(PermissionFlagsBits[key]))) throw new ClubError('UNSAFE_MEMBERSHIP_ROLE');
        }
        const before = structuredClone(config);
        Object.assign(config, { trustedRoleIds: nextTrusted, departmentRoleIds: nextDepartments, updatedAt: new Date().toISOString() });
        if (coreRoleId !== undefined) config.coreRoleId = coreRoleId;
        if (!data.guilds.some((item) => item.guildId === ctx.guild.id)) data.guilds.push(config);
        audit(data, ctx, 'ROLE_BINDINGS_UPDATE', { guildId: ctx.guild.id }, before, config);
        return config;
      });
    },
    async checkSetup(ctx) {
      assertGuildContext(ctx);
      const data = store.snapshot();
      authorizedContext(ctx, data, 'setup.manage');
      const config = configFor(data, ctx.guild.id);
      const issues = [];
      const candidates = { trustedRoleIds: {}, departmentRoleIds: {} };
      let roles;
      try { roles = await ctx.guild.roles.fetch(); } catch { issues.push({ code: 'ROLE_DIRECTORY_UNAVAILABLE' }); }
      roles ||= ctx.guild.roles.cache;
      const roleValues = [...(roles?.values() || [])];
      for (const permission of ['ManageRoles', 'ManageChannels', 'ViewChannel', 'SendMessages', 'EmbedLinks']) {
        if (!ctx.guild.members.me?.permissions?.has(PermissionFlagsBits[permission])) issues.push({ code: 'BOT_PERMISSION_MISSING', permission });
      }
      for (const [key, definition] of Object.entries(CORE_TEAM)) {
        const matches = roleValues.filter((role) => role.name === definition.name && !role.managed && role.id !== ctx.guild.id);
        if (matches.length === 1) candidates.trustedRoleIds[key] = matches[0].id;
        if (matches.length > 1) issues.push({ code: 'DUPLICATE_ROLE', roleKey: key });
        const id = config.trustedRoleIds[key];
        if (!id) issues.push({ code: 'TRUSTED_ROLE_UNBOUND', roleKey: key });
        else if (!roleValues.some((role) => role.id === id)) issues.push({ code: 'ROLE_MISSING', roleKey: key, roleId: id });
      }
      for (const team of getAllTeams()) {
        const matches = roleValues.filter((role) => role.name === team.name && !role.managed && role.id !== ctx.guild.id);
        if (matches.length === 1) candidates.departmentRoleIds[team.key] = matches[0].id;
        if (matches.length > 1) issues.push({ code: 'DUPLICATE_ROLE', roleKey: `${team.key}_MEMBER` });
        const id = config.departmentRoleIds[team.key];
        const role = roleValues.find((item) => item.id === id);
        if (!id) issues.push({ code: 'DEPARTMENT_ROLE_UNBOUND', departmentKey: team.key });
        else if (!role) issues.push({ code: 'ROLE_MISSING', roleId: id, departmentKey: team.key });
        else {
          try { preflight(ctx.guild, role); } catch { issues.push({ code: 'ROLE_HIERARCHY', roleId: role.id }); }
          if(role.name!==team.name||UNSAFE_ASSIGNMENT_PERMISSION_NAMES.some(key=>role.permissions?.has?.(PermissionFlagsBits[key])))issues.push({code:'UNSAFE_MEMBERSHIP_ROLE',departmentKey:team.key,roleId:role.id});
        }
      }
      const members = data.members.filter((item) => item.guildId === ctx.guild.id);
      for (const member of members) {
        const discordMember = await ctx.guild.members.fetch({ user: member.userId, force: true }).catch(() => null);
        if (!discordMember) { issues.push({ code: 'MEMBER_LEFT', userId: member.userId }); continue; }
        const expected = member.status === 'ACTIVE' ? config.departmentRoleIds[member.departmentKey] : null;
        const actual = Object.values(config.departmentRoleIds).filter((id) => discordMember.roles.cache.has(id));
        if ((expected && !actual.includes(expected)) || actual.some((id) => id !== expected)) issues.push({ code: 'MEMBERSHIP_DRIFT', userId: member.userId, expectedRoleId: expected || null, actualRoleIds: actual });
      }
      for (const [key, channelId] of Object.entries(config.channels || {})) {
        const channel = await ctx.guild.channels.fetch(channelId, { force: true }).catch(() => null);
        if (!channel || channel.guild?.id !== ctx.guild.id || !channel.permissionsFor(ctx.guild.members.me)?.has(PermissionFlagsBits.ViewChannel)) issues.push({ code: 'CHANNEL_INACCESSIBLE', channelKey: key, channelId });
      }
      const unresolvedOperations = data.operations.filter((item) => item.guildId === ctx.guild.id && ['PREPARED', 'REPAIR_REQUIRED'].includes(item.status));
      for (const operation of unresolvedOperations) issues.push({ code: 'UNRESOLVED_OPERATION', operationId: operation.id, userId: operation.userId });
      issues.push(...await inspectEventSetup(ctx, { eventStore, config }));
      for (const issue of issues) {
        const member = members.find((item) => item.userId === issue.userId);
        issue.displayName ||= member?.displayName;
        issue.repairable = issue.code === 'MEMBERSHIP_DRIFT' || (issue.code === 'UNRESOLVED_OPERATION' && Boolean(member) && unresolvedOperations.some((op) => op.id === issue.operationId && op.action === 'MEMBERSHIP_SYNC'));
        issue.message = describeSetupIssue(issue);
      }
      return { guildId: ctx.guild.id, healthy: issues.length === 0, issues, candidates, membersChecked: members.length, unresolvedOperations, schemaVersion: data.schemaVersion, unboundLegacyEvents: issues.find((issue) => issue.code === 'LEGACY_EVENTS_UNBOUND')?.count || 0 };
    },
    repairMembership(ctx, { userId, confirmed = false } = {}) {
      if (!confirmed) throw new ClubError('CONFIRM_REQUIRED');
      return membershipTransaction(ctx, async (data, tx, freshCtx) => {
        ctx = freshCtx;
        authorizedContext(ctx, data, 'setup.manage');
        const member = data.members.find((item) => item.guildId === ctx.guild.id && item.userId === userId);
        if (!member) throw new ClubError('NOT_FOUND');
        const result = await tx.changeMembership({ userId, departmentKey: member.departmentKey, status: member.status, confirmed });
        for (const operation of data.operations.filter((item) => item.guildId === ctx.guild.id && item.userId === userId && item.action === 'MEMBERSHIP_SYNC' && ['PREPARED', 'REPAIR_REQUIRED'].includes(item.status))) {
          operation.status = 'REPAIRED';
          operation.repairedAt = new Date().toISOString();
          operation.repairedBy = ctx.actor.id;
        }
        audit(data, ctx, 'MEMBERSHIP_REPAIR', { userId }, null, result);
        return result;
      });
    },
  };
}

