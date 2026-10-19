import {
  addTeam as dbAddTeam,
  deleteTeam as dbDeleteTeam,
  assignMembers as dbAssignMembers,
  assignMentors as dbAssignMentors,
  getEventById,
} from '../data/json_events.js';
import {
  createTeamRoles,
  deleteTeamRoles,
  assignRoleToMember,
} from './srv_roles.js';

/**
 * Creates a new team for an event, automatically provisioning Discord roles.
 *
 * @param {object} params
 * @param {import('discord.js').Guild} [params.guild]
 * @param {string} params.eventId
 * @param {string} [params.name]
 * @param {number} [params.number]
 */
export async function createTeamWithRoles({
  guild,
  eventId,
  name,
  number,
}) {
  const event = getEventById(eventId);
  if (!event) throw new Error(`Event '${eventId}' not found.`);

  const calculatedNum =
    number ||
    (event.teams.length > 0
      ? Math.max(...event.teams.map((t) => t.number || 0)) + 1
      : 1);

  let memberRoleId = null;
  let mentorRoleId = null;

  // If running in live Discord Guild context, provision roles
  if (guild?.roles) {
    try {
      const { memberRole, mentorRole } = await createTeamRoles(
        guild,
        event.name,
        calculatedNum
      );
      memberRoleId = memberRole?.id || null;
      mentorRoleId = mentorRole?.id || null;
    } catch (err) {
      console.error('[SERVICE] Failed to auto-create Discord roles:', err);
    }
  }

  const newTeam = dbAddTeam(eventId, {
    name,
    number: calculatedNum,
    memberRoleId,
    mentorRoleId,
  });

  return newTeam;
}

/**
 * Removes a team from an event and cleans up roles in Discord.
 */
export async function removeTeamWithRoles({ guild, eventId, teamId }) {
  const event = getEventById(eventId);
  if (!event) return null;

  const team = event.teams.find((t) => t.id === teamId);
  if (!team) return null;

  // Clean up Discord roles
  if (guild?.roles && (team.memberRoleId || team.mentorRoleId)) {
    await deleteTeamRoles(guild, team.memberRoleId, team.mentorRoleId);
  }

  return dbDeleteTeam(eventId, teamId);
}

/**
 * Assigns multiple members to a team and adds their Discord role.
 */
export async function assignMembersWithRoles({
  guild,
  eventId,
  teamId,
  userIds = [],
}) {
  const event = getEventById(eventId);
  if (!event) return null;

  const team = event.teams.find((t) => t.id === teamId);
  if (!team) return null;

  if (guild && team.memberRoleId) {
    for (const uid of userIds) {
      await assignRoleToMember(guild, uid, team.memberRoleId);
    }
  }

  return dbAssignMembers(eventId, teamId, userIds);
}

/**
 * Assigns multiple mentors to a team and adds their hoisted Discord role.
 */
export async function assignMentorsWithRoles({
  guild,
  eventId,
  teamId,
  userIds = [],
}) {
  const event = getEventById(eventId);
  if (!event) return null;

  const team = event.teams.find((t) => t.id === teamId);
  if (!team) return null;

  if (guild && team.mentorRoleId) {
    for (const uid of userIds) {
      await assignRoleToMember(guild, uid, team.mentorRoleId);
    }
  }

  return dbAssignMentors(eventId, teamId, userIds);
}
