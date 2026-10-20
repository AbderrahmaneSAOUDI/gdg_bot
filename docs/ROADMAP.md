# Roadmap

Phase 2 Club Management Core is implemented locally. Before deployment, an operator
must configure trusted role IDs, confirm legacy event ownership, and execute the
[manual test-guild checklist](TEST_GUILD.md).

The following are deliberately deferred and have no placeholder controls in the hub:

- Meetings, scheduling, task coordination, and Todoist.
- Attendance, activity scores, and points.
- Google Calendar and other external-service integrations.
- AI assistants and external HR systems.
- Cloud database migration and multiple-process operation.
- Advanced moderation.

Any later phase requires explicit user approval; local JSON remains the supported
single-process store for this release.
