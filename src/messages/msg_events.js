import { EMOJIS } from '../config/cfg_emojis.js';

/**
 * Centralized Copy & Message Templates for Events & Competition Teams.
 */
export const EVENT_MESSAGES = Object.freeze({
  DIRECTORY_TITLE: `${EMOJIS.EVENT} Events & Competitions`,
  DIRECTORY_DESCRIPTION: 'Browse active GDG hackathons and competitions, manage participant teams, and allocate mentors.',
  EMPTY_DIRECTORY: `${EMOJIS.EMPTY} No competitions or events currently found. Click "Add Event" to create one.`,
  FOOTER: 'GDG Ghardaia Bot • Competition & Team Hub',

  FORMAT_EVENT_TITLE: (eventName) => `${EMOJIS.EVENT} ${eventName} — Dashboard`,
  FORMAT_TEAMS_TITLE: (eventName) => `${EMOJIS.TEAM} ${eventName} — Teams & Roster`,
  FORMAT_MENTORS_TITLE: (eventName) => `${EMOJIS.MENTOR} ${eventName} — Mentors Directory`,

  CORE_VIEW_ONLY_NOTICE: '🔒 **Staff Invariant**: `@CORE` has view-only access (typing and reactions are disabled).',
  
  ASSIGN_MEMBERS_TITLE: `${EMOJIS.PROFILE} Assign Members to Team`,
  ASSIGN_MEMBERS_DESCRIPTION: 'Select a team and pick members from the native Discord user menu below to grant them the team Member role.',
  
  ASSIGN_MENTORS_TITLE: `${EMOJIS.MENTOR} Assign Mentors to Team`,
  ASSIGN_MENTORS_DESCRIPTION: 'Select a team and pick mentors from the native Discord user menu below to grant them the hoisted Mentor role.',

  TEAM_CREATED: (teamName) => `${EMOJIS.SUCCESS} Successfully created **${teamName}** with Member and Mentor roles!`,
  TEAM_DELETED: (teamName) => `${EMOJIS.DELETE} Successfully deleted **${teamName}** and cleaned up associated roles.`,
  MEMBERS_ASSIGNED: (teamName, count) => `${EMOJIS.SUCCESS} Assigned **${count}** member(s) to **${teamName}** (Member role granted).`,
  MENTORS_ASSIGNED: (teamName, count) => `${EMOJIS.SUCCESS} Assigned **${count}** mentor(s) to **${teamName}** (Mentor role granted).`,

  NO_TEAMS_AVAILABLE: `${EMOJIS.INFO} No teams registered for this event yet. Click "Add Team" to get started!`,
  NO_MENTORS_ASSIGNED: `${EMOJIS.INFO} No mentors allocated to any team yet. Click "Assign Mentors" to assign leaders.`,
});
