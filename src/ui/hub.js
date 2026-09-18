import {
  ActionRowBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { GOOGLE_COLORS } from '../config/colors.js';
import { EMOJIS } from '../config/emojis.js';
import {
  createPrimaryButton,
  createSecondaryButton,
  createSuccessButton,
  createBackButton,
} from './components/buttons.js';
import {
  createStandardEmbed,
  createProfileEmbed,
} from './embeds/embedBuilder.js';
import { DASHBOARD_MESSAGES } from '../messages/dashboard.js';

// Backward-compatible alias for existing code
export const BRAND_COLORS = GOOGLE_COLORS;

/**
 * Creates the navigation button rows for the Main Team Hub.
 * Row 1: [👥 My Team] [📅 Meetings] [🎯 Activities]
 * Row 2: [📚 Knowledge] [📋 Requests]
 * Row 3: [👤 My Profile] [⚙️ More]
 */
export function createHubActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    createPrimaryButton({
      customId: 'hub:team',
      label: 'My Team',
      emoji: EMOJIS.TEAM,
    }),
    createPrimaryButton({
      customId: 'hub:meetings',
      label: 'Meetings',
      emoji: EMOJIS.MEETING,
    }),
    createPrimaryButton({
      customId: 'hub:activities',
      label: 'Activities',
      emoji: EMOJIS.ACTIVITIES,
    })
  );

  const row2 = new ActionRowBuilder().addComponents(
    createPrimaryButton({
      customId: 'hub:knowledge',
      label: 'Knowledge',
      emoji: EMOJIS.RESOURCE,
    }),
    createPrimaryButton({
      customId: 'hub:requests',
      label: 'Requests',
      emoji: EMOJIS.REQUESTS,
    })
  );

  const row3 = new ActionRowBuilder().addComponents(
    createSecondaryButton({
      customId: 'hub:profile',
      label: 'My Profile',
      emoji: EMOJIS.PROFILE,
    }),
    createSecondaryButton({
      customId: 'hub:more',
      label: 'More',
      emoji: EMOJIS.SETTINGS,
    })
  );

  return [row1, row2, row3];
}

/**
 * Creates a standard back navigation row for sub-views.
 */
export function createBackActionRow(extraButtons = []) {
  const backButton = createBackButton({
    customId: 'hub:main',
    label: 'Back to Hub',
  });

  const row = new ActionRowBuilder().addComponents(backButton, ...extraButtons);
  return [row];
}

/**
 * Formats the Main Dashboard view payload.
 */
export function getHubPayload(user, member) {
  const displayName = member?.displayName || user.displayName || user.username;

  const description =
    DASHBOARD_MESSAGES.WELCOME_GREETING(displayName) +
    '\n\n' +
    '**Quick Navigation:**\n' +
    `• **${EMOJIS.TEAM} My Team** — ${DASHBOARD_MESSAGES.SECTIONS.TEAM}\n` +
    `• **${EMOJIS.MEETING} Meetings** — ${DASHBOARD_MESSAGES.SECTIONS.MEETINGS}\n` +
    `• **${EMOJIS.ACTIVITIES} Activities** — ${DASHBOARD_MESSAGES.SECTIONS.ACTIVITIES}\n` +
    `• **${EMOJIS.RESOURCE} Knowledge** — ${DASHBOARD_MESSAGES.SECTIONS.KNOWLEDGE}\n` +
    `• **${EMOJIS.REQUESTS} Requests** — ${DASHBOARD_MESSAGES.SECTIONS.REQUESTS}\n\n` +
    `• **${EMOJIS.PROFILE} My Profile** — ${DASHBOARD_MESSAGES.SECTIONS.PROFILE}\n` +
    `• **${EMOJIS.SETTINGS} More** — ${DASHBOARD_MESSAGES.SECTIONS.MORE}`;

  const embed = createStandardEmbed({
    title: DASHBOARD_MESSAGES.HUB_TITLE,
    description,
    color: GOOGLE_COLORS.BLUE,
    thumbnail: user.displayAvatarURL({ dynamic: true, size: 128 }),
    footerText: `GDG Ghardaia • ${DASHBOARD_MESSAGES.HUB_TAGLINE}`,
    footerIconUrl: member?.guild?.iconURL({ dynamic: true }) || undefined,
  });

  return {
    embeds: [embed],
    components: createHubActionRows(),
  };
}

/**
 * Formats the Team view payload.
 */
