import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits } from 'discord.js';

import {
  getAllEvents,
  getEventById,
  createEvent,
  addTeam,
  deleteTeam,
  assignMembers,
  assignMentors,
  resetEventsStore,
} from '../src/data/json_events.js';

import {
  buildTeamChannelOverwrites,
  getMemberPermissions,
  getMentorPermissions,
} from '../src/features/srv_roles.js';

import {
  getEventsPayload,
  getEventDetailPayload,
  getTeamsPayload,
  getMentorsPayload,
  getAssignPayload,
  getDeleteTeamPayload,
} from '../src/ui/index.js';

import {
  CUSTOM_IDS,
  NAMESPACES,
  buildCustomId,
  parseCustomId,
} from '../src/config/cfg_customIds.js';

import { BUTTON_LABELS } from '../src/config/cfg_labels.js';

test('1. Event & Team Data Store with 3 Default Teams', async (t) => {
  resetEventsStore();

  await t.test('Initial seed contains EventX 3.0 with Team 01, Team 02, and Team 03', () => {
    const events = getAllEvents();
    assert.equal(events.length >= 1, true);

    const eventX = getEventById('eventx');
    assert.ok(eventX);
    assert.equal(eventX.name, 'EventX 3.0');
    assert.equal(eventX.teams.length, 3);
    assert.equal(eventX.teams[0].name, 'Team 1');
    assert.equal(eventX.teams[1].name, 'Team 2');
    assert.equal(eventX.teams[2].name, 'Team 3');
  });


  await t.test('CRUD operations on teams: Add, Assign, and Delete', () => {
    // 1. Add Team 04
    const team4 = addTeam('eventx', {
      name: 'Team 04',
      category: 'Cybersecurity',
    });
    assert.ok(team4);
    assert.equal(team4.name, 'Team 04');
    assert.equal(team4.category, 'Cybersecurity');
    assert.equal(team4.number, 4);

    // 2. Assign Members & Mentors
    assignMembers('eventx', team4.id, ['user_123', 'user_456']);
    assignMentors('eventx', team4.id, ['mentor_789']);

    const updatedEvent = getEventById('eventx');
    const savedTeam4 = updatedEvent.teams.find((t) => t.id === team4.id);
    assert.deepEqual(savedTeam4.members, ['user_123', 'user_456']);
    assert.deepEqual(savedTeam4.mentors, ['mentor_789']);

    // 3. Delete Team
    const deleted = deleteTeam('eventx', team4.id);
    assert.ok(deleted);
    const finalEvent = getEventById('eventx');
    assert.equal(finalEvent.teams.some((t) => t.id === team4.id), false);
  });
});

test('2. Role Permissions & @CORE View-Only Invariant Enforcement', async (t) => {
  await t.test('Member permissions include view, talk, react, connect', () => {
    const perms = getMemberPermissions();
    assert.ok(perms.includes(PermissionFlagsBits.ViewChannel));
    assert.ok(perms.includes(PermissionFlagsBits.SendMessages));
    assert.ok(perms.includes(PermissionFlagsBits.AddReactions));
    assert.ok(perms.includes(PermissionFlagsBits.AttachFiles));
    assert.ok(perms.includes(PermissionFlagsBits.Connect));
  });

  await t.test('Mentor permissions include Member perms plus PrioritySpeaker & ManageMessages', () => {
    const perms = getMentorPermissions();
    assert.ok(perms.includes(PermissionFlagsBits.PrioritySpeaker));
    assert.ok(perms.includes(PermissionFlagsBits.ManageMessages));
  });

  await t.test('@CORE View-Only Invariant: view/read allowed, send/react explicitly DENIED', () => {
    const overwrites = buildTeamChannelOverwrites({
      everyoneRoleId: 'role_everyone',
      coreRoleId: 'role_core',
      memberRoleId: 'role_member',
      mentorRoleId: 'role_mentor',
    });

    // 1. Verify @everyone is denied ViewChannel
    const everyoneOv = overwrites.find((o) => o.id === 'role_everyone');
    assert.ok(everyoneOv);
    assert.deepEqual(everyoneOv.deny, [PermissionFlagsBits.ViewChannel]);

    // 2. Verify @CORE has View/Read allowed, but Send/React/Speak DENIED
    const coreOv = overwrites.find((o) => o.id === 'role_core');
    assert.ok(coreOv);
    assert.ok(coreOv.allow.includes(PermissionFlagsBits.ViewChannel));
    assert.ok(coreOv.allow.includes(PermissionFlagsBits.ReadMessageHistory));
    assert.ok(coreOv.deny.includes(PermissionFlagsBits.SendMessages));
    assert.ok(coreOv.deny.includes(PermissionFlagsBits.AddReactions));
    assert.ok(coreOv.deny.includes(PermissionFlagsBits.CreatePublicThreads));
    assert.ok(coreOv.deny.includes(PermissionFlagsBits.CreatePrivateThreads));
    assert.ok(coreOv.deny.includes(PermissionFlagsBits.SendMessagesInThreads));
    assert.ok(coreOv.deny.includes(PermissionFlagsBits.Speak));

    // 3. Verify Team Member has full collaboration permissions
    const memberOv = overwrites.find((o) => o.id === 'role_member');
    assert.ok(memberOv);
    assert.ok(memberOv.allow.includes(PermissionFlagsBits.ViewChannel));
    assert.ok(memberOv.allow.includes(PermissionFlagsBits.SendMessages));
    assert.ok(memberOv.allow.includes(PermissionFlagsBits.AddReactions));

    // 4. Verify Team Mentor has elevated moderation permissions
    const mentorOv = overwrites.find((o) => o.id === 'role_mentor');
    assert.ok(mentorOv);
    assert.ok(mentorOv.allow.includes(PermissionFlagsBits.ManageMessages));
    assert.ok(mentorOv.allow.includes(PermissionFlagsBits.PrioritySpeaker));
  });
});

