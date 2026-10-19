import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUserName,
  formatRoleName,
  formatChannelName,
  formatGuildName,
  KNOWN_MEMBERS,
  KNOWN_ROLES,
  KNOWN_CHANNELS,
} from '../src/utils/index.js';
import { getTeamsPayload, getMentorsPayload } from '../src/ui/index.js';
import { resetEventsStore } from '../src/data/json_events.js';

test('1. Human-Readable Entity Name Formatting', async (t) => {
  await t.test('formatUserName resolves known user ID without mention syntax', () => {
    // Nossiba BOUTEBBA
    const nossiba = formatUserName(null, '1442993500399472710');
    assert.equal(nossiba, 'Nossiba BOUTEBBA');
    assert.equal(nossiba.includes('<@'), false);

    // Youcef BOUZID
    const youcef = formatUserName(null, '898562659228725269');
    assert.equal(youcef, 'Youcef BOUZID');
    assert.equal(youcef.includes('<@'), false);
  });

  await t.test('formatUserName resolves live guild cache first if available', () => {
    const mockGuild = {
      members: {
        cache: new Map([
          ['mock_user_1', { displayName: 'Live Cached User' }],
        ]),
      },
    };

    const name = formatUserName(mockGuild, 'mock_user_1');
    assert.equal(name, 'Live Cached User');
  });

  await t.test('formatUserName provides clean fallback without code tags for unknown user', () => {
    const unknown = formatUserName(null, '9999888877776666');
    assert.equal(unknown, 'User (6666)');
    assert.equal(unknown.includes('<@'), false);
  });

  await t.test('formatRoleName resolves known role ID without mention syntax', () => {
    // Core Role
    const core = formatRoleName(null, '1415741707420696657');
    assert.equal(core, 'Core');

    // Team 1 Mentor Role
    const t1Mentor = formatRoleName(null, '1559995589519867916');
    assert.equal(t1Mentor, 'EventX 3.0 - Team 01 - Mentor');

    // Team 2 Member Role
    const t2Member = formatRoleName(null, '1559995509400408094');
    assert.equal(t2Member, 'EventX 3.0 - Team 02 - Member');
  });

  await t.test('formatChannelName resolves known text and voice channels properly', () => {
    // Team 1 text chat
    const chat = formatChannelName(null, '1559996366720340079');
    assert.equal(chat, '#ex3・1・chat');

    // Team 1 voice room
    const room = formatChannelName(null, '1559996731704475699');
    assert.equal(room, '🔊 ex3・1・room');
  });

  await t.test('formatGuildName returns guild name or GDG Ghardaia default', () => {
    assert.equal(formatGuildName(null), 'GDG Ghardaia');
    assert.equal(formatGuildName({ name: 'GDG Live Server' }), 'GDG Live Server');
  });
});

test('2. UI Payloads guarantee zero raw <@...> code mentions', async (t) => {
  resetEventsStore();

  await t.test('getTeamsPayload contains resolved names and zero raw mention codes', () => {
    // Page 1 (Team 1)
    const payloadP1 = getTeamsPayload('eventx', null, 1);
    assert.ok(payloadP1.embeds?.length > 0);

    const embedJsonP1 = JSON.stringify(payloadP1.embeds[0].toJSON());
    assert.equal(embedJsonP1.includes('<@'), false, 'Teams embed should not contain <@ mentions');
    assert.ok(embedJsonP1.includes('Youcef BOUZID'));
    assert.ok(embedJsonP1.includes('Abdelbassit DOUDOU'));

    // Page 2 (Team 2)
    const payloadP2 = getTeamsPayload('eventx', null, 2);
    const embedJsonP2 = JSON.stringify(payloadP2.embeds[0].toJSON());
    assert.equal(embedJsonP2.includes('<@'), false);
    assert.ok(embedJsonP2.includes('Nossiba BOUTEBBA'));
  });

  await t.test('getMentorsPayload contains resolved mentor names and zero raw mention codes', () => {
    const payload = getMentorsPayload('eventx');
    assert.ok(payload.embeds?.length > 0);

    const embedJson = JSON.stringify(payload.embeds[0].toJSON());
    assert.equal(embedJson.includes('<@'), false, 'Mentors embed should not contain <@ mentions');
    assert.ok(embedJson.includes('Nossiba BOUTEBBA'));
    assert.ok(embedJson.includes('Youcef BOUZID'));
    assert.ok(embedJson.includes('Abdelbassit DOUDOU'));
  });
});
