import test from 'node:test';
import assert from 'node:assert/strict';
import { ComponentType, PermissionFlagsBits } from 'discord.js';
import { CLUB_LABELS, clubId } from '../src/config/cfg_club.js';
import { getAllTeams, getTeamColor } from '../src/config/cfg_teams.js';
import { CUSTOM_IDS } from '../src/config/cfg_customIds.js';
import { CLUB_MESSAGES } from '../src/messages/msg_club.js';
import { clubText, clubPage } from '../src/ui/components/c_club.js';
import { getHubPayload, getPersistentHubPayload } from '../src/ui/view_hub.js';
import * as club from '../src/ui/view_club.js';
import * as members from '../src/ui/view_members.js';
import * as departments from '../src/ui/view_departments.js';
import * as approvals from '../src/ui/view_approvals.js';

const guildId = '111111111111111111';
const userId = '222222222222222222';
const roleId = '333333333333333333';
const requestId = '12345678-1234-4234-8234-123456789012';
const hostile = '**Fake** @everyone @here <@123456789012345678> <@&123456789012345678> <#123456789012345678> ';
const record = { guildId, userId, displayName: hostile.repeat(100), departmentKey: 'DEV', status: 'ACTIVE', updatedAt: '2026-10-19T09:00:00.000Z' };
const request = { id: requestId, guildId, userId, departmentKey: 'DEV', currentDepartmentKey: 'MEDIA', status: 'PENDING', displayName: hostile, createdAt: '2026-10-19T09:00:00.000Z' };
const user = { id: userId, username: hostile, displayAvatarURL: () => 'https://example.com/avatar.png' };
const member = { id: userId, displayName: hostile, guild: { id: guildId }, permissions: { has: () => false }, roles: { cache: new Map() } };
const manager = { memberManage: true, clubManage: true, setupManage: true, approvalReview: true, managedDepartments: new Set(['DEV']) };

function components(payload) { return payload.components.flatMap((row) => row.toJSON().components); }
function ids(payload) { return components(payload).map((component) => component.custom_id).filter(Boolean); }
function embedText(embed) { return [embed.title, embed.description, embed.footer?.text, ...(embed.fields || []).flatMap((field) => [field.name, field.value])].filter(Boolean).join('\n'); }

