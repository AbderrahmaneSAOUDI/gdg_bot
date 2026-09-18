import { resolveColor, GOOGLE_COLORS } from './colors.js';

/**
 * GDG Ghardaia Department & Squad Configuration.
 *
 * CRITICAL INVARIANT:
 * GDG Ghardaia departments/teams have their own official colors.
 * These colors are provided separately by the project owner and must be preserved exactly.
 *
 * DO NOT guess, modify, approximate, or replace team colors.
 * The project owner will provide the exact team names and hex colors from the provided reference image.
 * Team colors should ONLY be used when displaying information specifically related to that team/department.
 */
export const teams = {
  CORE: {
    name: 'Core Leadership',
    color: '#4285F4',
    description: 'Chapter Lead, Co-Leads, and Executive Operations',
  },
  TECH: {
    name: 'Tech & Development',
    color: '#34A853',
    description: 'Workshops, Codelabs, Open Source, and Platform tooling',
  },
  DESIGN: {
    name: 'Design & Media',
    color: '#EA4335',
    description: 'Branding, visual assets, video production, and social creatives',
  },
  MARKETING: {
    name: 'Marketing & Content',
    color: '#FBBC04',
    description: 'Social media campaigns, announcements, and copy',
  },
  LOGISTICS: {
    name: 'Logistics & Operations',
    color: '#FF6D00',
    description: 'Venue management, hardware, equipment & catering',
  },
  COMMUNITY: {
    name: 'Community & Relations',
    color: '#4285F4',
    description: 'Speaker outreach, sponsorships, and member onboarding',
  },
};

/**
 * Retrieve team configuration by key (case-insensitive).
 *
 * @param {string} teamKey
 * @returns {{ name: string, color: string, description?: string } | null}
 */
export function getTeam(teamKey) {
  if (!teamKey || typeof teamKey !== 'string') return null;
  const normalizedKey = teamKey.trim().toUpperCase();
  return teams[normalizedKey] || null;
}

/**
 * Retrieve team color as an integer compatible with Discord Embeds.
 * Falls back to Google Blue if team is not found or color is invalid.
 *
 * @param {string} teamKey
 * @param {number} [fallbackColor=GOOGLE_COLORS.BLUE]
 * @returns {number}
 */
export function getTeamColor(teamKey, fallbackColor = GOOGLE_COLORS.BLUE) {
  const team = getTeam(teamKey);
  if (!team?.color) return fallbackColor;
  return resolveColor(team.color, fallbackColor);
}

/**
 * Checks if a team key exists in the configuration.
 *
 * @param {string} teamKey
 * @returns {boolean}
 */
export function isValidTeam(teamKey) {
  if (!teamKey || typeof teamKey !== 'string') return false;
  return Boolean(teams[teamKey.trim().toUpperCase()]);
}

/**
 * Returns all configured teams as an array of objects including their key.
 *
 * @returns {Array<{ key: string, name: string, color: string, description?: string }>}
 */
export function getAllTeams() {
  return Object.entries(teams).map(([key, value]) => ({
    key,
    ...value,
  }));
}
