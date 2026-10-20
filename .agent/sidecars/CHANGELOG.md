# Project Changelog

All notable changes and architectural increments to the GDG Ghardaia Discord Bot project.

## [Unreleased] - 2026-09-18

### Added
- **Agent Operating System**:
  - Established `AGENTS.md` Constitution with "Think Before Coding", "Initiative vs. Authority", and Pre-Flight Checks.
  - Added dedicated rules: `core.md`, `architecture.md`, `ui.md`, `coding.md`, `project-decisions.md`.
  - Added project sidecars: `PROJECT_STATE.md`, `DECISIONS.md`, `CURRENT_PHASE.md`, `TODO.md`, `CHANGELOG.md`.
  - Added 5 operational skills: `decision-management`, `discord-ui`, `feature-development`, `debugging`, `review`.
  - Added lifecycle hooks: `pre-change`, `post-change`, `pre-commit`.
- **Reusable UI Component System**:
  - Button factory functions (`createPrimaryButton`, `createSecondaryButton`, `createDangerButton`, `createSuccessButton`, `createLinkButton`).
  - Action row builder with automatic 5-button chunking and standard navigation controls (`[Back]`, `[Home]`, `[Close]`).
  - Embed archetypes for standard, alert, team, dashboard, and paginated views.
  - Select menus for roles, users, and squad filters.
  - Modal form builders with URL, date, time, and numeric validation helpers.
- **Club Hierarchy & Design Tokens**:
  - Integrated 5 official departments (Relations, Logistics, Media, Design, Development).
  - Added `DEPARTMENT_COLORS` and `DEPARTMENT_HEX_COLORS` directly to `src/config/colors.js`.
  - Configured official GDG Ghardaia squad colors and Core Leadership role mapping.
  - Added `#000001` true black support for Discord bot roles.
- **Testing**:
  - Added 43 unit tests covering tokens, configs, UI builders, action rows, and hub payloads.
# 2026-10-19 — Phase 2 Club Management Core

User authorized the phase transition and expanded public hub. Added scoped trusted
authorization, versioned club transactions and approval history, directories,
member administration, diagnostics/confirmed repair, durable event/team resource
coordination, private channel actions, isolated tests, and operating documentation.
Corrected npm test discovery for Windows. Existing runtime data is preserved;
no live bot startup, command deployment, push, or release was performed.

# 2026-10-20 — Phase 2 reliability and button follow-up

Reviewed releases 0.12–0.14 after the user reported unresponsive buttons. Restored
legacy team pagination and safe Add/Assign/Delete entry points, moved ordinary
interaction acknowledgment ahead of capability reads, and kept stale submissions
non-mutating with recovery navigation. Added page-scoped member-name resolution,
in-lock roster preview checks, confirmed departed-member archive, incremental role
binding correction, protected CORE guards, complete legacy channel repair, and
monotonic team numbering. Startup no longer requests privileged Gateway content
access. Exports now refresh directories and report failed/partial histories with
durable status files. Regression coverage uses isolated stores and mocked Discord.
No live startup, command registration, populated runtime-data edit, or push.
