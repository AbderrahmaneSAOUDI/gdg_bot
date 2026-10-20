import fs from 'node:fs/promises';
import path from 'node:path';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { sanitizeName } from '../utils/f_sanitizer.js';
import { EXTRACTOR_MESSAGES } from '../messages/msg_extractor.js';

/**
 * Formats a Discord message into structured JSON record.
 *
 * @param {import('discord.js').Message} message
 * @returns {object}
 */
export function formatMessageJson(message) {
  return {
    id: message.id,
    author: {
      id: message.author?.id || 'unknown',
      username: message.author?.username || 'Unknown',
      displayName: message.member?.displayName || message.author?.displayName || message.author?.username || 'Unknown',
      tag: message.author?.tag || undefined,
      bot: Boolean(message.author?.bot),
    },
    createdAt: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
    createdTimestamp: message.createdTimestamp || 0,
    content: message.content || '',
    cleanContent: message.cleanContent || '',
    pinned: Boolean(message.pinned),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    replyToId: message.reference?.messageId || null,
    attachments: message.attachments
      ? Array.from(message.attachments.values()).map((att) => ({
          id: att.id,
          name: att.name,
          url: att.url,
          size: att.size,
          contentType: att.contentType,
        }))
      : [],
    embeds: message.embeds
      ? message.embeds.map((e) => (typeof e.toJSON === 'function' ? e.toJSON() : e))
      : [],
    reactions: message.reactions?.cache
      ? Array.from(message.reactions.cache.values()).map((r) => ({
          emoji: r.emoji.name,
          count: r.count,
        }))
      : [],
  };
}

/**
 * Formats a single message line for a readable text transcript.
 *
 * @param {object} msg - Formatted or raw message object
 * @returns {string}
 */
export function formatMessageTranscriptLine(msg) {
  const authorName = msg.author?.displayName || msg.author?.username || 'Unknown';
  const authorTag = msg.author?.tag ? ` (@${msg.author.tag})` : '';
  const timestamp = msg.createdAt ? msg.createdAt.replace('T', ' ').substring(0, 19) : 'Unknown Time';
  const replyInfo = msg.replyToId ? ` (reply to ${msg.replyToId})` : '';

  let body = msg.content || msg.cleanContent || '';
  if (!body && msg.embeds && msg.embeds.length > 0) {
    const embedDescs = msg.embeds
      .map((e) => e.description || e.title || '')
      .filter(Boolean)
      .join(' | ');
    if (embedDescs) body = `[Embed: ${embedDescs}]`;
  }

  let line = `[${timestamp}] ${authorName}${authorTag}${replyInfo}: ${body}`;

  if (msg.attachments && msg.attachments.length > 0) {
    const attachmentLines = msg.attachments.map((a) => `\n  [Attachment: ${a.name} - ${a.url}]`).join('');
    line += attachmentLines;
  }

  return line;
}

/**
 * Extracts and formats role permission overwrites for a channel.
 *
 * @param {import('discord.js').GuildChannel} channel
 * @param {import('discord.js').Collection<string, import('discord.js').Role>} [guildRoles]
 * @returns {Array<{ roleId: string, roleName: string, allow: string[], deny: string[] }>}
 */
export function extractRoleOverwrites(channel, guildRoles) {
  if (!channel?.permissionOverwrites?.cache) {
    return [];
  }

  const overwrites = [];
  for (const ow of channel.permissionOverwrites.cache.values()) {
    // Discord overwrite types: 0 is Role, 1 is Member
    const isRole = ow.type === 0 || ow.type === 'role';
    if (!isRole) continue;

    const isEveryone = ow.id === channel.guild?.id;
    const roleName = isEveryone
      ? '@everyone'
      : (guildRoles?.get?.(ow.id)?.name || channel.guild?.roles?.cache?.get(ow.id)?.name || 'Unknown Role');

    overwrites.push({
      roleId: ow.id,
      roleName,
      allow: typeof ow.allow?.toArray === 'function' ? ow.allow.toArray() : [],
      deny: typeof ow.deny?.toArray === 'function' ? ow.deny.toArray() : [],
    });
  }

  return overwrites;
}

/**
 * Formats server metadata for export.
 *
 * @param {import('discord.js').Guild} guild
 * @returns {object}
 */
