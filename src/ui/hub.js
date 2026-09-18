import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

// Official Google & GDG Brand Colors
export const BRAND_COLORS = {
  BLUE: 0x4285f4,
  RED: 0xea4335,
  YELLOW: 0xfbbc04,
  GREEN: 0x34a853,
  DARK: 0x202124,
};

/**
 * Creates the navigation button rows for the Main Team Hub.
 * Row 1: [👥 My Team] [📅 Meetings] [🎯 Activities]
 * Row 2: [📚 Knowledge] [📋 Requests]
 * Row 3: [👤 My Profile] [⚙️ More]
 */
export function createHubActionRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hub:team')
      .setLabel('My Team')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('hub:meetings')
      .setLabel('Meetings')
      .setEmoji('📅')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('hub:activities')
      .setLabel('Activities')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hub:knowledge')
      .setLabel('Knowledge')
      .setEmoji('📚')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('hub:requests')
      .setLabel('Requests')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hub:profile')
      .setLabel('My Profile')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('hub:more')
      .setLabel('More')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

/**
 * Creates a standard back navigation row for sub-views.
 */
export function createBackActionRow(extraButtons = []) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hub:main')
      .setLabel('Back to Hub')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary),
    ...extraButtons
  );
  return [row];
}

/**
 * Formats the Main Dashboard view payload.
 */
export function getHubPayload(user, member) {
  const displayName = member?.displayName || user.displayName || user.username;

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.BLUE)
    .setTitle('GDG Ghardaia — Team Hub')
    .setDescription(
      `### Welcome, ${displayName}!\n\n` +
      'Your centralized portal for GDG Ghardaia community operations, activities, and resources.\n\n' +
      '**Quick Navigation:**\n' +
      '• **👥 My Team** — Squads, departments & directory\n' +
      '• **📅 Meetings** — Upcoming syncs & schedules\n' +
      '• **🎯 Activities** — Active projects & workshops\n' +
      '• **📚 Knowledge** — Docs, guidelines & assets\n' +
      '• **📋 Requests** — Equipment, logistics & proposals\n\n' +
      '• **👤 My Profile** — Your roles & activity\n' +
      '• **⚙️ More** — Settings, stats & bot tools'
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
    .setFooter({
      text: 'GDG Ghardaia • Commands are for bootstrapping. UI is for everything else.',
      iconURL: member?.guild?.iconURL({ dynamic: true }) || undefined,
    })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createHubActionRows(),
  };
}

/**
 * Formats the Team view payload.
 */
export function getTeamPayload(user, member) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.GREEN)
    .setTitle('👥 My Team — GDG Ghardaia')
    .setDescription(
      'Our community is organized into specialized squads collaborating to deliver world-class developer events and learning experiences.\n\n' +
      '### 🏗️ Departments & Squads\n' +
      '• **💻 Tech & Development**: Workshops, Codelabs, Open Source, and Platform tooling.\n' +
      '• **🎨 Design & Media**: Branding, visual assets, video production, and social creatives.\n' +
      '• **📢 Marketing & Content**: Social media campaigns, announcements, and copy.\n' +
      '• **📦 Logistics & Operations**: Venue management, hardware, equipment & catering.\n' +
      '• **🤝 Community & Relations**: Speaker outreach, sponsorships, and member onboarding.'
    )
    .addFields(
      {
        name: '🌟 Core Leadership',
        value: 'Chapter Lead • Co-Leads • Squad Managers',
        inline: true,
      },
      {
        name: '📍 Chapter',
        value: '[gdg.community.dev/gdg-ghardaia](https://gdg.community.dev/gdg-ghardaia/)',
        inline: true,
      }
    )
    .setFooter({ text: 'GDG Ghardaia • Team Directory' })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Meetings view payload.
 */
export function getMeetingsPayload(user, member) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.YELLOW)
    .setTitle('📅 Meetings & Syncs — GDG Ghardaia')
    .setDescription(
      'Stay synced with your squad and the entire organizing team.\n\n' +
      '### 🗓️ Regular Sync Schedules\n' +
      '• **Weekly Core Sync**: Every Saturday @ 20:00 (Discord Stage / Google Meet)\n' +
      '• **Tech Squad Huddle**: Bi-weekly Wednesday @ 21:00\n' +
      '• **Logistics & Event Sync**: On-demand prior to major milestones (DevFest, Solution Challenge)\n\n' +
      '### 💡 Meeting Invariants\n' +
      '1. Agendas are posted 24h in advance.\n' +
      '2. Action items and meeting notes are documented after each session.\n' +
      '3. Respect time limits and keep discussions goal-oriented.'
    )
    .setFooter({ text: 'GDG Ghardaia • Calendar & Syncs' })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Activities view payload.
 */
export function getActivitiesPayload(user, member) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.RED)
    .setTitle('🎯 Activities & Milestones — GDG Ghardaia')
    .setDescription(
      'Track our flagship initiatives, upcoming workshops, and ongoing community hackathons.\n\n' +
      '### 🚀 Active Initiatives\n' +
      '• **🎉 DevFest Ghardaia**: Annual flagship developer conference.\n' +
      '• **🌍 Solution Challenge**: Mentoring local student teams building for UN SDGs.\n' +
      '• **⚡ Hands-on Codelabs**: Flutter, Cloud, Firebase, and AI/Machine Learning sessions.\n' +
      '• **🤖 Community Discord Bot**: Automated operations, equipment tracking, and member hub.'
    )
    .addFields({
      name: '📌 How to Contribute',
      value: 'Pick a task in your squad backlog or propose a new workshop session in the Requests tab!',
    })
    .setFooter({ text: 'GDG Ghardaia • Activities & Projects' })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Knowledge view payload.
 */
