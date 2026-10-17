import { PermissionFlagsBits } from 'discord.js';
import { GOOGLE_COLORS } from '../config/cfg_colors.js';

/**
 * Builds permission bits for standard Team Members.
 */
export function getMemberPermissions() {
  return [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ];
}

/**
 * Builds permission bits for Team Mentors (Hoisted + elevated in-team guidance).
 */
export function getMentorPermissions() {
  return [
    ...getMemberPermissions(),
    PermissionFlagsBits.PrioritySpeaker,
    PermissionFlagsBits.ManageMessages,
  ];
}

/**
 * Builds permission overwrites enforcing the @CORE View-Only Invariant.
 *
 * @param {object} params
 * @param {string} params.everyoneRoleId
 * @param {string} params.coreRoleId - Role ID for @CORE (Staff / Executive)
 * @param {string} params.memberRoleId - Role ID for Team Member
 * @param {string} params.mentorRoleId - Role ID for Team Mentor
 * @returns {Array<object>} Discord permission overwrites array
 */
export function buildTeamChannelOverwrites({
  everyoneRoleId,
  coreRoleId,
  memberRoleId,
  mentorRoleId,
}) {
  const overwrites = [];

  // 1. @everyone: Completely hidden
  if (everyoneRoleId) {
    overwrites.push({
      id: everyoneRoleId,
      deny: [PermissionFlagsBits.ViewChannel],
    });
  }

  // 2. @CORE View-Only Invariant: Can view & read history, but CANNOT talk or react
  if (coreRoleId) {
    overwrites.push({
      id: coreRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],
      deny: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
        PermissionFlagsBits.Speak,
      ],
    });
  }

  // 3. Team Member: Full collaboration access
  if (memberRoleId) {
    overwrites.push({
      id: memberRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ],
    });
  }

  // 4. Team Mentor: Full collaboration + moderation within room
  if (mentorRoleId) {
    overwrites.push({
      id: mentorRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.PrioritySpeaker,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  return overwrites;
}

/**
 * Provisions Discord Roles for a new Team:
 * 1. `${eventName} - Team ${teamNumber} - Member` (Google Blue, non-hoisted)
 * 2. `${eventName} - Team ${teamNumber} - Mentor` (Google Yellow, hoisted)
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} eventName
 * @param {number|string} teamNumber
 * @returns {Promise<{ memberRole: import('discord.js').Role, mentorRole: import('discord.js').Role }>}
 */
export async function createTeamRoles(guild, eventName, teamNumber) {
  if (!guild?.roles) {
    throw new Error('Valid Discord guild with role manager is required to provision roles');
  }

  const paddedNum = String(teamNumber).padStart(2, '0');
  const memberRoleName = `${eventName} - Team ${paddedNum} - Member`;
  const mentorRoleName = `${eventName} - Team ${paddedNum} - Mentor`;

  // 1. Create Member Role
  const memberRole = await guild.roles.create({
    name: memberRoleName,
    color: GOOGLE_COLORS.BLUE,
    hoist: false,
    mentionable: true,
    reason: `Automated team role provisioning for ${eventName} Team ${paddedNum}`,
  });

  // 2. Create Mentor Role
  const mentorRole = await guild.roles.create({
    name: mentorRoleName,
    color: GOOGLE_COLORS.YELLOW,
    hoist: true,
    mentionable: true,
    reason: `Automated mentor role provisioning for ${eventName} Team ${paddedNum}`,
  });

  return { memberRole, mentorRole };
}

/**
 * Assigns a role to a guild member.
 */
export async function assignRoleToMember(guild, userId, roleId) {
  if (!guild || !userId || !roleId) return false;
  try {
    const member = await guild.members.fetch(userId);
    if (!member) return false;
    await member.roles.add(roleId);
    return true;
  } catch (error) {
    console.error(`[ROLE] Failed to assign role ${roleId} to user ${userId}:`, error);
    return false;
  }
}

/**
 * Removes a role from a guild member.
 */
export async function removeRoleFromMember(guild, userId, roleId) {
  if (!guild || !userId || !roleId) return false;
  try {
    const member = await guild.members.fetch(userId);
    if (!member) return false;
    await member.roles.remove(roleId);
    return true;
  } catch (error) {
    console.error(`[ROLE] Failed to remove role ${roleId} from user ${userId}:`, error);
    return false;
  }
}

/**
 * Deletes team roles when a team is removed.
 */
export async function deleteTeamRoles(guild, memberRoleId, mentorRoleId) {
  if (!guild?.roles) return;
  const promises = [];

  if (memberRoleId) {
    promises.push(
      guild.roles.delete(memberRoleId, 'Team deleted from event').catch((err) => {
        console.warn(`[ROLE] Could not delete member role ${memberRoleId}:`, err.message);
      })
    );
  }

  if (mentorRoleId) {
    promises.push(
      guild.roles.delete(mentorRoleId, 'Team deleted from event').catch((err) => {
        console.warn(`[ROLE] Could not delete mentor role ${mentorRoleId}:`, err.message);
      })
    );
  }

  await Promise.allSettled(promises);
}
