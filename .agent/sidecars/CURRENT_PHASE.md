# Current Phase: Phase 2 — Club Management Core

Authorized by the user's release request on 2026-10-19. Earlier Phase 0/1 limits
are superseded only for this explicit release scope; prior identity and engineering
decisions remain binding.

## Approved scope

- Role-aware `/bot`, private navigation and persistent public entry points.
- Registered member and canonical department directories, profile and My Teams.
- Membership/transfer requests, scoped approvals, history, authorized administration.
- Reliable department and competition role synchronization, event/team edits and archive.
- Confirmed roster changes/deletion, explicit private channels and resource repair.
- Durable validated local JSON, authorization, pagination, regression tests and documentation.
- Read-only setup diagnostics with separate authorized previews and confirmed repairs.

## Deferred roadmap

Meetings, tasks, attendance, points, Google Calendar, Todoist, AI assistants,
external HR systems, advanced moderation, and cloud database migration.

## Operating boundary

Work locally. Preserve populated runtime JSON, `.env`, and unrelated processes.
Do not register commands, start a live bot, publish, push, or release without a
separate user instruction. Automated checks use isolated stores and mock Discord.
