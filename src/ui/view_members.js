import { getAllTeams } from '../config/cfg_teams.js';
import { CLUB_MESSAGES as M } from '../messages/msg_club.js';
import { createMemberSelectMenu } from './components/c_selectMenus.js';
import { createModal, createShortTextInput } from './components/c_modals.js';
import { clubPayload, clubText, clubName, clubDate, clubDepartment, clubStatus, clubPage, clubButton, clubNav, clubPager, clubSelect, clubId, CLUB_LABELS as L, BUTTON_LABELS } from './components/c_club.js';

const withNavigation = (params, navigationToken) => navigationToken ? [...params, navigationToken] : params;

/** Full filtered records are supplied; no storage or Discord reads during rendering. */
export function getClubMembersPayload({ members = [], page = 0, departmentKey = 'ALL', status = 'ALL', search = '', context = '0', capabilities = {} } = {}) {
  const current = clubPage(members, page);
  const filters = [departmentKey, status, context];
  return clubPayload({ title: M.MEMBERS,
    description: `${M.MEMBERS_DESCRIPTION}\n\n${M.FILTER(departmentKey === 'ALL' ? L.ALL_DEPARTMENTS : clubDepartment(departmentKey), status === 'ALL' ? L.ALL_STATUSES : clubStatus(status), clubText(search, 80))}\n\n${current.items.length ? current.items.map((member) => M.MEMBER_LINE(clubName(member), clubDepartment(member.departmentKey), clubStatus(member.status))).join('\n') : M.EMPTY_MEMBERS}`,
    footerText: M.PAGE(current.page, current.pages, current.total), components: [
      clubSelect('member_filter_dept', L.DEPARTMENT_FILTER, [{ label: L.ALL_DEPARTMENTS, value: 'ALL', default: departmentKey === 'ALL' }, { label: L.NO_DEPARTMENT, value: 'NONE', default: departmentKey === 'NONE' }, ...getAllTeams().map((department) => ({ label: department.name, value: department.key, default: department.key === departmentKey }))], [context, status]),
      clubSelect('member_filter_status', L.STATUS_FILTER, ['ALL', 'ACTIVE', 'ARCHIVED'].map((value) => ({ label: value === 'ALL' ? L.ALL_STATUSES : L[value], value, default: value === status })), [context, departmentKey]),
      clubSelect('member_open', L.MEMBER_DETAILS_PICKER, current.items.map((member) => ({ label: member.displayName || M.UNKNOWN_USER(member.userId), value: member.userId, description: M.MEMBERSHIP_VALUE(clubDepartment(member.departmentKey), clubStatus(member.status)) })), [current.page, departmentKey, status, context]),
      [clubButton('member_search', L.SEARCH, [context], 'primary'), capabilities.memberManage || capabilities.clubManage ? clubButton('member_register', L.REGISTER, [], 'success') : null, ...clubPager(current, 'members', filters)],
      clubNav({ refreshAction: 'members', refreshParams: [current.page, ...filters] }),
    ],
  });
}

export function getClubMemberDetailPayload({ member, discordRoles = [], teams = [], teamPage = 0, capabilities = {}, navigationToken, backParams = [0, 'ALL', 'ALL', '0'] } = {}) {
  const backAction = navigationToken ? 'members_return' : 'members';
  const returnParams = navigationToken ? [navigationToken] : backParams;
  if (!member) return clubPayload({ title: M.MEMBER_DETAIL, description: M.UNKNOWN, components: clubNav({ backAction, backParams: returnParams }) });
  const canManage = capabilities.memberManage || capabilities.clubManage;
  const assignments = clubPage(teams, teamPage, 4);
  return clubPayload({ title: M.MEMBER_DETAIL, description: clubName(member), fields: [
    { name: M.IDENTITY, value: clubText(member.userId, 100), inline: true },
    { name: M.DEPARTMENT, value: clubDepartment(member.departmentKey), inline: true },
    { name: M.STATUS, value: clubStatus(member.status), inline: true },
    { name: M.ROLES, value: discordRoles.length ? clubText(discordRoles.map((role) => typeof role === 'string' ? role : role.name).join(', '), 950) : M.NONE },
    { name: M.TEAMS, value: teams.length ? `${assignments.items.map((team) => M.TEAM_LINE(clubText(team.eventName, 60), clubText(team.teamName || team.name, 60), clubText(team.type || team.role || M.MEMBER, 30))).join('\n\n')}\n\n${M.PAGE(assignments.page, assignments.pages, assignments.total)}` : M.NONE },
    { name: M.UPDATED, value: clubDate(member.updatedAt) },
  ], components: [
    canManage ? clubButton('member_transfer', L.TRANSFER, withNavigation([member.userId], navigationToken), 'primary') : null,
    canManage ? clubButton(member.status === 'ARCHIVED' ? 'member_reactivate' : 'member_archive', member.status === 'ARCHIVED' ? L.REACTIVATE : L.ARCHIVE, withNavigation([member.userId], navigationToken), member.status === 'ARCHIVED' ? 'success' : 'danger') : null,
    assignments.pages > 1 ? clubButton('member_detail', BUTTON_LABELS.PREVIOUS, withNavigation([member.userId, Math.max(0, assignments.page - 1)], navigationToken)) : null,
    assignments.pages > 1 ? clubButton('member_detail', BUTTON_LABELS.NEXT, withNavigation([member.userId, Math.min(assignments.pages - 1, assignments.page + 1)], navigationToken)) : null,
    clubNav({ backAction, backParams: returnParams, refreshAction: 'member_detail', refreshParams: withNavigation([member.userId, assignments.page], navigationToken) }),
  ] });
}

