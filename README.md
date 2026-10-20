# GDG Ghardaia Discord Bot

Phase 2: Club Management Core. JavaScript ES modules, discord.js v14, dotenv,
local JSON storage, and Node's built-in test runner. Use Node 22 or 24; development
verification used Node 24. No build step or web server is required.

`/bot` opens a private club hub. Its public entries are **Events**, **Members**,
**Departments**, **Knowledge**, and **My Profile**. **Approval Center**, **Club
Overview**, and **Check Setup** appear according to the clicking member's current
capabilities. The authorized server extractor remains available to administrators.

- The member directory contains registered club records, with search, department
  and status filters, details, and pagination. It is not a complete Discord member sync.
- The five departments come from [cfg_teams.js](src/config/cfg_teams.js). Profiles
  distinguish stored membership from current Discord roles.
  Co-Manager names use currently available Discord member data and are labeled as
  known names; the bot does not claim a complete server-member synchronization.
- Members choose a department, submit one pending request, review outcomes, and
  cancel pending requests. Co-Managers review joins to their department; transfers
  require club-wide management. Decisions retain resolver, time, and reason.
- Managers register existing Discord members, transfer, archive/reactivate, and
  confirm leadership appointments. Archive does not kick or ban anyone.
- Events support edits and archive browsing. Competition teams have independent
  membership, mentors, roster moves/removals, paginated rosters, safe deletion,
  explicit private text/voice channels, and confirmed repair.
- **My Teams** contains only the current member's memberships and mentorships in
  this guild. Channel links appear only when the channel exists and is accessible.
- **Check Setup** observes permissions, bindings, references, role drift, partial
  operations, and CORE channel policy. Repairs are separate confirmed actions.

## Install and verify locally

```powershell
npm ci
npm test
git diff --check
```

The test suite uses temporary stores and mocked Discord APIs. It needs no token,
does not connect the bot, and does not reset production JSON. `node_modules/` is
the installation directory; a folder named `node modules` is unrelated.

The repository hooks can be run from Git Bash:

```bash
bash .agent/hooks/pre-change
bash .agent/hooks/post-change
```

`post-change` runs the same `npm test` suite. The pre-commit hook also checks staged
files for accidental environment/token additions. Running tests never deploys commands.

## Configure a test guild

Copy [.env.example](.env.example) to your local `.env` if needed, and populate the
Discord credentials locally. Never paste token values into chat or commit `.env`.
The existing ready handler can post a public greeting on login; startup is an
explicit operator action.

After you choose to start the bot, a Discord **Administrator** or trusted **Manage
Guild** operator should open `/bot` → **Check Setup** → **Bind Roles**. Choose each
canonical binding, select its actual Discord role, review, and confirm. Bindings
are per guild in `data/club.json`; names are suggestions, never authorization.

| Binding | Canonical Discord role |
| --- | --- |
| Trusted club management | President, Vice President, SG, HR |
| Trusted department Co-Managers | Relations, Logistics, Media, Design, Dev |
| Department membership | Relations Department, Logistics Department, Media Department, Design Department, Dev Department |
| CORE channel policy | The server's explicit CORE view-only role |

`Dev` and `Dev Department` must have different IDs. Department membership roles
must use their canonical names and minimal guild permissions. A missing membership
role can be created during an approved membership change when the bot can manage
roles and there is no ambiguous existing canonical role. Existing unbound roles
require explicit binding. Leadership roles are never implicitly created or granted
by a profile field.

Place the bot's highest role above all roles it manages. Membership changes need
**Manage Roles**; provisioning channels also needs **Manage Channels**. Hub messages
need **View Channel**, **Send Messages**, and **Embed Links**. Native member selectors
and individual REST member fetches avoid a full server member synchronization.

The channel policy denies everyone visibility, grants collaboration to team roles,
and gives CORE view/read access with posting, reacting, threads, and speaking denied.
The bot has explicit access. Discord Administrators bypass overwrites; overlapping
role allows can also defeat CORE posting restrictions. Diagnostics report known
conflicts from available member information. See [permissions](docs/PERMISSIONS.md).

## Existing data and migration

Keep backups of `data/events.json` and `data/club.json` before operating the release.
Do this while the bot is stopped by its operator; only one process may use a store.

- Existing populated JSON is preserved. Missing files initialize on a successful
  mutation. Corrupt or unsupported data fails clearly and is never replaced by an
  empty store.
- Event schema 2 preserves legacy array records and unrelated fields. The first
  mutation creates `events.json.pre-v2.bak` before atomic replacement.
- Legacy events without a guild remain hidden from normal guild queries. An
  administrator must use **Check Setup** → **Review Legacy Events**, review the
  selected guild, and confirm ownership. The action binds all currently unscoped
  legacy events to that guild; mixed-guild legacy files need operator review first.
- Club schema 1 stores members, requests, guild configuration, audit, and operation
  journals together. The supported unversioned shape has those same collections;
  migration is backed up before its first write. Other shapes fail validation.
- Recovery checkpoints record prepared and repair-required operations. Membership
  repair uses stored membership as its source of truth. Team repair uses stored
  rosters and resources; pending deletion is retried through the deletion workflow.
- Tests can inject `createClubStore(path)` and `createEventsStore({filePath})` into
  services. They never need a disposable copy of real member data.

Runtime JSON, temporary files, backups, exports, and credentials are ignored. The
pre-existing tracked legacy `data/events.json` is left intact; do not stage runtime
changes to that already tracked file. No dependency migration is required.

## Operator commands

Only run these when you intend the corresponding live action:

```powershell
npm run deploy  # Register /bot using the configured application/guild
npm run dev     # Start the live bot with source watching
# Or: npm start
```

`/bot deploy_channel:#club-hub` requires Administrator or Manage Guild and posts a
persistent public entry point. Every click opens private content for the clicker;
the public message is never converted into a personal or management screen.

## Documentation

- [Architecture](docs/ARCHITECTURE.md), [data and recovery](docs/DATA_MODEL.md),
  [authorization](docs/PERMISSIONS.md), [manual test-guild checklist](docs/TEST_GUILD.md)
- [File conventions](docs/SHORTCUTS.MD), [agent constitution](AGENTS.md),
  [current phase](.agent/sidecars/CURRENT_PHASE.md), [decisions](.agent/sidecars/DECISIONS.md)

Meetings, task coordination, attendance, points, Google Calendar, Todoist, AI
assistants, external HR systems, and cloud databases remain a later roadmap.
