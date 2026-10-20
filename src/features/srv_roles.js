import { PermissionFlagsBits } from 'discord.js';
import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { PermissionsBitField } from 'discord.js';
import { clubStore } from '../data/json_club.js';
import { UNSAFE_ASSIGNMENT_PERMISSION_NAMES } from '../config/cfg_permissions.js';

function roleError(code,message) {const error=new Error(message);error.code=code;return error;}

export function getMemberPermissions() {
  return [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak];
}
export function getMentorPermissions() {
  return [...getMemberPermissions(), PermissionFlagsBits.PrioritySpeaker, PermissionFlagsBits.ManageMessages];
}
export const CORE_DENIED_PERMISSIONS = Object.freeze([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.Speak]);

/** Discord aggregates role overwrites; administrators bypass them and other allows can conflict. */
export function buildTeamChannelOverwrites({ everyoneRoleId, coreRoleId, coreRoleIds = [], memberRoleId, mentorRoleId, botMemberId }) {
  const overwrites = [];
  if (everyoneRoleId) overwrites.push({ id: everyoneRoleId, deny: [PermissionFlagsBits.ViewChannel] });
  for (const id of new Set([coreRoleId, ...coreRoleIds].filter(Boolean))) {
    if ([everyoneRoleId, memberRoleId, mentorRoleId].includes(id)) throw new Error('CORE and team roles must have distinct IDs.');
    overwrites.push({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [...CORE_DENIED_PERMISSIONS] });
  }
  if (memberRoleId) overwrites.push({ id: memberRoleId, allow: getMemberPermissions() });
  if (mentorRoleId) overwrites.push({ id: mentorRoleId, allow: getMentorPermissions() });
  if (botMemberId) overwrites.push({ id: botMemberId, type: 1, allow: [...getMentorPermissions(), PermissionFlagsBits.ManageChannels] });
  return overwrites;
}

export async function preflightTeamPermissions(guild, { channels = false, roleIds = [] } = {}) {
  if (!guild?.id) throw roleError('GUILD_REQUIRED','A Discord guild is required.');
  await guild.roles?.fetch?.();
  const bot = guild.members?.fetchMe ? await guild.members.fetchMe({ force: true }) : guild.members?.me;
  if (!bot?.permissions?.has(PermissionFlagsBits.ManageRoles)) throw roleError('BOT_MANAGE_ROLES','The bot needs Manage Roles.');
  if (channels && !bot.permissions.has(PermissionFlagsBits.ManageChannels)) throw roleError('BOT_MANAGE_CHANNELS','The bot needs Manage Channels.');
  for (const id of new Set(roleIds.filter(Boolean))) {
    const role = await guild.roles.fetch(id, { force: true });
    if (!role || role.managed || role.id === guild.id || role.editable === false || (bot.roles?.highest && role.position >= bot.roles.highest.position)) throw roleError('ROLE_HIERARCHY','A team role is missing, managed, or above the bot in the role hierarchy.');
  }
  return bot;
}

/** Team assignment must never confer server administration or a configured club role. */
export async function assertSafeTeamAssignmentRoles(guild, { memberRoleId, mentorRoleId, coreRoleId, assignmentRoleIds = [] }) {
  if (memberRoleId && memberRoleId === mentorRoleId) throw roleError('UNSAFE_TEAM_ROLE','Team member and mentor roles must have distinct IDs before assignment.');
  const config = clubStore.snapshot().guilds.find((item) => item.guildId === guild.id) ?? {};
  const protectedIds = new Set([...Object.values(config.trustedRoleIds ?? {}), ...Object.values(config.departmentRoleIds ?? {}), config.coreRoleId, ...(config.coreRoleIds ?? []), coreRoleId].filter(Boolean));
  const elevated = UNSAFE_ASSIGNMENT_PERMISSION_NAMES.map(key=>PermissionFlagsBits[key]).filter(Boolean);
  for (const id of new Set(assignmentRoleIds)) {
    if (!id || protectedIds.has(id)) throw roleError('UNSAFE_TEAM_ROLE','A team assignment role conflicts with a protected club role. Review and repair its binding first.');
    const role = await guild.roles.fetch(id, { force: true });
    if (!role) throw roleError('ROLE_MISSING','Team assignment role is missing. Review and repair the team first.');
    const permissions = typeof role.permissions?.has === 'function' ? role.permissions : new PermissionsBitField(role.permissions?.bitfield ?? role.permissions ?? []);
    if (elevated.some((permission) => permissions.has(permission))) throw roleError('UNSAFE_TEAM_ROLE','A team role has unsafe server-wide permissions. Review and confirm team repair before assigning it.');
  }
}

export function teamRoleNames(eventName, teamNumber) {
  const prefix = `${eventName} - Team ${String(teamNumber).padStart(2, '0')}`;
  if (prefix.length > 91) throw new Error('Event name is too long for Discord team roles.');
  return { member: `${prefix} - Member`, mentor: `${prefix} - Mentor` };
}

/** Creates only minimal guild roles. Collaboration permissions belong on channels. */
export async function createTeamRoles(guild, eventName, teamNumber, { onCreated = async () => {} } = {}) {
  await preflightTeamPermissions(guild);
  const names = teamRoleNames(eventName, teamNumber);
  const created = [];
  try {
    const memberRole = await guild.roles.create({ name: names.member, color: GOOGLE_COLORS.BLUE, permissions: [], hoist: false, mentionable: false, reason: 'Explicit team provisioning' });
    created.push(memberRole); await onCreated('memberRoleId', memberRole.id);
    const mentorRole = await guild.roles.create({ name: names.mentor, color: GOOGLE_COLORS.YELLOW, permissions: [], hoist: true, mentionable: false, reason: 'Explicit team provisioning' });
    created.push(mentorRole); await onCreated('mentorRoleId', mentorRole.id);
    return { memberRole, mentorRole };
  } catch (error) {
    const remainingRoleIds = [];
    for (const role of created.reverse()) {
      try { await guild.roles.delete(role.id, 'Rollback incomplete team provisioning'); }
      catch { remainingRoleIds.push(role.id); }
    }
    error.createdRoleIds = created.map((role) => role.id);
    error.remainingRoleIds = remainingRoleIds;
    throw error;
  }
}

export async function assignRoleToMember(guild, userId, roleId) {
  if (!guild || !userId || !roleId) return false;
  try { const member = await guild.members.fetch({ user: userId, force: true }); if (!member) return false; await member.roles.add(roleId); return true; }
  catch { return false; }
}
export async function removeRoleFromMember(guild, userId, roleId) {
  if (!guild || !userId || !roleId) return false;
  try { const member = await guild.members.fetch({ user: userId, force: true }); if (!member) return false; await member.roles.remove(roleId); return true; }
  catch { return false; }
}
export async function deleteTeamRoles(guild, memberRoleId, mentorRoleId) {
  const failures = [];
  for (const id of new Set([memberRoleId, mentorRoleId].filter(Boolean))) {
    try { await guild.roles.delete(id, 'Confirmed team deletion'); }
    catch (error) { if (error.code !== 10011) failures.push({ type: 'role', id }); }
  }
  return { deleted: failures.length === 0, failures };
}
