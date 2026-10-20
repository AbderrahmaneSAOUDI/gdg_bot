import { PermissionFlagsBits } from 'discord.js';
import { getAllTeams } from '../config/cfg_teams.js';
import { CLUB_WIDE_ROLE_KEYS } from '../config/cfg_permissions.js';
import { clubStore } from '../data/json_club.js';

export class ClubError extends Error {
  constructor(code, message) { super(message || code); this.name = 'ClubError'; this.code = code; }
}

export function assertGuildContext({ guild, actor } = {}) {
  if (!guild?.id || !actor?.id || actor.user?.bot || actor.guild?.id !== guild.id) throw new ClubError('GUILD_REQUIRED', 'Use this action as a member of this server.');
  return { guildId: guild.id, actorId: actor.id };
}

export function getCapabilities({ guild, actor, config } = {}) {
  assertGuildContext({ guild, actor });
  config ??= clubStore.snapshot().guilds.find((item) => item.guildId === guild.id) || {};
  if (config.guildId && config.guildId !== guild.id) throw new ClubError('FORBIDDEN', 'Configuration belongs to another server.');
  const hasRole = (id) => Boolean(id && actor.roles?.cache?.has(id));
  const administrator = Boolean(actor.permissions?.has(PermissionFlagsBits.Administrator) || actor.permissions?.has(PermissionFlagsBits.ManageGuild));
  const clubManage = administrator || CLUB_WIDE_ROLE_KEYS.some((key) => hasRole(config.trustedRoleIds?.[key]));
  const managedDepartments = new Set(getAllTeams().filter(({ key }) => hasRole(config.trustedRoleIds?.[key])).map(({ key }) => key));
  return { administrator, clubManage, memberManage: clubManage, eventManage: clubManage, setupManage: administrator, approvalReview: clubManage || managedDepartments.size > 0, managedDepartments };
}

export function requireCapability(ctx, capability, resource = {}) {
  const caps = getCapabilities(ctx);
  const allowed = {
    'club.manage': caps.clubManage,
    'members.manage': caps.memberManage,
    'events.manage': caps.eventManage,
    'setup.manage': caps.setupManage,
    'approvals.review': caps.approvalReview,
    'departments.manage': caps.clubManage || (caps.managedDepartments.has(resource.departmentKey) && (!resource.currentDepartmentKey || resource.currentDepartmentKey === resource.departmentKey)),
    'approvals.resolve': caps.clubManage || (caps.managedDepartments.has(resource.departmentKey) && (!resource.currentDepartmentKey || resource.currentDepartmentKey === resource.departmentKey)),
  }[capability];
  if (!allowed) throw new ClubError('FORBIDDEN', 'Your current server roles do not authorize this action.');
  return caps;
}
