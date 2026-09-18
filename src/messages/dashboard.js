/**
 * Centralized Dashboard & Hub User-Facing Strings.
 */

export const DASHBOARD_MESSAGES = Object.freeze({
  HUB_TITLE: 'GDG Ghardaia — Team Hub',
  PERSISTENT_HUB_TITLE: '🌐 GDG Ghardaia — Team Hub',
  HUB_TAGLINE:
    'Commands are for bootstrapping. UI is for everything else.',
  WELCOME_GREETING: (name) => `### Welcome, ${name}!\n\nYour centralized portal for GDG Ghardaia community operations, activities, and resources.`,
  PERSISTENT_DESCRIPTION:
    'Welcome to the official **GDG Ghardaia** Team Hub.\n\nClick any button below to launch your private, interactive session. Browse squads, meetings, activities, knowledge docs, and submit requests without typing commands!\n\n👉 *Your interaction is private and ephemeral — it will not clutter this channel.*',
  SECTIONS: {
    TEAM: 'Squads, departments & directory',
    MEETINGS: 'Upcoming syncs & schedules',
    ACTIVITIES: 'Active projects & workshops',
    KNOWLEDGE: 'Docs, guidelines & assets',
    REQUESTS: 'Equipment, logistics & proposals',
    PROFILE: 'Your roles & activity',
    MORE: 'Settings, stats & bot tools',
  },
});