function assertPayload(payload) {
  assert.ok(payload.components.length <= 5);
  let textLength = 0;
  for (const builder of payload.embeds) {
    const embed = builder.toJSON();
    assert.ok((embed.title?.length || 0) <= 256);
    assert.ok((embed.description?.length || 0) <= 4096);
    assert.ok((embed.fields?.length || 0) <= 25);
    for (const field of embed.fields || []) {
      assert.ok(field.name.length <= 256);
      assert.ok(field.value.length <= 1024);
    }
    const text = embedText(embed);
    assert.doesNotMatch(text, /@(everyone|here)|<(@[!&]?|#)\d+>/);
    textLength += text.length;
  }
  assert.ok(textLength <= 6000);
  for (const row of payload.components) {
    const json = row.toJSON();
    assert.ok(json.components.length >= 1 && json.components.length <= 5);
    const menus = json.components.filter((component) => component.type !== ComponentType.Button);
    if (menus.length) assert.equal(json.components.length, 1);
    for (const component of json.components) {
      if (component.custom_id) assert.ok(component.custom_id.length <= 100);
      if (component.options) {
        assert.ok(component.options.length >= 1 && component.options.length <= 25);
        assert.equal(new Set(component.options.map((option) => option.value)).size, component.options.length);
      }
    }
  }
}

test('public hub exposes exactly the released five areas; management is evaluated for its viewer', () => {
  const publicHub = getPersistentHubPayload();
  assert.deepEqual(components(publicHub).map((button) => button.label), ['Events', 'Members', 'Departments', 'Knowledge', 'My Profile']);
  assert.equal(publicHub.components.length, 1);
  assert.deepEqual(ids(getHubPayload(user, member)), ids(publicHub));
  const managed = getHubPayload(user, member, manager);
  assert.ok(ids(managed).includes('bot:club:approvals:0:PENDING:ALL'));
  assert.ok(ids(managed).includes('bot:club:overview'));
  assert.ok(ids(managed).includes('bot:club:setup:0'));
  assert.ok(!ids(managed).includes(CUSTOM_IDS.HUB_EXTRACT_SERVER));
  const admin = getHubPayload(user, { ...member, permissions: { has: (flag) => flag === PermissionFlagsBits.Administrator } });
  assert.ok(ids(admin).includes(CUSTOM_IDS.HUB_EXTRACT_SERVER));
  [publicHub, managed, admin].forEach(assertPayload);
});

test('directory pagination makes every record accessible beyond 25 while preserving filter context', () => {
  const all = Array.from({ length: 67 }, (_, index) => ({ ...record, userId: String(500000000000000000n + BigInt(index)), displayName: `Member ${index}` }));
  const seen = new Set();
  for (let page = 0; page < Math.ceil(all.length / 8); page++) {
    const payload = members.getClubMembersPayload({ members: all, page, departmentKey: 'DEV', status: 'ACTIVE', context: 'abc123', capabilities: manager });
    assertPayload(payload);
    const picker = components(payload).find((component) => component.custom_id.startsWith('bot:club:member_open:'));
    picker.options.forEach((option) => seen.add(option.value));
    assert.ok(ids(payload).includes('bot:club:member_filter_dept:abc123:ACTIVE'));
    assert.ok(ids(payload).includes('bot:club:member_filter_status:abc123:DEV'));
    const next = components(payload).find((component) => component.label === 'Next');
    if (page < Math.ceil(all.length / 8) - 1) assert.equal(next.custom_id, `bot:club:members:${page + 1}:DEV:ACTIVE:abc123`);
  }
  assert.equal(seen.size, all.length);
});

test('request list pagination exposes all own and review records beyond 25', () => {
  const all = Array.from({ length: 57 }, (_, index) => ({ ...request, id: `12345678-1234-4234-8234-${String(index).padStart(12, '0')}`, displayName: `Requester ${index}` }));
  for (const [build, mode] of [[approvals.getClubMyRequestsPayload, 'own'], [approvals.getClubApprovalCenterPayload, 'review']]) {
    const seen = new Set();
    for (let page = 0; page < Math.ceil(all.length / 8); page++) {
      const payload = build({ requests: all, page });
      assertPayload(payload);
      const picker = components(payload).find((component) => component.custom_id.startsWith(`bot:club:request_open:${mode}:`));
      picker.options.forEach((option) => seen.add(option.value));
    }
    assert.equal(seen.size, all.length);
  }
});

test('own teams and member detail assignments remain visible across every page', () => {
  const teams = Array.from({ length: 31 }, (_, index) => ({ eventId: `event-${index}`, eventName: `Event ${index}`, teamId: `team-${index}`, teamName: `Team ${index}`, type: 'Mentor', detailCustomId: `bot:em:teams:event-${index}:0`, channelUrl: `https://discord.com/channels/${guildId}/${roleId}` }));
  for (let page = 0; page < teams.length; page++) {
    const payload = club.getClubMyTeamsPayload({ teams, page });
    assertPayload(payload);
    assert.ok(payload.embeds[0].toJSON().description.includes(`Event ${page} / Team ${page}`));
    assert.ok(ids(payload).includes(teams[page].detailCustomId));
    assert.ok(components(payload).some((component) => component.url === teams[page].channelUrl));
  }
  const text = [];
  for (let teamPage = 0; teamPage < Math.ceil(teams.length / 4); teamPage++) {
    const payload = members.getClubMemberDetailPayload({ member: record, teams, teamPage });
    assertPayload(payload);
    text.push(payload.embeds[0].toJSON().fields.find((field) => field.name === CLUB_MESSAGES.TEAMS).value);
  }
  for (let index = 0; index < teams.length; index++) assert.ok(text.some((page) => page.includes(`Event ${index} / Team ${index}`)));
  assert.ok(!components(club.getClubMyTeamsPayload({ teams: [{ ...teams[0], channelUrl: 'https://malicious.example/' }] })).some((component) => component.url));
});

test('canonical department order, colors, roster pagination, and membership request selection', () => {
  const roster = Array.from({ length: 39 }, (_, index) => ({ ...record, displayName: `Roster ${index}` }));
  const coManagers = Array.from({ length: 47 }, (_, index) => ({ ...record, displayName: `Co-Manager ${index}` }));
  const directory = departments.getClubDepartmentsPayload({ departments: [{ key: 'DEV', memberCount: 39 }] });
  assert.deepEqual(directory.embeds[0].toJSON().fields.map((field) => field.name), getAllTeams().map((department) => department.name));
  const seen = [];
  const seenManagers = [];
  for (let page = 0; page < 6; page++) {
    const payload = departments.getClubDepartmentDetailPayload({ department: { key: 'DEV', coManagers }, members: roster, page });
    assertPayload(payload);
    assert.equal(payload.embeds[0].toJSON().color, getTeamColor('DEV'));
    seen.push(payload.embeds[0].toJSON().fields.find((field) => field.name === CLUB_MESSAGES.ROSTER).value);
    seenManagers.push(payload.embeds[0].toJSON().fields.find((field) => field.name === CLUB_MESSAGES.CO_MANAGERS).value);
  }
  for (let index = 0; index < roster.length; index++) assert.ok(seen.some((page) => page.includes(`Roster ${index}`)));
  for (let index = 0; index < coManagers.length; index++) assert.ok(seenManagers.some((page) => page.includes(`Co-Manager ${index}`)));
  assert.ok(!ids(departments.getClubDepartmentRequestPayload()).some((id) => id.startsWith('bot:club:request_submit')));
  const selected = departments.getClubDepartmentRequestPayload({ departmentKey: 'DEV' });
  assert.ok(ids(selected).includes('bot:club:request_submit:DEV'));
  assert.equal(components(selected)[0].custom_id, 'bot:club:request_choose');
});

test('profile separates roles and stored membership, and request details expose only current legal actions', () => {
  const profile = club.getClubProfilePayload({ user, member, record, discordRoles: ['Discord role'], teams: [] });
  assertPayload(profile);
  assert.ok(profile.embeds[0].toJSON().fields.some((field) => field.name === CLUB_MESSAGES.DISCORD_ROLES && field.value === 'Discord role'));
  assert.ok(profile.embeds[0].toJSON().fields.some((field) => field.name === CLUB_MESSAGES.MEMBERSHIP && field.value.includes('Dev Department')));
  const own = approvals.getClubRequestDetailPayload({ request, own: true });
  assert.ok(ids(own).includes(`bot:club:request_cancel:${requestId}`));
  assert.ok(!ids(own).includes(`bot:club:request_approve:${requestId}`));
  const review = approvals.getClubRequestDetailPayload({ request, canResolve: true });
  assert.ok(ids(review).includes(`bot:club:request_approve:${requestId}`));
  assert.ok(ids(review).includes(`bot:club:request_reject:${requestId}`));
  const terminal = approvals.getClubRequestDetailPayload({ request: { ...request, status: 'REJECTED', reason: hostile }, own: true, canResolve: true });
  assertPayload(terminal);
  assert.ok(!ids(terminal).some((id) => /request_(cancel|approve|reject)/.test(id)));
});

test('all management screens serialize under Discord limits, use native selectors, and confirm exact targets', () => {
  const issue = { code: 'MEMBERSHIP_DRIFT', userId, displayName: hostile };
  const all = [
    club.getClubOverviewPayload({ overview: { departments: [{ key: 'DEV', memberCount: 100 }], setupIssueCount: 3 } }),
    club.getClubSetupPayload({ report: { issues: Array.from({ length: 31 }, () => issue), unboundLegacyEvents: 1 } }),
    club.getClubSetupRepairPayload({ member: record, preview: hostile.repeat(100) }),
    club.getClubRoleBindingsPayload({ config: {}, kind: 'trustedRoleIds', key: 'VICE_PRESIDENT' }),
    club.getClubRoleBindingsPayload({ config: {}, kind: 'trustedRoleIds', key: 'VICE_PRESIDENT', roleId, roleName: hostile, preview: true }),
    club.getClubNoticePayload({ message: hostile.repeat(100) }),
    members.getClubMemberEditorPayload(),
    members.getClubMemberEditorPayload({ userId, departmentKey: 'DEV' }),
    members.getClubMemberConfirmationPayload({ member: record, departmentKey: 'MEDIA', status: 'ARCHIVED', reason: hostile.repeat(100) }),
    departments.getClubDepartmentManagePayload({ department: { key: 'DEV' }, capabilities: manager }),
    departments.getClubDepartmentManagePayload({ department: { key: 'DEV' }, capabilities: manager, userId, displayName: hostile, confirm: true }),
    approvals.getClubRequestDetailPayload({ request, canResolve: true }),
  ];
  all.forEach(assertPayload);
  assert.ok(components(all[1]).some((component) => component.custom_id === 'bot:em:legacy'));
  assert.ok(components(all[1]).some((component) => component.custom_id === 'bot:club:setup_repair_pick'));
  assert.ok(components(all[3]).some((component) => component.type === ComponentType.RoleSelect));
  assert.ok(components(all[6]).some((component) => component.type === ComponentType.UserSelect));
  assert.ok(ids(all[7]).includes('bot:club:member_register'));
  assert.ok(!ids(all[7]).includes(`bot:club:member_detail:${userId}`));
  assert.ok(ids(members.getClubMemberEditorPayload({ userId, registered: true })).includes(`bot:club:member_detail:${userId}`));
  assert.ok(ids(all[8]).includes(`bot:club:member_confirm:${userId}:MEDIA:ARCHIVED`));
  assert.ok(components(all[8]).some((component) => component.label === 'Cancel'));
  assert.ok(ids(all[10]).includes(`bot:club:leadership_confirm:DEV:${userId}`));
  for (const modal of [members.createClubMemberSearchModal('abc123'), approvals.createClubRejectRequestModal(requestId)]) {
    const json = modal.toJSON();
    assert.ok(json.custom_id.length <= 100);
    assert.ok(json.components.length <= 5);
    assert.ok(json.title.length <= 45);
    assert.equal(json.components.length, 1);
  }
});

test('empty/stale screens provide navigation and unsafe identifiers are rejected', () => {
  [members.getClubMembersPayload(), members.getClubMemberDetailPayload(), departments.getClubDepartmentsPayload(), departments.getClubDepartmentDetailPayload(), departments.getClubDepartmentManagePayload(), approvals.getClubMyRequestsPayload(), approvals.getClubApprovalCenterPayload(), approvals.getClubRequestDetailPayload(), club.getClubMyTeamsPayload(), club.getClubSetupPayload()].forEach((payload) => {
    assertPayload(payload);
    assert.ok(ids(payload).includes(CUSTOM_IDS.HUB_MAIN));
  });
  assert.equal(clubPage([1, 2], 100).page, 0);
  assert.equal(clubPage([1, 2], -2).page, 0);
  assert.equal(clubPage([1, 2], 'bad').page, 0);
  assert.ok(clubText(hostile.repeat(100), 80).length <= 80);
  assert.throws(() => clubId('view', 'a:b'), /Invalid/);
  assert.throws(() => clubId('view', 'x'.repeat(100)), /limits/);
});

test('detail navigation retains member filters and request pages through refresh and management actions', () => {
  const token = '0123456789abcdef0123';
  const listing = members.getClubMembersPayload({ members: Array.from({ length: 20 }, (_, index) => ({ ...record, userId: String(500000000000000000n + BigInt(index)) })), page: 2, departmentKey: 'DEV', status: 'ARCHIVED', context: token });
  assert.ok(ids(listing).includes(`bot:club:member_open:2:DEV:ARCHIVED:${token}`));
  const detail = members.getClubMemberDetailPayload({ member: record, teams: Array.from({ length: 12 }, () => ({ eventName: 'Example', teamName: 'Team', type: 'Mentor' })), teamPage: 1, capabilities: manager, navigationToken: token });
  assertPayload(detail);
  assert.ok(ids(detail).includes(`bot:club:members_return:${token}`));
  assert.ok(ids(detail).includes(`bot:club:member_detail:${userId}:1:${token}`));
  assert.ok(ids(detail).includes(`bot:club:member_detail:${userId}:2:${token}`));
  assert.ok(ids(detail).includes(`bot:club:member_transfer:${userId}:${token}`));
  assert.ok(ids(detail).includes(`bot:club:member_archive:${userId}:${token}`));
  const editor = members.getClubMemberEditorPayload({ ...record, registered: true, navigationToken: token });
  assert.ok(ids(editor).includes(`bot:club:member_set_dept:${userId}:ACTIVE:${token}`));
  assert.ok(ids(editor).includes(`bot:club:member_detail:${userId}:0:${token}`));
  const confirmation = members.getClubMemberConfirmationPayload({ member: record, departmentKey: 'RELATIONS', status: 'ARCHIVED', navigationToken: token });
  assertPayload(confirmation);
  assert.ok(ids(confirmation).includes(`bot:club:member_confirm:${userId}:RELATIONS:ARCHIVED:${token}`));
  assert.ok(components(confirmation).some((component) => component.label === 'Cancel' && component.custom_id === `bot:club:member_detail:${userId}:0:${token}`));
  const requestList = approvals.getClubApprovalCenterPayload({ requests: Array.from({ length: 20 }, (_, index) => ({ ...request, id: `request-${index}` })), page: 2, status: 'REJECTED', departmentKey: 'RELATIONS' });
  assert.ok(ids(requestList).includes('bot:club:request_open:review:2:REJECTED:RELATIONS'));
  const requestDetail = approvals.getClubRequestDetailPayload({ request, canResolve: true, navigationToken: token });
  assertPayload(requestDetail);
  assert.ok(ids(requestDetail).includes(`bot:club:requests_return:${token}`));
  assert.ok(ids(requestDetail).includes(`bot:club:request_detail:${requestId}:review:${token}`));
  assert.ok(ids(requestDetail).includes(`bot:club:request_approve:${requestId}:${token}`));
  assert.ok(ids(requestDetail).includes(`bot:club:request_reject:${requestId}:${token}`));
  const ownDetail = approvals.getClubRequestDetailPayload({ request, own: true, navigationToken: token });
  assert.ok(ids(ownDetail).includes(`bot:club:request_cancel:${requestId}:${token}`));
  const rejectModal = approvals.createClubRejectRequestModal(requestId, token).toJSON();
  assert.equal(rejectModal.custom_id, `bot:club:reject_submit:${requestId}:${token}`);
  assert.ok(rejectModal.custom_id.length <= 100);
  const legacyBack = members.getClubMemberDetailPayload({ member: record, backParams: [2, 'DEV', 'ARCHIVED', token] });
  assert.ok(ids(legacyBack).includes(`bot:club:members:2:DEV:ARCHIVED:${token}`));
});

test('overview distinguishes unavailable diagnostics from a checked zero count', () => {
  const value = (overview) => club.getClubOverviewPayload({ overview }).embeds[0].toJSON().fields.find((field) => field.name === CLUB_MESSAGES.SETUP_ISSUES).value;
  assert.equal(value({}), CLUB_MESSAGES.UNKNOWN);
  assert.equal(value({ setupIssueCount: 0 }), '0');
  assert.equal(value({ setupIssueCount: 12 }), '12');
});
