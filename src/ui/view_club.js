import { getAllTeams, getTeam, CORE_TEAM } from '../config/cfg_teams.js';
import { CLUB_MESSAGES as M } from '../messages/msg_club.js';
import { buildCustomId } from '../config/cfg_customIds.js';
import { eventId } from '../config/cfg_eventManagement.js';
import { createLinkButton, createPrimaryButton } from './components/c_buttons.js';
import { createRoleSelectMenu } from './components/c_selectMenus.js';
import { clubPayload, clubText, clubName, clubDepartment, clubStatus, clubPage, clubButton, clubNav, clubPager, clubSelect, clubId, CLUB_LABELS as L, CLUB_UI, BUTTON_LABELS } from './components/c_club.js';

/** Pure profile model: {user, member, record, discordRoles: names[], teams: assignments[]}. */
export function getClubProfilePayload({ user, member, record, discordRoles = [], teams = [] } = {}) {
  const name = clubName({ displayName: member?.displayName || user?.displayName || user?.username || record?.displayName, userId: user?.id || record?.userId });
  return clubPayload({ title: M.PROFILE, description: `${name}\n\n${M.PROFILE_DESCRIPTION}`, thumbnail: user?.displayAvatarURL?.({ size: 128 }),
    fields: [
      { name: M.IDENTITY, value: clubText(user?.tag || user?.username || record?.userId || M.UNKNOWN, 150) },
      { name: M.DISCORD_ROLES, value: discordRoles.length ? clubText(discordRoles.map((role) => typeof role === 'string' ? role : role.name).join(', '), 1000) : M.NONE },
      { name: M.MEMBERSHIP, value: record ? M.MEMBERSHIP_VALUE(clubDepartment(record.departmentKey), clubStatus(record.status)) : M.UNREGISTERED },
      { name: M.TEAMS, value: M.TEAM_COUNT(teams.length) },
    ], components: [
      clubButton('request_department', L.REQUEST_DEPARTMENT, ['NONE'], 'primary'),
      clubButton('my_requests', L.MY_REQUESTS, [0]), clubButton('my_teams', L.MY_TEAMS, [0]),
      ...clubNav({ refreshAction: 'profile' }),
    ],
  });
}

/** Assignments: {eventId,eventName,teamId,teamName,type,channelUrl?}. */
export function getClubMyTeamsPayload({ teams = [], page = 0 } = {}) {
  // One assignment per page leaves room for useful detail and accessible links.
  const current = clubPage(teams, page, 1);
  const assignment = current.items[0];
  const components = [];
  if (assignment?.eventId) components.push(createPrimaryButton({ customId: assignment.detailCustomId || buildCustomId('event', 'detail', assignment.eventId), label: L.DETAILS }));
  if (assignment?.channelUrl && /^https:\/\/discord\.com\/channels\/\d+\/\d+$/.test(assignment.channelUrl)) components.push(createLinkButton({ url: assignment.channelUrl, label: L.OPEN_CHANNEL }));
  return clubPayload({ title: M.MY_TEAMS, description: assignment ? `${M.MY_TEAMS_DESCRIPTION}\n\n${M.TEAM_LINE(clubText(assignment.eventName, 120), clubText(assignment.teamName || assignment.name, 100), clubText(assignment.type || assignment.role || M.MEMBER, 50))}` : M.EMPTY_TEAMS,
    footerText: M.PAGE(current.page, current.pages, current.total),
    components: [components, clubPager(current, 'my_teams'), clubNav({ backAction: 'profile', refreshAction: 'my_teams', refreshParams: [current.page] })],
  });
}

export function getClubOverviewPayload({ overview = {} } = {}) {
  const counts = overview.departmentCounts || overview.departments || {};
  const countFor = (key) => Array.isArray(counts) ? (counts.find((item) => item.key === key)?.memberCount ?? counts.find((item) => item.departmentKey === key)?.count ?? 0) : (counts[key] ?? 0);
  return clubPayload({ title: M.OVERVIEW, description: M.OVERVIEW_DESCRIPTION, fields: [
    { name: M.ACTIVE_MEMBERS, value: clubText(overview.activeMembers ?? overview.activeMemberCount ?? 0), inline: true },
    { name: M.PENDING_REQUESTS, value: clubText(overview.pendingRequests ?? overview.pendingRequestCount ?? 0), inline: true },
    { name: M.ACTIVE_EVENTS, value: clubText(overview.activeEvents ?? overview.activeEventCount ?? 0), inline: true },
    { name: M.ARCHIVED_EVENTS, value: clubText(overview.archivedEvents ?? overview.archivedEventCount ?? 0), inline: true },
    { name: M.TEAMS_WITHOUT_MENTORS, value: clubText(overview.teamsWithoutMentors ?? 0), inline: true },
    { name: M.SETUP_ISSUES, value: clubText(overview.setupIssueCount ?? (typeof overview.setupIssues === 'number' ? overview.setupIssues : overview.setupIssues?.length) ?? M.UNKNOWN), inline: true },
    { name: M.DEPARTMENT_COUNTS, value: getAllTeams().map((department) => M.DEPARTMENT_LINE(department.name, countFor(department.key))).join('\n') },
  ], components: clubNav({ refreshAction: 'overview' }) });
}

