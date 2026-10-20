import { getAllTeams } from '../config/cfg_teams.js';
import { CLUB_MESSAGES as M } from '../messages/msg_club.js';
import { createModal, createLongTextInput } from './components/c_modals.js';
import { clubPayload, clubText, clubName, clubDate, clubDepartment, clubStatus, clubPage, clubButton, clubNav, clubPager, clubSelect, clubId, CLUB_LABELS as L } from './components/c_club.js';

const withNavigation = (params, navigationToken) => navigationToken ? [...params, navigationToken] : params;

function requestOptions(requests) {
  return requests.map((request) => ({ label: request.displayName || request.requesterName || M.UNKNOWN_USER(request.userId), value: request.id, description: `${clubDepartment(request.departmentKey || request.requestedDepartmentKey)} · ${clubStatus(request.status)}` }));
}

function requestLines(requests) {
  return requests.length ? requests.map((request) => M.REQUEST_LINE(clubName({ displayName: request.displayName || request.requesterName, userId: request.userId }), clubDepartment(request.departmentKey || request.requestedDepartmentKey), clubStatus(request.status), clubDate(request.createdAt))).join('\n\n') : M.EMPTY_REQUESTS;
}

export function getClubMyRequestsPayload({ requests = [], page = 0 } = {}) {
  const current = clubPage(requests, page);
  return clubPayload({ title: M.MY_REQUESTS, description: requestLines(current.items), footerText: M.PAGE(current.page, current.pages, current.total),
    components: [clubSelect('request_open', L.REQUEST_PICKER, requestOptions(current.items), ['own', current.page, 'ALL', 'ALL']), clubPager(current, 'my_requests'), clubNav({ backAction: 'profile', refreshAction: 'my_requests', refreshParams: [current.page] })],
  });
}

export function getClubApprovalCenterPayload({ requests = [], page = 0, status = 'PENDING', departmentKey = 'ALL' } = {}) {
  const current = clubPage(requests, page);
  return clubPayload({ title: M.APPROVALS, description: `${M.APPROVALS_DESCRIPTION}\n\n${requestLines(current.items)}`, footerText: M.PAGE(current.page, current.pages, current.total),
    components: [
      clubSelect('approval_filter_status', L.STATUS_FILTER, ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((value) => ({ label: value === 'ALL' ? L.ALL_STATUSES : L[value], value, default: value === status })), [departmentKey]),
      clubSelect('approval_filter_dept', L.DEPARTMENT_FILTER, [{ label: L.ALL_DEPARTMENTS, value: 'ALL', default: departmentKey === 'ALL' }, ...getAllTeams().map((department) => ({ label: department.name, value: department.key, default: department.key === departmentKey }))], [status]),
      clubSelect('request_open', L.REQUEST_PICKER, requestOptions(current.items), ['review', current.page, status, departmentKey]),
      clubPager(current, 'approvals', [status, departmentKey]),
      clubNav({ refreshAction: 'approvals', refreshParams: [current.page, status, departmentKey] }),
    ],
  });
}

export function getClubRequestDetailPayload({ request, requesterName, resolverName, own = false, canResolve = false, navigationToken } = {}) {
  const backAction = navigationToken ? 'requests_return' : own ? 'my_requests' : 'approvals';
  const backParams = navigationToken ? [navigationToken] : own ? [0] : [0, 'PENDING', 'ALL'];
  if (!request) return clubPayload({ title: M.REQUEST_DETAIL, description: M.UNKNOWN, components: clubNav({ backAction, backParams }) });
  const pending = request.status === 'PENDING';
  return clubPayload({ title: M.REQUEST_DETAIL, description: pending ? M.REQUEST_PENDING : M.REQUEST_TERMINAL, fields: [
    { name: M.REQUESTER, value: clubName({ displayName: requesterName || request.displayName, userId: request.userId }) },
    { name: M.CURRENT_DEPARTMENT, value: clubDepartment(request.currentDepartmentKey || request.fromDepartmentKey), inline: true },
    { name: M.REQUESTED_DEPARTMENT, value: clubDepartment(request.departmentKey || request.requestedDepartmentKey), inline: true },
    { name: M.STATUS, value: clubStatus(request.status), inline: true },
    { name: M.SUBMITTED, value: clubDate(request.createdAt), inline: true },
    ...(!pending ? [
      { name: M.RESOLVED, value: clubDate(request.resolvedAt), inline: true },
      { name: M.RESOLVER, value: request.resolvedBy ? clubName({ displayName: resolverName, userId: request.resolvedBy }) : M.NONE },
      { name: M.REASON, value: clubText(request.reason || request.decisionReason || M.NONE, 900) },
    ] : []),
  ], components: [
    pending && own ? clubButton('request_cancel', L.CANCEL_REQUEST, withNavigation([request.id], navigationToken), 'danger') : null,
    pending && canResolve ? clubButton('request_approve', L.APPROVE, withNavigation([request.id], navigationToken), 'success') : null,
    pending && canResolve ? clubButton('request_reject', L.REJECT, withNavigation([request.id], navigationToken), 'danger') : null,
    clubNav({ backAction, backParams, refreshAction: 'request_detail', refreshParams: withNavigation([request.id, own ? 'own' : 'review'], navigationToken) }),
  ] });
}

export function createClubRejectRequestModal(requestId, navigationToken) {
  return createModal({ customId: clubId('reject_submit', ...withNavigation([requestId], navigationToken)), title: L.REJECT_TITLE, inputs: [createLongTextInput({ customId: L.REASON_FIELD, label: L.REASON_INPUT, required: false, maxLength: 500 })] });
}
