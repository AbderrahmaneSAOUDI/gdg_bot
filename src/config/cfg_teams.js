import {
  resolveColor,
  GOOGLE_COLORS,
  GOOGLE_HEX_COLORS,
  DEPARTMENT_HEX_COLORS,
  ROLE_HEX_COLORS,
} from './colors.js';

/**
 * Canonical Club Structure Sort Order:
 * 1. President
 * 2. Vice President
 * 3. SG
 * 4. HR
 * 5. Relations
 * 6. Logistics
 * 7. Media
 * 8. Design
 * 9. Dev
 */
export const CLUB_STRUCTURE_ORDER = Object.freeze([
  'President',
  'Vice President',
  'SG',
  'HR',
  'Relations',
  'Logistics',
  'Media',
  'Design',
  'Dev',
]);

/**
 * GDG Ghardaia Department & Squad Configuration.
 * Sorted canonically: Relations, Logistics, Media, Design, Dev
 */
export const teams = {
  RELATIONS: {
    key: 'RELATIONS',
    name: 'Relations Department',
    shortName: 'Relations',
    color: DEPARTMENT_HEX_COLORS.RELATIONS, // Yellow (#FFD427)
    description: 'Speaker outreach, sponsorships, partnerships, and external relations',
  },
  LOGISTICS: {
    key: 'LOGISTICS',
    name: 'Logistics Department',
    shortName: 'Logistics',
    color: DEPARTMENT_HEX_COLORS.LOGISTICS, // Brown (#A84300)
    description: 'Venue management, hardware, equipment, catering, and operational logistics',
  },
  MEDIA: {
    key: 'MEDIA',
    name: 'Media Department',
    shortName: 'Media',
    color: DEPARTMENT_HEX_COLORS.MEDIA, // Blue (#4285F4)
    description: 'Photography, videography, coverage, and audiovisual production',
  },
  DESIGN: {
    key: 'DESIGN',
    name: 'Design Department',
    shortName: 'Design',
    color: DEPARTMENT_HEX_COLORS.DESIGN, // Green (#34A853)
    description: 'Branding, visual identity, UI/UX, graphics, and social creatives',
  },
  DEV: {
    key: 'DEV',
    name: 'Dev Department',
    shortName: 'Dev',
    color: DEPARTMENT_HEX_COLORS.DEV, // Purple (#A142F4)
    description: 'Workshops, Codelabs, Open Source development, and platform tooling',
  },
};

// Aliases for backwards compatibility
teams.DEVELOPMENT = teams.DEV;

/**
 * Unified Core Team Structure:
 * The Core Team contains President + VP + SG + HR + all departments (Relations, Logistics, Media, Design, Dev).
 * Sorted strictly according to the canonical order.
 */
export const CORE_TEAM = Object.freeze({
  PRESIDENT: {
    key: 'PRESIDENT',
    name: 'President',
    color: ROLE_HEX_COLORS.CORE_TEAM,
    description: 'Chapter Lead & Community President',
  },
  VICE_PRESIDENT: {
    key: 'VICE_PRESIDENT',
    name: 'Vice President',
    color: ROLE_HEX_COLORS.CORE_TEAM,
    description: 'Community Vice President & Strategic Co-Lead',
  },
  SG: {
    key: 'SG',
    name: 'SG',
    color: ROLE_HEX_COLORS.CORE_TEAM,
    description: 'Secretary General — internal documentation & official records',
  },
  HR: {
    key: 'HR',
    name: 'HR',
    color: ROLE_HEX_COLORS.CORE_TEAM,
    description: 'Human Resources & Member Experience',
  },
  RELATIONS: {
    key: 'RELATIONS',
    name: 'Relations',
    color: DEPARTMENT_HEX_COLORS.RELATIONS,
    description: 'Relations Department Co-Manager',
    department: 'RELATIONS',
  },
  LOGISTICS: {
    key: 'LOGISTICS',
    name: 'Logistics',
    color: DEPARTMENT_HEX_COLORS.LOGISTICS,
    description: 'Logistics Department Co-Manager',
    department: 'LOGISTICS',
  },
  MEDIA: {
    key: 'MEDIA',
    name: 'Media',
    color: DEPARTMENT_HEX_COLORS.MEDIA,
    description: 'Media Department Co-Manager',
    department: 'MEDIA',
  },
  DESIGN: {
    key: 'DESIGN',
    name: 'Design',
    color: DEPARTMENT_HEX_COLORS.DESIGN,
    description: 'Design Department Co-Manager',
    department: 'DESIGN',
  },
  DEV: {
    key: 'DEV',
    name: 'Dev',
    color: DEPARTMENT_HEX_COLORS.DEV,
    description: 'Dev Department Co-Manager',
    department: 'DEV',
  },
});

