export const CLUB_WIDE_ROLE_KEYS = Object.freeze(['PRESIDENT', 'VICE_PRESIDENT', 'SG', 'HR']);
// Guild-wide powers are never conferred through department or competition membership.
export const UNSAFE_ASSIGNMENT_PERMISSION_NAMES = Object.freeze(['Administrator','ManageGuild','ManageRoles','ManageChannels','KickMembers','BanMembers','ManageWebhooks','ManageMessages','ModerateMembers','MuteMembers','DeafenMembers','MoveMembers','ManageNicknames','ManageEvents','ManageThreads','MentionEveryone','ManageGuildExpressions']);
export const CAPABILITIES = Object.freeze({
  CLUB_MANAGE: 'club.manage', MEMBER_MANAGE: 'members.manage', EVENT_MANAGE: 'events.manage',
  APPROVAL_REVIEW: 'approvals.review', APPROVAL_RESOLVE: 'approvals.resolve', SETUP_MANAGE: 'setup.manage',
});
