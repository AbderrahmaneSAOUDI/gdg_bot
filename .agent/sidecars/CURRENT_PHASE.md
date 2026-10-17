# Current Phase: Phase 1 — Event & Team Management

## Objective
Implement event management, competition teams, mentor allocations, native Discord role automation, and channel permission enforcement with @CORE view-only isolation.

---

## 🟢 Allowed in Current Phase
- Reusable UI components (Buttons, Select Menus, Modals, Action Rows, Embeds)
- Design tokens & color palettes (Google Brand Colors & Official Team Colors)
- Event management views and data store (`json_events.js`)
- Team CRUD workflows and naming conventions (Teams, not groups)
- Automated Discord role provisioning (`EventX - Team <N> - Member`, `EventX - Team <N> - Mentor`)
- Automated channel permission overwrites (@CORE View-Only Invariant: view/read allowed, send/react denied)
- Native UserSelectMenu and Role assignment handlers
- Unit and integration tests for events, teams, and role permissions

---

## 🔴 Prohibited in Current Phase (Requires Explicit Approval)
- Task management & Todoist API integration
- External cloud database migration (Firestore remains deferred until local JSON schema stabilizes)
- AI assistants, NLP, or LLM-driven bot interactions
- HR management workflows & meeting scheduling modules
- Activity tracking, attendance logging, or automated points system
- Advanced auto-moderation filters

> [!WARNING]
> Before modifying or implementing features, check this file. If a requested feature appears in the prohibited list, STOP and request explicit user confirmation to transition phases.