/** Diagnostics are supplied by the read-only setup service. */
export function getClubSetupPayload({ report = {}, page = 0 } = {}) {
  const issues = report.issues || [];
  const current = clubPage(issues, page, CLUB_UI.ISSUE_PAGE_SIZE);
  const repairable = [...new Map(current.items.filter((issue) => (issue.repairable || issue.code === 'MEMBERSHIP_DRIFT') && issue.userId).map((issue) => [issue.userId, issue])).values()];
  const issueMessage = (issue) => {
    if (typeof issue === 'string') return issue;
    const key = issue.departmentKey || String(issue.roleKey || '').replace(/_MEMBER$/, '');
    const name = issue.departmentKey || String(issue.roleKey || '').endsWith('_MEMBER') ? getTeam(key)?.name || M.DISCORD_ROLE : CORE_TEAM[key]?.name || M.DISCORD_ROLE;
    return issue.message || issue.description || M.DIAGNOSTIC_MESSAGES[issue.code]?.(issue, name) || issue.code || M.UNKNOWN;
  };
  return clubPayload({ title: M.SETUP, description: `${M.SETUP_DESCRIPTION}\n\n${current.items.length ? current.items.map((issue, index) => `${current.page * CLUB_UI.ISSUE_PAGE_SIZE + index + 1}. ${clubText(issueMessage(issue), 450)}`).join('\n\n') : M.NO_ISSUES}`,
    footerText: M.PAGE(current.page, current.pages, current.total),
    components: [
      repairable.length ? clubSelect('setup_repair_pick', L.REPAIR, repairable.map((issue) => ({ label: issue.displayName || M.UNKNOWN_USER(issue.userId), value: issue.userId }))) : null,
      clubButton('role_bindings', L.BIND_ROLES),
      report.unboundLegacyEvents > 0 ? createPrimaryButton({ customId: eventId('legacy'), label: L.LEGACY_EVENTS }) : null,
      clubPager(current, 'setup'), clubNav({ refreshAction: 'setup', refreshParams: [current.page] }),
    ],
  });
}

export function getClubSetupRepairPayload({ member, preview } = {}) {
  return clubPayload({ title: M.REPAIR, description: M.REPAIR_DESCRIPTION, fields: [
    { name: M.MEMBER, value: clubName(member) },
    { name: M.MEMBERSHIP, value: member ? M.MEMBERSHIP_VALUE(clubDepartment(member.departmentKey), clubStatus(member.status)) : M.UNKNOWN },
    ...(preview ? [{ name: M.DIAGNOSTIC_RESULT, value: clubText(typeof preview === 'string' ? preview : JSON.stringify(preview), 1000) }] : []),
  ], components: [member?.userId ? clubButton('setup_repair_confirm', L.CONFIRM_REPAIR, [member.userId], 'success') : null, clubButton('setup', BUTTON_LABELS.CANCEL, [0]), ...clubNav({ backAction: 'setup', backParams: [0] })] });
}

/** kind: trustedRoleIds|departmentRoleIds|coreRoleId. key: canonical role/department key. */
export function getClubRoleBindingsPayload({ config = {}, kind, key, roleId, roleName, preview = false } = {}) {
  const options = [
    ...Object.values(CORE_TEAM).map((role) => ({ label: role.name, value: `trustedRoleIds|${role.key}` })),
    ...getAllTeams().map((department) => ({ label: department.name, value: `departmentRoleIds|${department.key}` })),
    { label: L.ROLE_CORE, value: 'coreRoleId|CORE' },
  ];
  const bindingName = kind === 'departmentRoleIds' ? clubDepartment(key) : kind === 'coreRoleId' ? L.ROLE_CORE : CORE_TEAM[key]?.name || key;
  const currentBinding = kind === 'departmentRoleIds' ? config.departmentRoleIds?.[key] : kind === 'coreRoleId' ? config.coreRoleId : config.trustedRoleIds?.[key];
  return clubPayload({ title: M.ROLE_BINDINGS, description: preview ? M.BIND_CONFIRM_DESCRIPTION : M.ROLE_BINDINGS_DESCRIPTION,
    fields: key ? [
      { name: M.BINDING, value: clubText(bindingName, 100) },
      { name: M.DISCORD_ROLE, value: clubText(roleName || roleId || currentBinding || M.NOT_BOUND, 150) },
    ] : [],
    components: [
      clubSelect('role_bind_target', L.ROLE_BINDING_PICKER, options),
      kind && key && !preview ? createRoleSelectMenu({ customId: clubId('role_bind_pick', kind, key), placeholder: L.ROLE_PICKER }) : null,
      kind && key && roleId && preview ? clubButton('role_bind_confirm', L.CONFIRM_BIND, [kind, key, roleId], 'success') : null,
      preview ? clubButton('role_bindings', BUTTON_LABELS.CANCEL) : null,
      clubNav({ backAction: 'setup', backParams: [0], refreshAction: 'role_bindings' }),
    ],
  });
}

export function getClubNoticePayload({ title = M.NOTICE, message = M.UNKNOWN, backAction = 'profile', backParams = [] } = {}) {
  return clubPayload({ title, description: clubText(message, 2800), components: clubNav({ backAction, backParams }) });
}