test('3. UI Screen Payloads & Action Rows Integration', async (t) => {
  resetEventsStore();

  await t.test('Events list payload contains embed, Add Event button, and valid ActionRows', () => {
    const payload = getEventsPayload();
    assert.ok(payload.embeds?.length > 0);
    assert.ok(payload.components?.length > 0);
    for (const row of payload.components) {
      assert.equal(row.toJSON().type, 1); // ComponentType.ActionRow is 1
    }
  });

  await t.test('Event detail payload contains [Teams] and [Mentors] buttons in valid ActionRows', () => {
    const payload = getEventDetailPayload('eventx');
    assert.ok(payload.embeds?.length > 0);
    for (const row of payload.components) {
      assert.equal(row.toJSON().type, 1);
    }

    const buttonRow = payload.components[0];
    const buttons = buttonRow.components;
    assert.equal(buttons.length, 3); // Teams, Mentors, Back

    // Check Teams button label & customId
    assert.ok(buttons[0].data.label.includes('Teams'));
    assert.equal(buttons[0].data.custom_id, 'bot:team:view:eventx');

    // Check Mentors button label & customId
    assert.ok(buttons[1].data.label.includes('Mentors'));
    assert.equal(buttons[1].data.custom_id, 'bot:mentor:view:eventx');
  });

  await t.test('Teams view payload shows all 3 teams with Add Team, Assign, and Delete buttons in valid ActionRows', () => {
    const payload = getTeamsPayload('eventx');
    assert.ok(payload.embeds?.length > 0);
    for (const row of payload.components) {
      assert.equal(row.toJSON().type, 1);
    }

    const fields = payload.embeds[0].data.fields;
    assert.equal(fields.length, 3);
    assert.ok(fields[0].name.includes('Team 1'));
    assert.ok(fields[1].name.includes('Team 2'));
    assert.ok(fields[2].name.includes('Team 3'));


    // Check action rows down buttons
    const actionRow = payload.components[0];
    assert.ok(actionRow.components.some((btn) => btn.data.label === BUTTON_LABELS.ADD_TEAM));
    assert.ok(actionRow.components.some((btn) => btn.data.label === BUTTON_LABELS.ASSIGN_MEMBERS));
    assert.ok(actionRow.components.some((btn) => btn.data.label === BUTTON_LABELS.ASSIGN_MENTORS));
    assert.ok(actionRow.components.some((btn) => btn.data.label === BUTTON_LABELS.DELETE_TEAM));
  });

  await t.test('Assignment payload provides target team selector and user select menu in valid ActionRows', () => {
    const payload = getAssignPayload({ eventId: 'eventx', type: 'members' });
    assert.ok(payload.embeds?.length > 0);
    assert.equal(payload.components.length, 3); // Team select, User select, Back row
    for (const row of payload.components) {
      assert.equal(row.toJSON().type, 1);
    }
  });

  await t.test('Delete payload provides team picker select menu in valid ActionRows', () => {
    const payload = getDeleteTeamPayload('eventx');
    assert.ok(payload.embeds?.length > 0);
    assert.equal(payload.components.length, 2); // Select menu and Back row
    for (const row of payload.components) {
      assert.equal(row.toJSON().type, 1);
    }
  });
});


test('4. Custom IDs and Namespaces for Events and Teams', async () => {
  assert.equal(NAMESPACES.EVENT, 'event');
  assert.equal(NAMESPACES.TEAM, 'team');
  assert.equal(NAMESPACES.MENTOR, 'mentor');

  const customId = buildCustomId(NAMESPACES.TEAM, 'view', 'eventx');
  assert.equal(customId, 'bot:team:view:eventx');

  const parsed = parseCustomId(customId);
  assert.equal(parsed.prefix, 'bot');
  assert.equal(parsed.namespace, 'team');
  assert.equal(parsed.action, 'view');
  assert.deepEqual(parsed.params, ['eventx']);
});