export function formatServerInfo(guild) {
  return {
    id: guild.id,
    name: guild.name,
    description: guild.description || null,
    ownerId: guild.ownerId,
    createdAt: guild.createdAt ? guild.createdAt.toISOString() : null,
    createdTimestamp: guild.createdTimestamp || 0,
    memberCount: guild.memberCount || 0,
    iconURL: guild.iconURL ? guild.iconURL({ dynamic: true, size: 512 }) : null,
    bannerURL: guild.bannerURL ? guild.bannerURL({ dynamic: true, size: 1024 }) : null,
    preferredLocale: guild.preferredLocale || 'en-US',
    totalChannels: guild.channels?.cache?.size || 0,
    totalRoles: guild.roles?.cache?.size || 0,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Formats role information for export.
 *
 * @param {import('discord.js').Role} role
 * @returns {object}
 */
export function formatRoleInfo(role) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hexColor: role.hexColor,
    position: role.position,
    rawPosition: role.rawPosition,
    hoist: Boolean(role.hoist),
    managed: Boolean(role.managed),
    mentionable: Boolean(role.mentionable),
    createdAt: role.createdAt ? role.createdAt.toISOString() : null,
    permissions: typeof role.permissions?.toArray === 'function' ? role.permissions.toArray() : [],
  };
}

/**
 * Fetches all messages from a text channel from the creation of the server/channel.
 * Paginates backward in batches of 100 until reaching the channel's beginning.
 *
 * @param {import('discord.js').TextBasedChannel} channel
 * @returns {Promise<Array<import('discord.js').Message>>}
 */
export async function fetchAllMessagesFromCreation(channel) {
  if (!channel || typeof channel.messages?.fetch !== 'function') {
    return [];
  }

  const allMessages = [];
  const seenMessages = new Set();
  const cursors = new Set();
  let lastMessageId = null;

  try {
    while (true) {
      const fetchOptions = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }

      const batch = await channel.messages.fetch(fetchOptions);
      if (!batch || batch.size === 0) {
        break;
      }

      for (const msg of batch.values()) {
        if (!seenMessages.has(msg.id)) {
          seenMessages.add(msg.id);
          allMessages.push(msg);
        }
      }

      if (batch.size < 100) {
        break;
      }
      const nextCursor = batch.last()?.id;
      if (!nextCursor || cursors.has(nextCursor)) throw new Error('Message history pagination did not advance.');
      cursors.add(nextCursor);
      lastMessageId = nextCursor;
    }
  } catch (error) {
    const failure = new Error(`Message history is incomplete for ${channel.id}.`, { cause: error });
    failure.code = 'MESSAGE_HISTORY_INCOMPLETE';
    failure.messages = allMessages.reverse();
    throw failure;
  }

  // Reverse so array is chronologically sorted from oldest (creation) to newest
  allMessages.reverse();
  return allMessages;
}

/**
 * Orchestrates full server data extraction:
 * - Server info (`server_info.json`)
 * - Roles list (`roles.json`)
 * - Global channel-role permission matrix (`channel_role_matrix.json`)
 * - Categories as folders with `_category_info.json`
 * - Channels as subfolders with `channel_info.json`, `messages.json`, and `transcript.txt`
 * - Voice rooms with `voice_info.json` and permissions
 *
 * @param {object} options
 * @param {import('discord.js').Guild} options.guild
 * @param {string} [options.outputDir]
 * @param {Function} [options.onProgress]
 * @returns {Promise<{
 *   guildId: string,
 *   guildName: string,
 *   totalRoles: number,
 *   totalCategories: number,
 *   totalChannels: number,
 *   textChannels: number,
 *   voiceChannels: number,
 *   totalMessages: number,
 *   outputDir: string,
 * }>}
 */
