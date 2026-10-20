import { getAllTeams, getTeam, getTeamColor } from '../config/cfg_teams.js';
import { CLUB_MESSAGES as M } from '../messages/msg_club.js';
import { createMemberSelectMenu } from './components/c_selectMenus.js';
import { clubPayload, clubText, clubName, clubDepartment, clubButton, clubNav, clubSelect, clubId, CLUB_LABELS as L, CLUB_UI, BUTTON_LABELS } from './components/c_club.js';

function canonicalDepartment(department) {
  const key = typeof department === 'string' ? department : department?.key || department?.departmentKey;
  const canonical = getTeam(key);
  return canonical ? { ...department, ...canonical } : null;
}

export function getClubDepartmentsPayload({ departments = [] } = {}) {
  const entries = getAllTeams().map((canonical) => ({ ...departments.find((department) => department.key === canonical.key || department.departmentKey === canonical.key), ...canonical }));
  return clubPayload({ title: M.DEPARTMENTS, description: M.DEPARTMENTS_DESCRIPTION,
    fields: entries.map((department) => ({ name: department.name, value: `${clubText(department.description, 250)}\n${M.COUNTS}: ${department.memberCount ?? department.members?.length ?? 0}\n${M.CO_MANAGERS}: ${(department.coManagers || []).map((manager) => typeof manager === 'string' ? clubText(manager, 70) : clubName(manager)).join(', ').slice(0, 350) || M.NO_KNOWN_CO_MANAGERS}` })),
    components: [clubSelect('department_open', L.DEPARTMENT_PICKER, entries.map((department) => ({ label: department.name, value: department.key, description: department.description }))), clubNav({ refreshAction: 'departments' })],
  });
}

export function getClubDepartmentDetailPayload({ department, members = [], page = 0, capabilities = {} } = {}) {
  const entry = canonicalDepartment(department);
  if (!entry) return clubPayload({ title: M.DEPARTMENTS, description: M.UNKNOWN, components: clubNav({ backAction: 'departments' }) });
  const coManagers = entry.coManagers || [];
  // Share one page index between both rosters so neither roster can be truncated.
  const pageCount = Math.max(1, Math.ceil(Math.max(members.length, coManagers.length) / CLUB_UI.PAGE_SIZE));
  const requestedPage = Number(page);
  const currentPage = Math.max(0, Math.min(pageCount - 1, Number.isSafeInteger(requestedPage) ? requestedPage : 0));
  const current = { page: currentPage, pages: pageCount, total: members.length, items: members.slice(currentPage * CLUB_UI.PAGE_SIZE, (currentPage + 1) * CLUB_UI.PAGE_SIZE) };
  const currentCoManagers = coManagers.slice(currentPage * CLUB_UI.PAGE_SIZE, (currentPage + 1) * CLUB_UI.PAGE_SIZE);
  const managedDepartments = capabilities.managedDepartments;
  const canManage = capabilities.clubManage || capabilities.memberManage || managedDepartments?.has?.(entry.key) || Array.isArray(managedDepartments) && managedDepartments.includes(entry.key);
  const controls = [
    clubButton('department_members', L.VIEW_MEMBERS, [entry.key], 'primary'),
    clubButton('request_department', L.REQUEST_JOIN, [entry.key]),
    canManage ? clubButton('department_manage', L.MANAGE_MEMBERS, [entry.key]) : null,
  ];
  const pager = current.pages > 1 ? [
    clubButton('department', BUTTON_LABELS.PREVIOUS, [entry.key, Math.max(0, current.page - 1)]),
    clubButton('department', BUTTON_LABELS.NEXT, [entry.key, Math.min(current.pages - 1, current.page + 1)]),
  ] : [];
  return clubPayload({ title: entry.name, color: getTeamColor(entry.key), description: clubText(entry.description), fields: [
    { name: M.COUNTS, value: String(entry.memberCount ?? members.length), inline: true },
    { name: M.CO_MANAGERS, value: currentCoManagers.map((manager) => typeof manager === 'string' ? clubText(manager, 80) : clubName(manager)).join('\n') || M.NO_KNOWN_CO_MANAGERS },
    { name: M.ROSTER, value: current.items.length ? current.items.map((member) => `• ${clubName(member)}`).join('\n') : members.length ? M.EMPTY_ROSTER_PAGE : M.EMPTY_ROSTER },
  ], footerText: M.PAGE(current.page, current.pages, current.total), components: [controls, pager, clubNav({ backAction: 'departments', refreshAction: 'department', refreshParams: [entry.key, current.page] })] });
}

export function getClubDepartmentManagePayload({ department, capabilities = {}, userId, displayName, confirm = false } = {}) {
  const entry = canonicalDepartment(department);
  if (!entry) return clubPayload({ title: M.DEPARTMENT_MANAGE, description: M.UNKNOWN, components: clubNav({ backAction: 'departments' }) });
  return clubPayload({ title: confirm ? M.APPOINT_TITLE : M.DEPARTMENT_MANAGE, color: getTeamColor(entry.key),
    description: confirm ? M.APPOINT_DESCRIPTION : M.DEPARTMENT_MANAGE_DESCRIPTION,
    fields: [
      { name: M.DEPARTMENT, value: entry.name },
      ...(userId ? [{ name: M.MEMBER, value: clubName({ userId, displayName }) }] : []),
    ], components: [
      capabilities.memberManage || capabilities.clubManage ? clubButton('department_members', L.MANAGE_MEMBERS, [entry.key], 'primary') : null,
      capabilities.approvalReview || capabilities.clubManage || capabilities.managedDepartments?.has?.(entry.key) ? clubButton('approvals', L.APPROVALS, [0, 'PENDING', entry.key]) : null,
      capabilities.clubManage && !confirm ? createMemberSelectMenu({ customId: clubId('leadership_pick', entry.key), placeholder: L.APPOINT }) : null,
      capabilities.clubManage && confirm && userId ? clubButton('leadership_confirm', L.CONFIRM_APPOINT, [entry.key, userId], 'success') : null,
      confirm ? clubButton('department_manage', BUTTON_LABELS.CANCEL, [entry.key]) : null,
      clubNav({ backAction: 'department', backParams: [entry.key, 0] }),
    ],
  });
}

export function getClubDepartmentRequestPayload({ departmentKey, currentDepartmentKey } = {}) {
  return clubPayload({ title: M.REQUEST_TITLE, description: M.REQUEST_DESCRIPTION,
    fields: [{ name: M.CURRENT_DEPARTMENT, value: clubDepartment(currentDepartmentKey) }],
    components: [clubSelect('request_choose', L.DEPARTMENT_PICKER, getAllTeams().map((department) => ({ label: department.name, value: department.key, description: department.description, default: department.key === departmentKey }))), getTeam(departmentKey) ? clubButton('request_submit', BUTTON_LABELS.SUBMIT, [getTeam(departmentKey).key], 'success') : null, clubNav({ backAction: 'profile' })],
  });
}
