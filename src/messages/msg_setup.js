const identity = (issue) => issue.displayName || issue.userId || issue.roleKey || issue.departmentKey || issue.roleId || issue.channelId || issue.eventName || issue.teamName || '';
export function describeSetupIssue(issue) {
  const name = identity(issue);
  const messages = {
    ROLE_DIRECTORY_UNAVAILABLE: 'Discord roles could not be read. Check the bot connection and server access.',
    BOT_PERMISSION_MISSING: `The bot needs ${issue.permission || 'the required permission'}. Update its role permissions before retrying.`,
    DUPLICATE_ROLE: `${name} has multiple roles with its canonical name. Choose the intended role ID explicitly in Bind Roles.`,
    TRUSTED_ROLE_UNBOUND: `${name} has no trusted leadership role binding. An administrator must bind its Discord role ID.`,
    DEPARTMENT_ROLE_UNBOUND: `${name} has no department membership role binding. Bind an existing canonical role, or approve a membership to create a missing role.`,
    ROLE_MISSING: `${name} refers to a missing Discord role${issue.roleId ? ` (${issue.roleId})` : ''}. Correct its binding before syncing members.`,
    ROLE_HIERARCHY: `The bot cannot manage ${name}. Place its highest role above this role and use an unmanaged role.`,
    MEMBER_LEFT: `${name} is registered but cannot be fetched from this server. Verify their membership before editing the record.`,
    MEMBERSHIP_DRIFT: `${name}'s Discord department roles differ from stored membership. Preview and confirm Sync Member to restore the stored department and archive status.`,
    CHANNEL_INACCESSIBLE: `Stored channel ${issue.channelKey || name} (${issue.channelId || 'unknown'}) is missing or inaccessible to the bot. Check its server and permissions.`,
    UNRESOLVED_OPERATION: `Operation ${issue.operationId} for ${name} was interrupted. Inspect the operation journal; a member sync can restore a registered member's stored membership.`,
    EVENT_STORAGE_ERROR: 'Event storage cannot be validated. Preserve the original file and restore a supported backup before changing events.',
    LEGACY_EVENTS_UNBOUND: `${issue.count} legacy event record(s) have no guild binding. An administrator must explicitly bind them before use.`,
    TEAM_REFERENCE_INVALID: `${issue.eventName} / ${issue.teamName} has an inconsistent guild or event reference. Correct its stored scope before management.`,
    TEAM_ROLE_MISSING: `${issue.eventName} / ${issue.teamName} has a missing ${issue.assignmentType} role (${issue.roleId || 'unbound'}). Retry the relevant management action after checking bindings.`,
    UNSAFE_TEAM_ROLE: `${issue.eventName} / ${issue.teamName} has an unsafe ${issue.assignmentType} role (${issue.roleId}). Review protected-role collisions and use confirmed Repair Team before assigning people.`,
    TEAM_MEMBER_LEFT: `${issue.eventName} / ${issue.teamName} references ${name}, who cannot be fetched from this server. Review that roster entry.`,
    TEAM_ROLE_DRIFT: `${issue.eventName} / ${issue.teamName}: ${name} lacks the stored ${issue.assignmentType} role. Use Manage Roster to retry the assignment.`,
    TEAM_PARTIAL_OPERATION: `${issue.eventName} / ${issue.teamName} has unfinished provisioning or cleanup (${issue.status}). Retry its explicit management action and review recorded failures.`,
    CORE_BINDING_MISSING: `${issue.eventName} / ${issue.teamName} has no configured CORE role for its channels. Bind CORE before provisioning or repairing channels.`,
    CORE_OVERWRITE_MISSING: `${issue.channelName || issue.channelId} does not preserve every CORE view-only overwrite. Review channel permissions before allowing team activity.`,
    CORE_OVERWRITE_CONFLICT: `${issue.channelName || issue.channelId} has another overwrite (${issue.conflictingId}) that can grant CORE members messaging or voice access if it also applies to them. Discord combines role allows; review overlapping roles.`,
    CORE_ADMIN_OVERRIDE: `${name} has Discord Administrator, which bypasses channel overwrites. CORE view-only restrictions cannot constrain this account.`,
    UNSAFE_MEMBERSHIP_ROLE: `${name} is bound as a department membership role but has an unexpected name or elevated permissions. Bind the canonical membership role without administrative permissions.`,
  };
  return messages[issue.code] || `Setup issue ${issue.code}: ${name}. Review the stored configuration and retry.`;
}
