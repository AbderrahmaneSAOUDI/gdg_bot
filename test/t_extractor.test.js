import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ChannelType, PermissionFlagsBits, ButtonStyle, Collection } from 'discord.js';

import { sanitizeName } from '../src/utils/f_sanitizer.js';
import {
  CUSTOM_IDS,
  BUTTON_LABELS,
  EMOJIS,
} from '../src/config/index.js';
import {
  createExtractButton,
  createHubActionRows,
  getHubPayload,
} from '../src/ui/index.js';
import {
  formatMessageJson,
  formatMessageTranscriptLine,
  extractRoleOverwrites,
  formatServerInfo,
  formatRoleInfo,
  extractServerData,
  fetchAllMessagesFromCreation,
} from '../src/features/srv_extractor.js';
import { EXTRACTOR_MESSAGES } from '../src/messages/msg_extractor.js';

test('1. Filesystem Name Sanitizer', async (t) => {
  await t.test('replaces invalid characters with underscores', () => {
    const raw = 'announcements: general / chat? *test* <foo> | "bar"';
    const sanitized = sanitizeName(raw);
    assert.ok(!/[<>:"/\\|?*]/.test(sanitized), 'Sanitized string contains no invalid characters');
    assert.strictEqual(sanitized, 'announcements_ general _ chat_ _test_ _foo_ _ _bar_');
  });

  await t.test('handles whitespace and empty input fallbacks', () => {
    assert.strictEqual(sanitizeName('   '), 'unnamed');
    assert.strictEqual(sanitizeName(null), 'unnamed');
    assert.strictEqual(sanitizeName(undefined, 'fallback_name'), 'fallback_name');
  });

  await t.test('truncates strings longer than 100 characters', () => {
    const longName = 'a'.repeat(120);
    const sanitized = sanitizeName(longName);
    assert.strictEqual(sanitized.length, 100);
  });
});

test('2. UI Button & Hub Action Rows', async (t) => {
  await t.test('createExtractButton builds valid Secondary button', () => {
    const button = createExtractButton();
    const json = button.toJSON();
    assert.strictEqual(json.style, ButtonStyle.Secondary);
    assert.strictEqual(json.custom_id, CUSTOM_IDS.HUB_EXTRACT_SERVER);
    assert.strictEqual(json.label, BUTTON_LABELS.EXTRACT_SERVER);
    assert.strictEqual(json.emoji.name, EMOJIS.EXPORT);
  });

  await t.test('createHubActionRows excludes extract button when not admin', () => {
    const rows = createHubActionRows(false);
    const allButtons = rows.flatMap((r) => r.components);
    assert.strictEqual(allButtons.length, 5, 'Regular member sees the five public feature buttons');
    const extractBtn = allButtons.find((b) => b.data.custom_id === CUSTOM_IDS.HUB_EXTRACT_SERVER);
    assert.strictEqual(extractBtn, undefined);
  });

  await t.test('createHubActionRows includes extract button when admin', () => {
    const rows = createHubActionRows(true);
    const allButtons = rows.flatMap((r) => r.components);
    assert.strictEqual(allButtons.length, 9, 'Admin sees public features, management screens, and extract server');
    const extractBtn = allButtons.find((b) => b.data.custom_id === CUSTOM_IDS.HUB_EXTRACT_SERVER);
    assert.ok(extractBtn, 'Extract server button exists for admin');
  });

  await t.test('getHubPayload detects admin permissions dynamically', () => {
    const mockUser = {
      username: 'admin_user',
      displayName: 'Admin User',
      displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/1/avatar.png',
    };

    const mockAdminMember = {
      displayName: 'Admin Member',
      permissions: {
        has: (perm) => perm === PermissionFlagsBits.Administrator,
      },
    };

    const mockRegularMember = {
      displayName: 'Regular Member',
      permissions: {
        has: () => false,
      },
    };

    const adminPayload = getHubPayload(mockUser, mockAdminMember);
    const regularPayload = getHubPayload(mockUser, mockRegularMember);

    const adminButtons = adminPayload.components.flatMap((r) => r.components);
    const regularButtons = regularPayload.components.flatMap((r) => r.components);

    assert.ok(
      adminButtons.some((b) => b.data.custom_id === CUSTOM_IDS.HUB_EXTRACT_SERVER),
      'Admin payload has extract button'
    );
    assert.ok(
      !regularButtons.some((b) => b.data.custom_id === CUSTOM_IDS.HUB_EXTRACT_SERVER),
      'Regular payload does not have extract button'
    );
  });
});

test('3. Server Extractor Data Formatters', async (t) => {
  await t.test('formatMessageJson correctly maps message properties', () => {
    const mockMsg = {
      id: '123456789',
      author: {
        id: '987654321',
        username: 'alice',
        tag: 'alice#0001',
        bot: false,
      },
      member: {
        displayName: 'Alice In Wonderland',
      },
      createdAt: new Date('2026-01-01T10:00:00Z'),
      createdTimestamp: 1767261600000,
      content: 'Hello GDG community!',
      cleanContent: 'Hello GDG community!',
      pinned: true,
      editedAt: null,
      reference: { messageId: '11111' },
      attachments: new Map([
        [
          'att1',
          {
            id: 'att1',
            name: 'slide.pdf',
            url: 'https://cdn.discordapp.com/attachments/slide.pdf',
            size: 2048,
            contentType: 'application/pdf',
          },
        ],
      ]),
      embeds: [{ toJSON: () => ({ title: 'Embedded Card' }) }],
      reactions: {
        cache: new Map([
          ['👍', { emoji: { name: '👍' }, count: 5 }],
        ]),
      },
    };

    const formatted = formatMessageJson(mockMsg);
    assert.strictEqual(formatted.id, '123456789');
    assert.strictEqual(formatted.author.username, 'alice');
    assert.strictEqual(formatted.author.displayName, 'Alice In Wonderland');
    assert.strictEqual(formatted.content, 'Hello GDG community!');
    assert.strictEqual(formatted.pinned, true);
    assert.strictEqual(formatted.replyToId, '11111');
    assert.strictEqual(formatted.attachments.length, 1);
    assert.strictEqual(formatted.attachments[0].name, 'slide.pdf');
    assert.strictEqual(formatted.reactions.length, 1);
    assert.strictEqual(formatted.reactions[0].count, 5);
  });

  await t.test('formatMessageTranscriptLine generates readable text line', () => {
    const formattedMsg = {
      author: { displayName: 'Alice', tag: 'alice#0001' },
      createdAt: '2026-01-01T10:00:00.000Z',
      content: 'Testing line output',
      replyToId: '999',
      attachments: [{ name: 'file.txt', url: 'https://example.com/file.txt' }],
    };

    const line = formatMessageTranscriptLine(formattedMsg);
    assert.ok(line.includes('[2026-01-01 10:00:00] Alice (@alice#0001) (reply to 999): Testing line output'));
    assert.ok(line.includes('[Attachment: file.txt - https://example.com/file.txt]'));
  });

  await t.test('extractRoleOverwrites extracts allow and deny permissions', () => {
    const mockChannel = {
      guild: {
        id: 'guild123',
        roles: {
          cache: new Map([
            ['role1', { name: 'Member' }],
          ]),
        },
      },
      permissionOverwrites: {
        cache: new Map([
          [
            'role1',
            {
              id: 'role1',
              type: 0,
              allow: { toArray: () => ['ViewChannel', 'SendMessages'] },
              deny: { toArray: () => ['ManageMessages'] },
            },
          ],
        ]),
      },
    };

    const overwrites = extractRoleOverwrites(mockChannel);
    assert.strictEqual(overwrites.length, 1);
    assert.strictEqual(overwrites[0].roleId, 'role1');
    assert.strictEqual(overwrites[0].roleName, 'Member');
    assert.deepStrictEqual(overwrites[0].allow, ['ViewChannel', 'SendMessages']);
    assert.deepStrictEqual(overwrites[0].deny, ['ManageMessages']);
  });

  await t.test('formatServerInfo maps guild properties', () => {
    const mockGuild = {
      id: 'guild999',
      name: 'GDG Ghardaia Server',
      description: 'Official GDG Discord',
      ownerId: 'owner123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      createdTimestamp: 1704067200000,
      memberCount: 250,
      iconURL: () => 'https://icon.png',
      bannerURL: () => 'https://banner.png',
      preferredLocale: 'en-US',
      channels: { cache: new Map([['c1', {}], ['c2', {}]]) },
      roles: { cache: new Map([['r1', {}], ['r2', {}]]) },
    };

    const info = formatServerInfo(mockGuild);
    assert.strictEqual(info.id, 'guild999');
    assert.strictEqual(info.name, 'GDG Ghardaia Server');
    assert.strictEqual(info.memberCount, 250);
    assert.strictEqual(info.totalChannels, 2);
    assert.strictEqual(info.totalRoles, 2);
  });
});

test('4. Full Server Data Extraction Pipeline', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gdg-extractor-'));
  t.after(() => fs.rm(tmpDir, { recursive: true, force: true }));

  const mockRoles = new Collection([
    [
      'role_core',
      {
        id: 'role_core',
        name: 'CORE',
        color: 0xea4335,
        hexColor: '#EA4335',
        position: 10,
        rawPosition: 10,
        hoist: true,
        managed: false,
        mentionable: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        permissions: { toArray: () => ['Administrator'] },
      },
    ],
    [
      'role_member',
      {
        id: 'role_member',
        name: 'Member',
        color: 0x5f6368,
        hexColor: '#5F6368',
        position: 1,
        rawPosition: 1,
        hoist: false,
        managed: false,
        mentionable: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        permissions: { toArray: () => ['ViewChannel', 'SendMessages'] },
      },
    ],
  ]);

  // In Discord's API, channel.messages.fetch() returns newest-first
  const mockMessages = [
    {
      id: 'm2',
      author: { id: 'u2', username: 'jane', tag: 'jane#5678', bot: false },
      member: { displayName: 'Jane Doe' },
      createdAt: new Date('2024-02-01T12:05:00Z'),
      content: 'Second message in thread',
      cleanContent: 'Second message in thread',
      pinned: false,
      attachments: new Map(),
      embeds: [],
      reactions: { cache: new Map() },
    },
    {
      id: 'm1',
      author: { id: 'u1', username: 'john', tag: 'john#1234', bot: false },
      member: { displayName: 'John Doe' },
      createdAt: new Date('2024-02-01T12:00:00Z'),
      content: 'Initial message on creation',
      cleanContent: 'Initial message on creation',
      pinned: false,
      attachments: new Map(),
      embeds: [],
      reactions: { cache: new Map() },
    },
  ];

  const mockCategory = {
    id: 'cat_events',
    name: 'Events & Hackathons',
    type: ChannelType.GuildCategory,
    position: 1,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    permissionOverwrites: {
      cache: new Map([
        [
          'role_core',
          {
            id: 'role_core',
            type: 0,
            allow: { toArray: () => ['ViewChannel'] },
            deny: { toArray: () => [] },
          },
        ],
      ]),
    },
  };

  const mockTextChannel = {
    id: 'ch_announcements',
    name: 'announcements',
    type: ChannelType.GuildText,
    topic: 'Official community announcements',
    position: 1,
    nsfw: false,
    rateLimitPerUser: 0,
    parentId: 'cat_events',
    createdAt: new Date('2024-01-16T00:00:00Z'),
    isTextBased: () => true,
    permissionOverwrites: {
      cache: new Map([
        [
          'role_member',
          {
            id: 'role_member',
            type: 0,
            allow: { toArray: () => ['ViewChannel', 'ReadMessageHistory'] },
            deny: { toArray: () => ['SendMessages'] },
          },
        ],
      ]),
    },
    messages: {
      // Simulate pagination: return all mockMessages in first batch, then empty batch
      fetch: async (options) => {
        if (!options.before) {
          return new Collection(mockMessages.map((m) => [m.id, m]));
        }
        return new Collection();
      },
    },
  };

  const mockVoiceChannel = {
    id: 'ch_stage',
    name: 'Main Stage',
    type: ChannelType.GuildVoice,
    bitrate: 64000,
    userLimit: 50,
    position: 2,
    parentId: 'cat_events',
    createdAt: new Date('2024-01-16T00:00:00Z'),
    isTextBased: () => false,
    permissionOverwrites: { cache: new Map() },
  };

  const mockGuild = {
    id: 'guild_gdg',
    name: 'GDG Ghardaia',
    description: 'Community server',
    ownerId: 'owner_1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    createdTimestamp: 1704067200000,
    memberCount: 150,
    preferredLocale: 'en-US',
    iconURL: () => 'https://example.com/icon.png',
    bannerURL: () => null,
    roles: { cache: mockRoles, fetch: async () => mockRoles },
    channels: {
      fetch: async () => mockGuild.channels.cache,
      cache: new Collection([
        ['cat_events', mockCategory],
        ['ch_announcements', mockTextChannel],
        ['ch_stage', mockVoiceChannel],
      ]),
    },
  };

  const progressUpdates = [];
  const stats = await extractServerData({
    guild: mockGuild,
    outputDir: tmpDir,
    onProgress: (p) => progressUpdates.push(p),
  });

  await t.test('extractServerData returns accurate summary metrics', () => {
    assert.strictEqual(stats.totalRoles, 2);
    assert.strictEqual(stats.totalCategories, 1);
    assert.strictEqual(stats.totalChannels, 2);
    assert.strictEqual(stats.textChannels, 1);
    assert.strictEqual(stats.voiceChannels, 1);
    assert.strictEqual(stats.totalMessages, 2);
    assert.strictEqual(stats.outputDir, tmpDir);
    assert.ok(progressUpdates.length > 0, 'Progress callback fired');
  });

  await t.test('server_info.json and roles.json are written correctly', async () => {
    const serverInfoRaw = await fs.readFile(path.join(tmpDir, 'server_info.json'), 'utf-8');
    const serverInfo = JSON.parse(serverInfoRaw);
    assert.strictEqual(serverInfo.id, 'guild_gdg');
    assert.strictEqual(serverInfo.name, 'GDG Ghardaia');

    const rolesRaw = await fs.readFile(path.join(tmpDir, 'roles.json'), 'utf-8');
    const roles = JSON.parse(rolesRaw);
    assert.strictEqual(roles.length, 2);
    assert.strictEqual(roles[0].name, 'CORE');
  });

  await t.test('categories and child channels folders are structured properly', async () => {
    const catDir = path.join(tmpDir, 'Events & Hackathons');
    const catInfoRaw = await fs.readFile(path.join(catDir, '_category_info.json'), 'utf-8');
    const catInfo = JSON.parse(catInfoRaw);
    assert.strictEqual(catInfo.id, 'cat_events');
    assert.strictEqual(catInfo.name, 'Events & Hackathons');

    // Text channel folder
    const textDir = path.join(catDir, '#announcements');
    const textInfoRaw = await fs.readFile(path.join(textDir, 'channel_info.json'), 'utf-8');
    const textInfo = JSON.parse(textInfoRaw);
    assert.strictEqual(textInfo.name, 'announcements');
    assert.strictEqual(textInfo.rolePermissions.length, 1);
    assert.deepStrictEqual(textInfo.rolePermissions[0].deny, ['SendMessages']);

    // Messages JSON
    const messagesRaw = await fs.readFile(path.join(textDir, 'messages.json'), 'utf-8');
    const messages = JSON.parse(messagesRaw);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].content, 'Initial message on creation');
    assert.strictEqual(messages[1].content, 'Second message in thread');

    // Human-readable transcript
    const transcript = await fs.readFile(path.join(textDir, 'transcript.txt'), 'utf-8');
    assert.ok(transcript.includes('Channel: #announcements'));
    assert.ok(transcript.includes('Total Messages: 2'));
    assert.ok(transcript.includes('John Doe (@john#1234): Initial message on creation'));

    // Voice channel folder
    const voiceDir = path.join(catDir, '🔊 Main Stage');
    const voiceInfoRaw = await fs.readFile(path.join(voiceDir, 'voice_info.json'), 'utf-8');
    const voiceInfo = JSON.parse(voiceInfoRaw);
    assert.strictEqual(voiceInfo.bitrate, 64000);
    assert.strictEqual(voiceInfo.userLimit, 50);

    // Global matrix
    const matrixRaw = await fs.readFile(path.join(tmpDir, 'channel_role_matrix.json'), 'utf-8');
    const matrix = JSON.parse(matrixRaw);
    assert.strictEqual(matrix.length, 2);
  });

});

