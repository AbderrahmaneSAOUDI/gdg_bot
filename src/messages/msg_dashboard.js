/**
 * Centralized Dashboard & Hub User-Facing Strings.
 */

export const DASHBOARD_MESSAGES = Object.freeze({
  HUB_TITLE: 'GDG Ghardaia — Team Hub',
  PERSISTENT_HUB_TITLE: '🌐 GDG Ghardaia — Team Hub',
  HUB_TAGLINE:
    'Commands are for bootstrapping. UI is for everything else.',
  HUB_FOOTER: 'GDG Ghardaia • Team Hub',
  PERSISTENT_FOOTER: 'GDG Ghardaia • Permanent Team Hub • Click any button to start',
  WELCOME_GREETING: (name) => `### Welcome, ${name}!\n\nYour centralized portal for GDG Ghardaia community operations, activities, and resources.`,
  QUICK_NAVIGATION_HEADER: '**Quick Navigation:**',
  PERSISTENT_DESCRIPTION:
    'Welcome to the official **GDG Ghardaia** Team Hub.\n\nClick any button below to launch your private, interactive session. Browse knowledge documents and access your member profile without typing commands!\n\n👉 *Your interaction is private and ephemeral — it will not clutter this channel.*',
  SECTIONS: {
    KNOWLEDGE: 'Docs, guidelines & assets',
    PROFILE: 'Your server roles & member stats',
    TEAM: 'Squads, departments & directory',
    MEETINGS: 'Upcoming syncs & schedules',
    ACTIVITIES: 'Active projects & workshops',
    REQUESTS: 'Equipment, logistics & proposals',
    MORE: 'Settings, stats & bot tools',
  },
  FORMAT_HUB_DESCRIPTION: (displayName) =>
    `### Welcome, ${displayName}!\n\n` +
    'Your centralized portal for GDG Ghardaia community operations and resources.\n\n' +
    '**Quick Navigation:**\n' +
    '• **📚 Knowledge** — Docs, guidelines & assets\n' +
    '• **👤 My Profile** — Your server roles & member stats',
});