export async function extractServerData({
  guild,
  outputDir = path.resolve(process.cwd(), 'server_data'),
  onProgress = () => {},
}) {
  if (!guild) {
    throw new Error('A valid Discord Guild must be provided to extract server data.');
  }

  onProgress({ stage: 'roles', message: 'Reading server metadata and roles...' });

  // Directory fetches use REST results directly: the managers can retain deleted
  // cache entries and may not yet contain channels created since startup.
  const [guildRoles, guildChannels] = await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  const botMember = guild.members?.fetchMe ? await guild.members.fetchMe({ force: true }) : guild.members?.me;
  const channels = Array.from(guildChannels.values()).filter(Boolean);
  await fs.mkdir(outputDir, { recursive: true });

  // 2. Export Server Info
  const serverInfo = { ...formatServerInfo(guild), totalChannels: channels.length, totalRoles: guildRoles.size };
  await fs.writeFile(
    path.join(outputDir, 'server_info.json'),
    JSON.stringify(serverInfo, null, 2),
    'utf-8'
  );

  // 3. Export Roles
  const rolesList = Array.from(guildRoles.values())
    .sort((a, b) => b.position - a.position)
    .map(formatRoleInfo);

  await fs.writeFile(
    path.join(outputDir, 'roles.json'),
    JSON.stringify(rolesList, null, 2),
    'utf-8'
  );

  // 4. Organize Channels by Category
  const categories = channels.filter((c) => c.type === ChannelType.GuildCategory);
  const nonCategories = channels.filter((c) => c.type !== ChannelType.GuildCategory);

  // Sort categories by position
  categories.sort((a, b) => a.position - b.position);

  // Build Global Channel-Role Permission Matrix
  const channelRoleMatrix = [];

  let textChannelsCount = 0;
  let voiceChannelsCount = 0;
  let totalMessagesCount = 0;
  const messageHistory = [];

  async function readChannelHistory(channel, channelDir) {
    if (typeof channel.messages?.fetch !== 'function') return { messages: [], history: null };
    let messages, history;
    try {
      if (botMember && typeof channel.permissionsFor === 'function') {
        const permissions = channel.permissionsFor(botMember);
        if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.ReadMessageHistory)) {
          throw Object.assign(new Error(EXTRACTOR_MESSAGES.HISTORY_PERMISSION_MISSING), { code: 'HISTORY_PERMISSION_MISSING' });
        }
      }
      messages = await fetchAllMessagesFromCreation(channel);
      history = { channelId: channel.id, channelName: channel.name, status: 'COMPLETE', messagesExported: messages.length };
    } catch (error) {
      messages = error.messages || [];
      history = { channelId: channel.id, channelName: channel.name, status: messages.length ? 'PARTIAL' : 'FAILED', messagesExported: messages.length, errorCode: error.cause?.code || error.code, errorMessage: error.cause?.message || error.message };
    }
    messageHistory.push(history);
    await fs.writeFile(path.join(channelDir, 'message_history_status.json'), JSON.stringify(history, null, 2), 'utf-8');
    return { messages, history };
  }

  // Track created folders to handle name collisions
  const createdFolders = new Set();
  function getUniqueFolderName(baseDir, name) {
    let candidate = sanitizeName(name);
    let full = path.join(baseDir, candidate);
    let counter = 1;
    while (createdFolders.has(full)) {
      candidate = `${sanitizeName(name)}_${counter}`;
      full = path.join(baseDir, candidate);
      counter++;
    }
    createdFolders.add(full);
    return candidate;
  }

  // Helper to process a single channel
  async function processChannel(channel, parentDir, categoryName = 'None') {
    const rolePermissions = extractRoleOverwrites(channel, guildRoles);
    const isVoice =
      channel.type === ChannelType.GuildVoice ||
      channel.type === ChannelType.GuildStageVoice;
    const isText = channel.isTextBased?.();

    channelRoleMatrix.push({
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.type,
      category: categoryName,
      rolePermissions,
    });

    if (isVoice) {
      voiceChannelsCount++;
      const folderName = getUniqueFolderName(parentDir, `🔊 ${channel.name}`);
      const channelDir = path.join(parentDir, folderName);
      await fs.mkdir(channelDir, { recursive: true });

      const voiceInfo = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        bitrate: channel.bitrate,
        userLimit: channel.userLimit,
        position: channel.position,
        parentId: channel.parentId,
        category: categoryName,
        createdAt: channel.createdAt ? channel.createdAt.toISOString() : null,
        rolePermissions,
      };

      await fs.writeFile(
        path.join(channelDir, 'voice_info.json'),
        JSON.stringify(voiceInfo, null, 2),
        'utf-8'
      );

      // If voice channel has text messages
      if (isText) {
        const { messages: rawMessages, history } = await readChannelHistory(channel, channelDir);
        if (history) {
          totalMessagesCount += rawMessages.length;
          const formatted = rawMessages.map(formatMessageJson);
          await fs.writeFile(
            path.join(channelDir, 'messages.json'),
            JSON.stringify(formatted, null, 2),
            'utf-8'
          );

          const transcriptLines = [
            '='.repeat(80),
            `Voice Channel Chat: ${channel.name} (${channel.id})`,
            `Category: ${categoryName}`,
            `Exported At: ${new Date().toISOString()}`,
            `Total Messages: ${formatted.length}`,
            `History Status: ${history.status}`,
            ...(history.errorMessage ? [`History Error: ${history.errorMessage}`] : []),
            '='.repeat(80),
            '',
            ...formatted.map(formatMessageTranscriptLine),
          ];

          await fs.writeFile(
            path.join(channelDir, 'transcript.txt'),
            transcriptLines.join('\n'),
            'utf-8'
          );
        }
      }
    } else {
      // Text / Announcement / Forum / Thread channels
      textChannelsCount++;
      const folderName = getUniqueFolderName(parentDir, `#${channel.name}`);
      const channelDir = path.join(parentDir, folderName);
      await fs.mkdir(channelDir, { recursive: true });

      const channelInfo = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        topic: channel.topic || null,
        position: channel.position,
        nsfw: Boolean(channel.nsfw),
        rateLimitPerUser: channel.rateLimitPerUser || 0,
        parentId: channel.parentId,
        category: categoryName,
        createdAt: channel.createdAt ? channel.createdAt.toISOString() : null,
        rolePermissions,
      };

      await fs.writeFile(
        path.join(channelDir, 'channel_info.json'),
        JSON.stringify(channelInfo, null, 2),
        'utf-8'
      );

      // Fetch all messages from creation of the channel/server
      const { messages: rawMessages, history } = await readChannelHistory(channel, channelDir);
      totalMessagesCount += rawMessages.length;
      const formatted = rawMessages.map(formatMessageJson);

      await fs.writeFile(
        path.join(channelDir, 'messages.json'),
        JSON.stringify(formatted, null, 2),
        'utf-8'
      );

      const transcriptLines = [
        '='.repeat(80),
        `Channel: #${channel.name} (${channel.id})`,
        `Category: ${categoryName}`,
        `Topic: ${channel.topic || 'No topic'}`,
        `Exported At: ${new Date().toISOString()}`,
        `Total Messages: ${formatted.length}`,
        ...(history ? [`History Status: ${history.status}`] : []),
        ...(history?.errorMessage ? [`History Error: ${history.errorMessage}`] : []),
        '='.repeat(80),
        '',
        ...(formatted.length > 0
          ? formatted.map(formatMessageTranscriptLine)
          : [history?.status === 'FAILED' ? EXTRACTOR_MESSAGES.HISTORY_UNAVAILABLE : history ? EXTRACTOR_MESSAGES.NO_MESSAGES : EXTRACTOR_MESSAGES.NO_MESSAGE_HISTORY]),
      ];

      await fs.writeFile(
        path.join(channelDir, 'transcript.txt'),
        transcriptLines.join('\n'),
        'utf-8'
      );
    }
  }

  // 5. Process Categorized Channels
  let channelIndex = 0;
  const totalChannelsCount = nonCategories.length;

  for (const cat of categories) {
    const catFolderName = getUniqueFolderName(outputDir, cat.name);
    const catDir = path.join(outputDir, catFolderName);
    await fs.mkdir(catDir, { recursive: true });

    const catRolePermissions = extractRoleOverwrites(cat, guildRoles);
    const catInfo = {
      id: cat.id,
      name: cat.name,
      position: cat.position,
      createdAt: cat.createdAt ? cat.createdAt.toISOString() : null,
      rolePermissions: catRolePermissions,
    };

    await fs.writeFile(
      path.join(catDir, '_category_info.json'),
      JSON.stringify(catInfo, null, 2),
      'utf-8'
    );

    const childChannels = nonCategories
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => a.position - b.position);

    for (const child of childChannels) {
      channelIndex++;
      onProgress({
        stage: 'channels',
        current: channelIndex,
        total: totalChannelsCount,
        channelName: child.name,
      });

      await processChannel(child, catDir, cat.name);
    }
  }

  // 6. Process Uncategorized Channels
  const uncategorizedChannels = nonCategories
    .filter((c) => !c.parentId || !categories.some((category) => category.id === c.parentId))
    .sort((a, b) => a.position - b.position);

  if (uncategorizedChannels.length > 0) {
    const uncatDir = path.join(outputDir, '_uncategorized');
    await fs.mkdir(uncatDir, { recursive: true });

    for (const ch of uncategorizedChannels) {
      channelIndex++;
      onProgress({
        stage: 'channels',
        current: channelIndex,
        total: totalChannelsCount,
        channelName: ch.name,
      });

      await processChannel(ch, uncatDir, 'Uncategorized');
    }
  }

  // 7. Write the global permission matrix
  await fs.writeFile(
    path.join(outputDir, 'channel_role_matrix.json'),
    JSON.stringify(channelRoleMatrix, null, 2),
    'utf-8'
  );

  const stats = {
    guildId: guild.id,
    guildName: guild.name,
    totalRoles: rolesList.length,
    totalCategories: categories.length,
    totalChannels: nonCategories.length,
    textChannels: textChannelsCount,
    voiceChannels: voiceChannelsCount,
    totalMessages: totalMessagesCount,
    complete: messageHistory.every((history) => history.status === 'COMPLETE'),
    failedMessageChannels: messageHistory.filter((history) => history.status === 'FAILED').length,
    partialMessageChannels: messageHistory.filter((history) => history.status === 'PARTIAL').length,
    messageHistory,
    scope: EXTRACTOR_MESSAGES.EXPORT_SCOPE,
    outputDir,
  };
  await fs.writeFile(path.join(outputDir, 'extraction_report.json'), JSON.stringify(stats, null, 2), 'utf-8');
  return stats;
}