export function getKnowledgePayload(user, member) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.BLUE)
    .setTitle('📚 Knowledge Base & Resources — GDG Ghardaia')
    .setDescription(
      'Canonical documentation, guidelines, and toolkits for organizing team members.\n\n' +
      '### 🔗 Essential Links\n' +
      '• [Official Chapter Page](https://gdg.community.dev/gdg-ghardaia/)\n' +
      '• [GitHub Organization](https://github.com/AbderrahmaneSAOUDI/gdg_bot)\n' +
      '• [Google Developer Groups Program Guidelines](https://developers.google.com/community/gdg)\n\n' +
      '### 📂 Resource Repository\n' +
      '• **GDG Brand Identity**: Official logos, color palettes, and slide deck templates\n' +
      '• **Event Playbook**: Checklists for venue setup, sound, live streaming, and ticketing\n' +
      '• **Speaker Guide**: Onboarding external and internal tech speakers'
    )
    .setFooter({ text: 'GDG Ghardaia • Knowledge Base' })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Requests view payload.
 */
export function getRequestsPayload(user, member) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.YELLOW)
    .setTitle('📋 Team Requests & Logistics — GDG Ghardaia')
    .setDescription(
      'Submit and manage requests across squads without administrative bottlenecks.\n\n' +
      '### 📝 Request Types\n' +
      '• **🎥 Equipment & Hardware**: Microphones, cameras, cables, and development boards.\n' +
      '• **💡 Workshop Proposals**: Pitch a topic or codelab to host for the community.\n' +
      '• **🏷️ Budget & Swag**: Badges, stickers, banners, and catering approvals.\n' +
      '• **📣 Announcement Requests**: Request social media coverage for squad milestones.'
    )
    .setFooter({ text: 'GDG Ghardaia • Requests Portal' })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createBackActionRow(),
  };
}

/**
 * Formats the Profile view payload.
 */
export function getProfilePayload(user, member) {
  const roles = member?.roles?.cache
    ? member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .map((r) => `${r.name}`)
        .slice(0, 10)
        .join(', ') || 'No special roles assigned'
    : 'N/A';

  const joinedAt = member?.joinedAt
    ? member.joinedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.BLUE)
    .setTitle(`👤 Profile: ${member?.displayName || user.username}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      {
        name: '🆔 User Tag',
        value: `\`${user.tag}\``,
        inline: true,
      },
      {
        name: '📅 Joined Server',
        value: joinedAt,
        inline: true,
      },
      {
        name: '🎖️ Server Roles',
        value: roles,
        inline: false,
      }
    )
    .setFooter({ text: 'GDG Ghardaia • Member Profile' })
    .setTimestamp();

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

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.DARK)
    .setTitle('⚙️ More & System Settings')
    .setDescription(
      'GDG Ghardaia Discord Automation Bot.\n\n' +
      '**Design Principle:**\n' +
      '> *"Commands are for bootstrapping. UI is for everything else."*\n\n' +
      `**System Status:**\n` +
      `• **Bot Latency**: \`${ping}ms\`\n` +
      `• **Uptime**: \`${uptimeString}\`\n` +
      `• **Environment**: \`discord.js v14 • Node.js ${process.version}\`\n` +
      (isAdmin
        ? '\n🛡️ **Admin Tools**: You can deploy a persistent Team Hub message to the current channel below.'
        : '')
    )
    .setFooter({ text: 'GDG Ghardaia • Settings' })
    .setTimestamp();

  const extraButtons = [];
  if (isAdmin) {
    extraButtons.push(
      new ButtonBuilder()
        .setCustomId('hub:deploy_persistent')
        .setLabel('Deploy Persistent Hub Here')
        .setEmoji('📌')
        .setStyle(ButtonStyle.Success)
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
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.BLUE)
    .setTitle('🌐 GDG Ghardaia — Team Hub')
    .setDescription(
      'Welcome to the official **GDG Ghardaia** Team Hub.\n\n' +
      'Click any button below to launch your private, interactive session. ' +
      'You can browse squad information, meetings, project activities, knowledge documents, and submit requests without typing any commands!\n\n' +
      '👉 *Your interaction is private and ephemeral — it won\'t clutter this channel.*'
    )
    .addFields(
      {
        name: '👥 My Team',
        value: 'Squads, departments & core leads',
        inline: true,
      },
      {
        name: '📅 Meetings',
        value: 'Sync schedules & agenda notes',
        inline: true,
      },
      {
        name: '🎯 Activities',
        value: 'Active projects & hackathons',
        inline: true,
      },
      {
        name: '📚 Knowledge',
        value: 'Guides, assets & official links',
        inline: true,
      },
      {
        name: '📋 Requests',
        value: 'Equipment & workshop proposals',
        inline: true,
      },
      {
        name: '👤 My Profile',
        value: 'Your server roles & member stats',
        inline: true,
      }
    )
    .setFooter({
      text: 'GDG Ghardaia • Permanent Team Hub • Click any button to start',
    })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hub:main')
      .setLabel('Open Team Hub')
      .setEmoji('🚀')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('hub:team')
      .setLabel('My Team')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('hub:meetings')
      .setLabel('Meetings')
      .setEmoji('📅')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hub:activities')
      .setLabel('Activities')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('hub:knowledge')
      .setLabel('Knowledge')
      .setEmoji('📚')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('hub:requests')
      .setLabel('Requests')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}
