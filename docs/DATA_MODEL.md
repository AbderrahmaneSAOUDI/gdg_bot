# Local storage, migrations, and recovery

`data/club.json` schema 1 contains six top-level fields: `schemaVersion`, `members`,
`requests`, `guilds`, `audit`, and `operations`. All entity access uses guild scope.
Returned snapshots are copies; callers cannot mutate the store by editing a result.

| Entity | Stored information |
| --- | --- |
| Member | guildId, userId, displayName, canonical departmentKey or null, ACTIVE/ARCHIVED, createdAt, updatedAt; unrelated prior metadata preserved |
| Request | UUID, guildId, userId, JOIN/TRANSFER, source/requested department, PENDING/APPROVED/REJECTED/CANCELLED, createdAt, resolvedAt, resolvedBy, reason |
| Guild | guildId, trustedRoleIds keyed by canonical leadership key, departmentRoleIds keyed by canonical department, optional coreRoleId/channels |
| Audit | UUID, guildId, actorId, action, target IDs, UTC timestamp, before/after, outcome |
| Operation | UUID, guildId, userId, actorId, action, requested change, created resources, recovery status, timestamps |

Each member can have one primary department and one pending request in a guild.
Approval updates the member and terminal request decision in the same local
transaction. Repeated terminal decisions return the existing outcome. A pending
transfer does not change access. Membership and leadership role mutations preflight
permissions/hierarchy, record a prepared operation, then compensate failed external
work. New membership access is granted before prior configured membership access is
revoked. Unrelated, event, mentor, and leadership roles are preserved.

The guild bindings can be represented as follows; these labels are placeholders,
not usable Discord IDs. Configure them through Check Setup rather than replacing
an existing populated file with this example.

```json
{
  "guildId": "YOUR_GUILD_ID",
  "trustedRoleIds": { "PRESIDENT": "PRESIDENT_ROLE_ID", "DEV": "DEV_CO_MANAGER_ROLE_ID" },
  "departmentRoleIds": { "DEV": "DEV_DEPARTMENT_MEMBERSHIP_ROLE_ID" },
  "coreRoleId": "CORE_VIEW_ONLY_ROLE_ID"
}
```

`data/events.json` schema 2 is `{ "schemaVersion": 2, "events": [...] }`. Events
carry `guildId`, name, description, ACTIVE/ARCHIVED status, teams, timestamps, and
the last allocated team number. Team numbers are not reused after deletion. Teams
carry owning guild/event IDs, member/mentor role IDs, text/voice channel IDs, arrays
of member/mentor IDs, provisioning/cleanup status and retry resources. Legacy
category/channel maps are preserved. Team membership is independent of department.
Mentors can serve several teams; a competition member moves through confirmation.

Both stores validate their snapshots before writing, fsync a unique temporary
file, then replace the target atomically. Mutations are serialized in the supported
single-process runtime. A corrupt or unreadable file raises an error and remains
available for operator recovery; it is never treated as an empty database.

Before schema migration, the original is backed up beside the target. Legacy event
arrays are read without changing their guild ownership; the first write saves a
`.pre-v2.bak` backup. Unscoped records are excluded from normal guild queries until
an administrator explicitly confirms the owning guild. Do not bind a file containing
events from multiple servers as one batch. The recognized unversioned club shape
has all five collections; the first migration write creates a `.v0.<uuid>.bak` copy.

If Discord work fails, the request stays pending and compensation restores prior
access where possible. `PREPARED` or `REPAIR_REQUIRED` club operations and unfinished
team operation markers remain visible in diagnostics. Check Setup observes state;
confirmed member repair reconciles stored department/status. Confirmed team repair
reconciles known rosters, role names/permissions, and channel policy. A team whose
deletion already began retains its pending resource list and must retry deletion.
Never manually erase repair records to manufacture a successful outcome.

Keep operator backups outside Git. Runtime files and backups are ignored, but the
historically tracked event JSON remains tracked and unchanged by this release.
Factories accept temporary storage paths for tests. External file edits and multiple
process writers are unsupported; stop the bot before operator-level restore/edit.