export function getTeamPayload(user, member) {
  const embed = createStandardEmbed({
    title: '👥 My Team — GDG Ghardaia',
    description:
      'Our community is driven by a unified Core Team and specialized departments collaborating to deliver world-class developer events and learning experiences.\n\n' +
      '### 🌟 Core Team\n' +
      '• **President** *(Red)*\n' +
      '• **Vice President** *(Red)*\n' +
      '• **SG** *(Red)*\n' +
      '• **HR** *(Red)*\n' +
      '• **Relations** *(Yellow)*\n' +
      '• **Logistics** *(Brown)*\n' +
      '• **Media** *(Blue)*\n' +
      '• **Design** *(Green)*\n' +
      '• **Dev** *(Purple)*\n\n' +
      '### 🏗️ Departments\n' +
      '• **📢 Relations Department** *(Yellow)*: Partnerships, sponsorships & speaker outreach\n' +
      '• **📦 Logistics Department** *(Brown)*: Equipment, hardware, venues & catering\n' +
      '• **🎥 Media Department** *(Blue)*: Photography, videography & media production\n' +
      '• **🎨 Design Department** *(Green)*: Branding, UI/UX, graphics & social assets\n' +
      '• **💻 Dev Department** *(Purple)*: Workshops, Codelabs, Open Source & platforms',
    color: GOOGLE_COLORS.GREEN,
    fields: [
      {
        name: '🌟 Core Team Order',
        value: 'President • Vice President • SG • HR • Relations • Logistics • Media • Design • Dev',
        inline: false,
      },
      {
        name: '📍 Chapter',
        value: '[gdg.community.dev/gdg-ghardaia](https://gdg.community.dev/gdg-ghardaia/)',
        inline: true,
      },
    ],
    footerText: 'GDG Ghardaia • Team Directory',
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Meetings view payload.
 */
export function getMeetingsPayload(user, member) {
  const embed = createStandardEmbed({
    title: '📅 Meetings & Syncs — GDG Ghardaia',
    description:
      'Stay synced with your squad and the entire organizing team.\n\n' +
      '### 🗓️ Regular Sync Schedules\n' +
      '• **Weekly Core Sync**: Every Saturday @ 20:00 (Discord Stage / Google Meet)\n' +
      '• **Tech Squad Huddle**: Bi-weekly Wednesday @ 21:00\n' +
      '• **Logistics & Event Sync**: On-demand prior to major milestones (DevFest, Solution Challenge)\n\n' +
      '### 💡 Meeting Invariants\n' +
      '1. Agendas are posted 24h in advance.\n' +
      '2. Action items and meeting notes are documented after each session.\n' +
      '3. Respect time limits and keep discussions goal-oriented.',
    color: GOOGLE_COLORS.YELLOW,
    footerText: 'GDG Ghardaia • Calendar & Syncs',
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Activities view payload.
 */
export function getActivitiesPayload(user, member) {
  const embed = createStandardEmbed({
    title: '🎯 Activities & Milestones — GDG Ghardaia',
    description:
      'Track our flagship initiatives, upcoming workshops, and ongoing community hackathons.\n\n' +
      '### 🚀 Active Initiatives\n' +
      '• **🎉 DevFest Ghardaia**: Annual flagship developer conference.\n' +
      '• **🌍 Solution Challenge**: Mentoring local student teams building for UN SDGs.\n' +
      '• **⚡ Hands-on Codelabs**: Flutter, Cloud, Firebase, and AI/Machine Learning sessions.\n' +
      '• **🤖 Community Discord Bot**: Automated operations, equipment tracking, and member hub.',
    color: GOOGLE_COLORS.RED,
    fields: [
      {
        name: '📌 How to Contribute',
        value: 'Pick a task in your squad backlog or propose a new workshop session in the Requests tab!',
      },
    ],
    footerText: 'GDG Ghardaia • Activities & Projects',
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Knowledge view payload.
 */
export function getKnowledgePayload(user, member) {
  const embed = createStandardEmbed({
    title: '📚 Knowledge Base & Resources — GDG Ghardaia',
    description:
      'Canonical documentation, guidelines, and toolkits for organizing team members.\n\n' +
      '### 🔗 Essential Links\n' +
      '• [Official Chapter Page](https://gdg.community.dev/gdg-ghardaia/)\n' +
      '• [GitHub Organization](https://github.com/AbderrahmaneSAOUDI/gdg_bot)\n' +
      '• [Google Developer Groups Program Guidelines](https://developers.google.com/community/gdg)\n\n' +
      '### 📂 Resource Repository\n' +
      '• **GDG Brand Identity**: Official logos, color palettes, and slide deck templates\n' +
      '• **Event Playbook**: Checklists for venue setup, sound, live streaming, and ticketing\n' +
      '• **Speaker Guide**: Onboarding external and internal tech speakers',
    color: GOOGLE_COLORS.BLUE,
    footerText: 'GDG Ghardaia • Knowledge Base',
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Requests view payload.
 */
export function getRequestsPayload(user, member) {
  const embed = createStandardEmbed({
    title: '📋 Team Requests & Logistics — GDG Ghardaia',
    description:
      'Submit and manage requests across squads without administrative bottlenecks.\n\n' +
      '### 📝 Request Types\n' +
      '• **🎥 Equipment & Hardware**: Microphones, cameras, cables, and development boards.\n' +
      '• **💡 Workshop Proposals**: Pitch a topic or codelab to host for the community.\n' +
      '• **🏷️ Budget & Swag**: Badges, stickers, banners, and catering approvals.\n' +
      '• **📣 Announcement Requests**: Request social media coverage for squad milestones.',
    color: GOOGLE_COLORS.YELLOW,
    footerText: 'GDG Ghardaia • Requests Portal',
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Profile view payload.
 */
export function getProfilePayload(user, member) {
  const embed = createProfileEmbed({
    user,
    member,
    color: GOOGLE_COLORS.BLUE,
    footerText: 'GDG Ghardaia • Member Profile',
  });

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the More / Settings view payload.
 */
export function getMorePayload(user, member, client) {
  const uptimeSeconds = client?.uptime ? Math.floor(client.uptime / 1000) : 0;
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeString = `${hours}h ${minutes}m`;
  const ping = client?.ws?.ping ?? 0;

  const isAdmin =
    member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has(PermissionFlagsBits.ManageGuild);

  const embed = createStandardEmbed({
    title: '⚙️ More & System Settings',
    description:
      'GDG Ghardaia Discord Automation Bot.\n\n' +
      '**Design Principle:**\n' +
      `> *"${DASHBOARD_MESSAGES.HUB_TAGLINE}"*\n\n` +
      `**System Status:**\n` +
      `• **Bot Latency**: \`${ping}ms\`\n` +
      `• **Uptime**: \`${uptimeString}\`\n` +
      `• **Environment**: \`discord.js v14 • Node.js ${process.version}\`\n` +
      (isAdmin
        ? '\n🛡️ **Admin Tools**: You can deploy a persistent Team Hub message to the current channel below.'
        : ''),
    color: GOOGLE_COLORS.DARK,
    footerText: 'GDG Ghardaia • Settings',
  });

  const extraButtons = [];
  if (isAdmin) {
    extraButtons.push(
      createSuccessButton({
        customId: 'hub:deploy_persistent',
        label: 'Deploy Persistent Hub Here',
        emoji: EMOJIS.PIN,
      })
    );
  }

  return {
    embeds: [embed],
    components: createBackActionRow(extraButtons),
  };
}

/**
 * Formats the Public Persistent Hub payload deployed to a dedicated channel.
 */
export function getPersistentHubPayload() {
  const embed = createStandardEmbed({
    title: DASHBOARD_MESSAGES.PERSISTENT_HUB_TITLE,
    description: DASHBOARD_MESSAGES.PERSISTENT_DESCRIPTION,
    color: GOOGLE_COLORS.BLUE,
    fields: [
      {
        name: `${EMOJIS.TEAM} My Team`,
        value: 'Squads, departments & core team',
        inline: true,
      },
      {
        name: `${EMOJIS.MEETING} Meetings`,
        value: 'Sync schedules & agenda notes',
        inline: true,
      },
      {
        name: `${EMOJIS.ACTIVITIES} Activities`,
        value: 'Active projects & hackathons',
        inline: true,
      },
      {
        name: `${EMOJIS.RESOURCE} Knowledge`,
        value: 'Guides, assets & official links',
        inline: true,
      },
      {
        name: `${EMOJIS.REQUESTS} Requests`,
        value: 'Equipment & workshop proposals',
        inline: true,
      },
      {
        name: `${EMOJIS.PROFILE} My Profile`,
        value: 'Your server roles & member stats',
        inline: true,
      },
    ],
    footerText: 'GDG Ghardaia • Permanent Team Hub • Click any button to start',
  });

  const row1 = new ActionRowBuilder().addComponents(
    createPrimaryButton({
      customId: 'hub:main',
      label: 'Open Team Hub',
      emoji: EMOJIS.DASHBOARD,
    }),
    createSecondaryButton({
      customId: 'hub:team',
      label: 'My Team',
      emoji: EMOJIS.TEAM,
    }),
    createSecondaryButton({
      customId: 'hub:meetings',
      label: 'Meetings',
      emoji: EMOJIS.MEETING,
    })
  );

  const row2 = new ActionRowBuilder().addComponents(
    createSecondaryButton({
      customId: 'hub:activities',
      label: 'Activities',
      emoji: EMOJIS.ACTIVITIES,
    }),
    createSecondaryButton({
      customId: 'hub:knowledge',
      label: 'Knowledge',
      emoji: EMOJIS.RESOURCE,
    }),
    createSecondaryButton({
      customId: 'hub:requests',
      label: 'Requests',
      emoji: EMOJIS.REQUESTS,
    })
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}