/**
 * GDG Ghardaia Club Structure & Role Specifications.
 */
export const CLUB_ROLES = Object.freeze({
  // Core Team (Unified)
  ...CORE_TEAM,

  // Other Roles
  MEMBER: {
    key: 'MEMBER',
    name: 'Member',
    color: ROLE_HEX_COLORS.MEMBER,
    category: 'General',
    description: 'Community members without specific department assignment',
  },
  ALUMNI: {
    key: 'ALUMNI',
    name: 'Alumni',
    color: ROLE_HEX_COLORS.ALUMNI,
    category: 'General',
    description: 'Former organizing team members and community alumni',
  },
  BOT: {
    key: 'BOT',
    name: 'Bot',
    color: ROLE_HEX_COLORS.BOT,
    category: 'System',
    description: 'Automated bots, integrations, and webhooks',
  },

  // Aliases for compatibility
  SECRETARY_GENERAL: CORE_TEAM.SG,
  DEVELOPMENT: CORE_TEAM.DEV,
});

/**
 * Retrieve team configuration by key (case-insensitive).
 * Accepts 'RELATIONS', 'LOGISTICS', 'MEDIA', 'DESIGN', 'DEV' (or 'DEVELOPMENT').
 *
 * @param {string} teamKey
 * @returns {{ key: string, name: string, shortName: string, color: string, description?: string } | null}
 */
export function getTeam(teamKey) {
  if (!teamKey || typeof teamKey !== 'string') return null;
  const normalizedKey = teamKey.trim().toUpperCase();

  // Alias support
  if (normalizedKey === 'DEVELOPMENT' || normalizedKey === 'TECH') return teams.DEV;
  if (normalizedKey === 'COMMUNITY') return teams.RELATIONS;

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
  return Boolean(getTeam(teamKey));
}

/**
 * Returns all configured teams in canonical order.
 *
 * @returns {Array<{ key: string, name: string, shortName: string, color: string, description?: string }>}
 */
export function getAllTeams() {
  return [teams.RELATIONS, teams.LOGISTICS, teams.MEDIA, teams.DESIGN, teams.DEV];
}

/**
 * Retrieves the official hex color for any role name or key.
 *
 * @param {string} roleName
 * @returns {string} Hex color string
 */
export function getRoleColor(roleName) {
  if (!roleName || typeof roleName !== 'string') return ROLE_HEX_COLORS.MEMBER;
  const normalized = roleName.trim().toLowerCase();

  // 1. Check direct role definitions in CLUB_ROLES
  for (const role of Object.values(CLUB_ROLES)) {
    if (role.name?.toLowerCase() === normalized || role.key?.toLowerCase() === normalized) {
      return role.color;
    }
  }

  // 2. Specific leadership titles matching
  if (normalized === 'president' || normalized === 'vice president' || normalized === 'vp' || normalized === 'sg' || normalized === 'secretary general' || normalized === 'hr') {
    return ROLE_HEX_COLORS.CORE_TEAM;
  }

  // 3. Department matching in canonical order
  if (normalized.includes('relation')) return DEPARTMENT_HEX_COLORS.RELATIONS;
  if (normalized.includes('logistic')) return DEPARTMENT_HEX_COLORS.LOGISTICS;
  if (normalized.includes('media')) return DEPARTMENT_HEX_COLORS.MEDIA;
  if (normalized.includes('design')) return DEPARTMENT_HEX_COLORS.DESIGN;
  if (normalized.includes('dev')) return DEPARTMENT_HEX_COLORS.DEV;

  // 4. Bots & Apps
  if (normalized.includes('bot') || normalized.includes('app')) {
    return ROLE_HEX_COLORS.BOT;
  }

  // 5. Alumni
  if (normalized.includes('alumni') || normalized.includes('old member')) {
    return ROLE_HEX_COLORS.ALUMNI;
  }

  // Default for members
  return ROLE_HEX_COLORS.MEMBER;
}
