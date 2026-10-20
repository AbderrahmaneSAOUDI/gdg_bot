import { PermissionFlagsBits } from 'discord.js';
import { UNSAFE_ASSIGNMENT_PERMISSION_NAMES } from '../config/cfg_permissions.js';

/** Read-only validation of event resources; never provisions, assigns, or edits a channel. */
export async function inspectEventSetup(ctx, { eventStore, config }) {
  const issues = [];
  let events;
  try {
    events = eventStore.getAllEvents(ctx.guild.id);
    const count = eventStore.snapshot().events.filter((event) => !event.guildId).length;
    if (count) issues.push({ code: 'LEGACY_EVENTS_UNBOUND', count });
  } catch { return [{ code: 'EVENT_STORAGE_ERROR' }]; }
  const memberCache = new Map();
  async function fetchMember(id) {
    if (!memberCache.has(id)) memberCache.set(id, await ctx.guild.members.fetch({ user: id, force: true }).catch(() => null));
    return memberCache.get(id);
  }
  const restricted = ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads', 'SendMessagesInThreads', 'Speak'].map((key) => PermissionFlagsBits[key]);
  for (const event of events) {
    for (const team of event.teams) {
      const base = { eventId: event.id, eventName: event.name, teamId: team.id, teamName: team.name };
      if ((team.guildId && team.guildId !== ctx.guild.id) || (team.eventId && team.eventId !== event.id)) issues.push({ ...base, code: 'TEAM_REFERENCE_INVALID' });
      for (const assignmentType of ['members', 'mentors']) {
        const roleId = assignmentType === 'members' ? team.memberRoleId : team.mentorRoleId;
        const role = roleId ? await ctx.guild.roles.fetch(roleId, { force: true }).catch(() => null) : null;
        if (!role) issues.push({ ...base, code: 'TEAM_ROLE_MISSING', roleId, assignmentType });
        else {
          const protectedIds=[...Object.values(config.trustedRoleIds||{}),...Object.values(config.departmentRoleIds||{}),config.coreRoleId,...(config.coreRoleIds||[]),event.coreRoleId].filter(Boolean);
          if(team.memberRoleId===team.mentorRoleId||protectedIds.includes(roleId)||UNSAFE_ASSIGNMENT_PERMISSION_NAMES.some(key=>role.permissions?.has?.(PermissionFlagsBits[key])))issues.push({...base,code:'UNSAFE_TEAM_ROLE',roleId,assignmentType});
        }
        for (const userId of team[assignmentType] || []) {
          const member = await fetchMember(userId);
          if (!member) issues.push({ ...base, code: 'TEAM_MEMBER_LEFT', userId });
          else if (roleId && !member.roles.cache.has(roleId)) issues.push({ ...base, code: 'TEAM_ROLE_DRIFT', userId, displayName: member.displayName, roleId, assignmentType });
        }
      }
      for (const [key, status] of Object.entries({ provisioning: team.provisioningStatus, cleanup: team.cleanupStatus })) {
        if (status && !['READY', 'COMPLETE', 'COMPLETED', 'CLEAN'].includes(status)) issues.push({ ...base, code: 'TEAM_PARTIAL_OPERATION', operationType: key, status });
      }
      for (const [key, operation] of Object.entries({roster:team.rosterOperation,repair:team.repairOperation})) {
        if(operation&&['PREPARED','REPAIR_REQUIRED'].includes(operation.status))issues.push({...base,code:'TEAM_PARTIAL_OPERATION',operationType:key,status:operation.status});
      }
      const channelIds = [...new Set([team.categoryId, team.textChannelId, team.voiceChannelId, ...Object.values(team.channels || {})].filter(Boolean))];
      const coreRoleIds = [...new Set([config.coreRoleId, ...(config.coreRoleIds || []), event.coreRoleId].filter(Boolean))];
      if (channelIds.length && !coreRoleIds.length) issues.push({ ...base, code: 'CORE_BINDING_MISSING' });
      for (const channelId of channelIds) {
        const channel = await ctx.guild.channels.fetch(channelId, { force: true }).catch(() => null);
        if (!channel || channel.guild?.id !== ctx.guild.id || !channel.permissionsFor(ctx.guild.members.me)?.has(PermissionFlagsBits.ViewChannel)) {
          issues.push({ ...base, code: 'CHANNEL_INACCESSIBLE', channelId }); continue;
        }
        if (!coreRoleIds.length) continue;
        for (const coreRoleId of coreRoleIds) {
          const overwrite = channel.permissionOverwrites?.cache?.get(coreRoleId);
          if (!overwrite || ![PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory].every((bit) => overwrite.allow?.has?.(bit)) || !restricted.every((bit) => overwrite.deny?.has?.(bit))) issues.push({ ...base, code: 'CORE_OVERWRITE_MISSING', channelId, channelName: channel.name, roleId: coreRoleId });
        }
        const coreMembers = [...(ctx.guild.members.cache?.values() || [])].filter((member) => coreRoleIds.some((id) => member.roles?.cache?.has(id)));
        for (const other of channel.permissionOverwrites?.cache?.values() || []) {
          if ([ctx.guild.id, ctx.guild.members.me?.id, ...coreRoleIds].includes(other.id)) continue;
          const appliesToCore = coreMembers.some((member) => member.id === other.id || member.roles.cache.has(other.id));
          if (appliesToCore && restricted.some((bit) => other.allow?.has?.(bit))) issues.push({ ...base, code: 'CORE_OVERWRITE_CONFLICT', channelId, channelName: channel.name, conflictingId: other.id });
        }
        for (const member of ctx.guild.members.cache?.values() || []) {
          if (coreRoleIds.some((id) => member.roles?.cache?.has(id)) && member.permissions?.has(PermissionFlagsBits.Administrator)) issues.push({ ...base, code: 'CORE_ADMIN_OVERRIDE', channelId, userId: member.id, displayName: member.displayName });
        }
      }
    }
  }
  return issues;
}
