# Project State

- Current Phase: **Phase 2 — Club Management Core**, explicitly authorized 2026-10-19.
- Local release implementation includes club membership, approvals, role-ID authorization,
  directories, management views, setup/repair, and event/team reliability.
- Runtime: Node 22/24, discord.js v14, dotenv, local JSON, single process.
- Existing populated event data and local `.env` are preserved. No dependency additions.
- Agent rules and local skills directories are absent; existing hooks and sidecars apply.
- Verification on 2026-10-19: `npm test` and the post-change hook passed all 179 tests;
  syntax checks passed for 77 JavaScript files and 66 safe application modules imported.
  `git diff --check` passed. The npm script uses built-in discovery on Windows/POSIX.
- Live Discord validation remains an operator task: [test-guild checklist](../../docs/TEST_GUILD.md).
- No push, commit, release, command registration, or live bot startup was performed.

See [architecture](../../docs/ARCHITECTURE.md), [data/recovery](../../docs/DATA_MODEL.md),
and [permissions](../../docs/PERMISSIONS.md). Meetings, tasks, attendance, points,
external integrations, AI, HR systems, and cloud migration remain deferred.