test('message history walks every page in chronological order and refuses a repeating cursor', async () => {
  const message = (id) => ({ id: String(id), content: `Message ${id}` });
  const batch = (from, count) => new Collection(Array.from({ length: count }, (_, index) => {
    const entry = message(from - index);
    return [entry.id, entry];
  }));
  const calls = [];
  const channel = { id: 'paged', messages: { fetch: async (options) => {
    calls.push(options);
    if (!options.before) return batch(205, 100);
    if (options.before === '106') return batch(105, 100);
    if (options.before === '6') return batch(5, 5);
    throw new Error('Unexpected pagination cursor');
  } } };
  const messages = await fetchAllMessagesFromCreation(channel);
  assert.equal(messages.length, 205);
  assert.deepEqual(messages.map((entry) => entry.id), Array.from({ length: 205 }, (_, index) => String(index + 1)));
  assert.deepEqual(calls.map((call) => call.before), [undefined, '106', '6']);
  let repeated = 0;
  await assert.rejects(fetchAllMessagesFromCreation({ id: 'repeating', messages: { fetch: async () => { repeated++; return batch(100, 100); } } }), (error) => {
    assert.equal(error.code, 'MESSAGE_HISTORY_INCOMPLETE');
    assert.equal(error.messages.length, 100);
    assert.match(error.cause.message, /did not advance/);
    return true;
  });
  assert.equal(repeated, 2);
});