/** Without userId shows native member picker; with userId shows canonical department picker. */
export function getClubMemberEditorPayload({ userId, displayName, departmentKey, status = 'ACTIVE', createdAt, registered = Boolean(createdAt), navigationToken } = {}) {
  const backAction = userId && registered ? 'member_detail' : navigationToken ? 'members_return' : userId ? 'member_register' : 'members';
  const backParams = userId && registered ? navigationToken ? [userId, 0, navigationToken] : [userId] : navigationToken ? [navigationToken] : userId ? [] : [0, 'ALL', 'ALL', '0'];
  return clubPayload({ title: M.EDIT_MEMBER, description: `${M.EDIT_DESCRIPTION}${userId ? `\n\n${clubName({ userId, displayName })}` : ''}`, components: [
    userId ? null : createMemberSelectMenu({ customId: clubId('member_register_user', ...withNavigation([], navigationToken)), placeholder: L.MEMBER_PICKER }),
    userId ? clubSelect('member_set_dept', L.DEPARTMENT_PICKER, [{ label: L.NO_DEPARTMENT, value: 'NONE', default: !departmentKey }, ...getAllTeams().map((department) => ({ label: department.name, value: department.key, default: department.key === departmentKey }))], withNavigation([userId, status], navigationToken)) : null,
    clubNav({ backAction, backParams }),
  ] });
}

export function getClubMemberConfirmationPayload({ member, userId = member?.userId, displayName = member?.displayName, departmentKey, status = 'ACTIVE', reason, navigationToken } = {}) {
  const finalDepartment = departmentKey === 'NONE' ? null : departmentKey;
  const backAction = member ? 'member_detail' : navigationToken ? 'members_return' : 'member_register';
  const backParams = member ? navigationToken ? [userId, 0, navigationToken] : [userId] : navigationToken ? [navigationToken] : [];
  return clubPayload({ title: M.CHANGE_TITLE, description: status === 'ARCHIVED' ? M.ARCHIVE_DESCRIPTION : M.CHANGE_DESCRIPTION,
    fields: [
      { name: M.MEMBER, value: clubName({ userId, displayName }) },
      { name: M.BEFORE, value: member ? M.MEMBERSHIP_VALUE(clubDepartment(member.departmentKey), clubStatus(member.status)) : M.UNREGISTERED },
      { name: M.AFTER, value: M.MEMBERSHIP_VALUE(clubDepartment(finalDepartment), clubStatus(status)) },
      ...(reason ? [{ name: M.REASON, value: clubText(reason, 800) }] : []),
    ], components: [
      userId ? clubButton('member_confirm', BUTTON_LABELS.CONFIRM, withNavigation([userId, finalDepartment || 'NONE', status], navigationToken), status === 'ARCHIVED' ? 'danger' : 'success') : null,
      clubButton(backAction, BUTTON_LABELS.CANCEL, backParams),
      clubNav({ backAction, backParams }),
    ],
  });
}

export function createClubMemberSearchModal(context = '0') {
  return createModal({ customId: clubId('member_search_submit', context), title: L.SEARCH_TITLE, inputs: [createShortTextInput({ customId: L.SEARCH_FIELD, label: L.SEARCH_INPUT, required: false, maxLength: 80 })] });
}
