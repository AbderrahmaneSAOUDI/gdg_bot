import { buildCustomId } from './cfg_customIds.js';

/** Club UI tokens. Canonical departments continue to live in cfg_teams.js. */
export const CLUB_UI = Object.freeze({ PAGE_SIZE: 8, ISSUE_PAGE_SIZE: 5, ALL: 'ALL', NONE: 'NONE' });

export const CLUB_LABELS = Object.freeze({
  MEMBERS: 'Members', DEPARTMENTS: 'Departments', APPROVALS: 'Approval Center',
  OVERVIEW: 'Club Overview', SETUP: 'Check Setup', REQUEST_DEPARTMENT: 'Request Department',
  MY_REQUESTS: 'My Requests', MY_TEAMS: 'My Teams', SEARCH: 'Search',
  REGISTER: 'Register Member', TRANSFER: 'Transfer Member', ARCHIVE: 'Archive Record',
  REACTIVATE: 'Reactivate Record', MANAGE_MEMBERS: 'Manage Members', VIEW_MEMBERS: 'View Members',
  REQUEST_JOIN: 'Request to Join', APPROVE: 'Approve', REJECT: 'Reject', CANCEL_REQUEST: 'Cancel Request',
  REPAIR: 'Preview Repair', BIND_ROLES: 'Configure Role Bindings', CONFIRM_BIND: 'Confirm Role Binding',
  CONFIRM_REPAIR: 'Confirm Role Repair', APPOINT: 'Appoint Co-Manager',
  LEGACY_EVENTS: 'Review Legacy Events',
  CONFIRM_APPOINT: 'Confirm Appointment', REVIEW: 'Review Change', OPEN_CHANNEL: 'Open Channel',
  DETAILS: 'Open Team', ALL_DEPARTMENTS: 'All Departments', NO_DEPARTMENT: 'No Department',
  ALL_STATUSES: 'All Statuses', ACTIVE: 'Active', ARCHIVED: 'Archived', PENDING: 'Pending',
  APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
  MEMBER_PICKER: 'Choose an existing Discord member', DEPARTMENT_PICKER: 'Choose a department',
  MEMBER_DETAILS_PICKER: 'Open a registered member', REQUEST_PICKER: 'Open a request',
  DEPARTMENT_FILTER: 'Filter by department', STATUS_FILTER: 'Filter by status',
  ROLE_BINDING_PICKER: 'Choose the canonical role binding to configure',
  ROLE_PICKER: 'Choose the trusted Discord role', ROLE_CORE: 'CORE channel access role',
  SEARCH_TITLE: 'Find Registered Members', SEARCH_INPUT: 'Display name or Discord user ID',
  REJECT_TITLE: 'Reject Department Request', REASON_INPUT: 'Decision reason (optional)',
  SEARCH_FIELD: 'search', REASON_FIELD: 'reason',
});

/** Reject delimiters and overlong IDs before handing a component to Discord. */
export function clubId(action, ...params) {
  const parts = [action, ...params].map((value) => String(value));
  if (parts.some((part) => !part || part.includes(':'))) throw new Error('Invalid club component identifier');
  const id = buildCustomId('club', ...parts);
  if (id.length > 100) throw new Error('Club component identifier exceeds Discord limits');
  return id;
}
