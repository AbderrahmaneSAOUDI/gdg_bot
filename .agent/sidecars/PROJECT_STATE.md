# Project State

- Current Phase: **Phase 2 — Club Management Core**, explicitly authorized 2026-10-19.
- Local release implementation includes club membership, approvals, role-ID authorization,
  directories, management views, setup/repair, and event/team reliability.
- Runtime: Node 22/24, discord.js v14, dotenv, local JSON, single process.
- Existing populated event data and local `.env` are preserved. No dependency additions.
- Agent rules and local skills directories are absent; existing hooks and sidecars apply.
- Reliability follow-up on 2026-10-20 reviewed releases 0.12–0.14 and restored
  legacy button entry points, early acknowledgment, cold-cache names, safe role
  repairs and roster confirmations, departed-member archive, and truthful exports.
- Verification on 2026-10-20: the post-change hook (`npm test`) passed all 219 tests;
  syntax checks passed for 80 JavaScript files and 67 safe application modules imported.
  `git diff --check` passed. The npm script uses built-in discovery on Windows/POSIX.
- Live Discord validation remains an operator task: [test-guild checklist](../../docs/TEST_GUILD.md).
- No push, commit, release, command registration, or live bot startup was performed.

See [architecture](../../docs/ARCHITECTURE.md), [data/recovery](../../docs/DATA_MODEL.md),
and [permissions](../../docs/PERMISSIONS.md). Meetings, tasks, attendance, points,
external integrations, AI, HR systems, and cloud migration remain deferred.