test('extractor refreshes directories, retains partial history, and reports failed histories truthfully', async (t) => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gdg-extractor-partial-'));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  const freshRole = { id: 'fresh-role', name: 'Current Role', position: 1 };
  const history = Array.from({ length: 100 }, (_, index) => ({ id: String(100 - index), content: `Message ${100 - index}` }));
  const partial = { id: 'partial', name: 'partial', type: ChannelType.GuildText, parentId: 'unavailable-category', position: 0,
    isTextBased: () => true,
    messages: { fetch: async ({ before }) => {
      if (before) throw Object.assign(new Error('Missing Read Message History'), { code: 50013 });
      return new Collection(history.map((entry) => [entry.id, entry]));
    } },
  };
  const denied = { id: 'denied', name: 'denied', type: ChannelType.GuildText, position: 1, isTextBased: () => true,
    messages: { fetch: async () => { throw Object.assign(new Error('Missing Access'), { code: 50001 }); } },
  };
  const empty = { id: 'empty', name: 'empty', type: ChannelType.GuildText, position: 2, isTextBased: () => true,
    messages: { fetch: async () => new Collection() },
  };
  let missingPermissionFetches = 0;
  const missingPermission = { id: 'unreadable', name: 'unreadable', type: ChannelType.GuildText, position: 3, isTextBased: () => true,
    permissionsFor: () => ({ has: (permission) => permission === PermissionFlagsBits.ViewChannel }),
    messages: { fetch: async () => { missingPermissionFetches++; return new Collection(); } },
  };
  const freshChannels = new Collection([partial, denied, empty, missingPermission].map((channel) => [channel.id, channel]));
  const calls = [];
  const guild = { id: 'guild', name: 'Test Guild',
    roles: { cache: new Collection([['stale-role', { id: 'stale-role', name: 'Deleted Role', position: 2 }]]), fetch: async () => { calls.push('roles'); return new Collection([[freshRole.id, freshRole]]); } },
    channels: { cache: new Collection(), fetch: async () => { calls.push('channels'); return freshChannels; } },
    members: { fetchMe: async (options) => { assert.equal(options.force, true); return { id: 'bot' }; } },
  };
  const stats = await extractServerData({ guild, outputDir });
  assert.deepEqual(calls.sort(), ['channels', 'roles']);
  assert.equal(stats.complete, false);
  assert.equal(stats.failedMessageChannels, 2);
  assert.equal(stats.partialMessageChannels, 1);
  assert.equal(stats.totalChannels, 4);
  assert.equal(stats.totalRoles, 1);
  assert.equal(stats.totalMessages, 100);
  const readJson = async (...parts) => JSON.parse(await fs.readFile(path.join(outputDir, ...parts), 'utf-8'));
  assert.deepEqual((await readJson('roles.json')).map((role) => role.id), ['fresh-role']);
  assert.equal((await readJson('server_info.json')).totalChannels, 4);
  assert.equal((await readJson('channel_role_matrix.json')).length, 4);
  assert.equal((await readJson('_uncategorized', '#partial', 'messages.json')).length, 100);
  assert.equal((await readJson('_uncategorized', '#partial', 'message_history_status.json')).status, 'PARTIAL');
  assert.equal((await readJson('_uncategorized', '#denied', 'message_history_status.json')).errorCode, 50001);
  assert.equal((await readJson('_uncategorized', '#empty', 'message_history_status.json')).status, 'COMPLETE');
  assert.equal((await readJson('_uncategorized', '#unreadable', 'message_history_status.json')).errorCode, 'HISTORY_PERMISSION_MISSING');
  assert.equal(missingPermissionFetches, 0);
  assert.equal((await readJson('extraction_report.json')).complete, false);
  const transcript = await fs.readFile(path.join(outputDir, '_uncategorized', '#denied', 'transcript.txt'), 'utf-8');
  assert.match(transcript, /History Status: FAILED/);
  assert.match(transcript, /could not be read/);
  assert.doesNotMatch(transcript, /No messages were returned/);
  const response = EXTRACTOR_MESSAGES.SUCCESS_DESC(stats);
  assert.match(response, /partial server export/);
  assert.match(response, /Incomplete Message Histories:\*\* 3/);
  assert.doesNotMatch(response, /complete server data/);
});

test('extractor stops before writing output when the REST directory cannot be read', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gdg-extractor-unavailable-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const outputDir = path.join(directory, 'export');
  const guild = { id: 'guild', roles: { fetch: async () => { throw new Error('REST directory unavailable'); } }, channels: { fetch: async () => new Collection() } };
  await assert.rejects(extractServerData({ guild, outputDir }), /REST directory unavailable/);
  await assert.rejects(fs.stat(outputDir), { code: 'ENOENT' });
});
