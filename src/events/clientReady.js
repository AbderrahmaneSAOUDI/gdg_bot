import { Events, ActivityType, ChannelType, PermissionFlagsBits } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.log(`[READY] Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [
      {
        name: 'GDG Ghardaia Discord Server',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });

  try {
    let targetChannel = null;
    const startupChannelId = process.env.STARTUP_CHANNEL_ID;

    // If a specific channel ID is configured in .env, try to fetch it first
    if (startupChannelId) {
      const channel = await client.channels.fetch(startupChannelId).catch(() => null);
      if (
        channel &&
        channel.isTextBased?.() &&
        channel.permissionsFor(client.user)?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ])
      ) {
        targetChannel = channel;
      } else if (channel) {
        console.warn(`⚠️ [READY] Bot lacks permission to send messages in STARTUP_CHANNEL_ID (${startupChannelId}).`);
      } else {
        console.warn(`⚠️ [READY] Channel with STARTUP_CHANNEL_ID (${startupChannelId}) not found.`);
      }
    }

    // Otherwise, discover the first writable text channel in the target guild
    if (!targetChannel) {
      const guildId = process.env.GUILD_ID;
      let guild = guildId ? client.guilds.cache.get(guildId) : null;

      if (!guild && guildId) {
        guild = await client.guilds.fetch(guildId).catch(() => null);
      }

      if (!guild) {
        guild = client.guilds.cache.first();
      }

      if (!guild) {
        console.warn('⚠️ [READY] The bot is not in any server/guild yet.');
        return;
      }

      const channels = await guild.channels.fetch().catch(() => null);

      if (channels) {
        // Prioritize standard text channels (GuildText) where the bot has send permissions
        const textChannels = channels.filter(
          (channel) =>
            channel &&
            channel.type === ChannelType.GuildText &&
            channel.permissionsFor(client.user)?.has([
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ])
        );

        targetChannel = textChannels.sort((a, b) => a.rawPosition - b.rawPosition).first();

        // Fallback to any text-based channel if no standard GuildText channel is found
        if (!targetChannel) {
          targetChannel = channels
            .filter(
              (channel) =>
                channel &&
                channel.isTextBased?.() &&
                channel.permissionsFor(client.user)?.has([
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ])
            )
            .sort((a, b) => a.rawPosition - b.rawPosition)
            .first();
        }
      }
    }

    if (targetChannel) {
      await targetChannel.send('hi');
      console.log(`📢 [READY] Sent "hi" on startup to #${targetChannel.name} (ID: ${targetChannel.id})!`);
    } else {
      console.warn('⚠️ [READY] No writable text channel found to send startup greeting.');
    }
  } catch (error) {
    console.error('❌ [READY] Error sending startup message:', error);
  }
}

