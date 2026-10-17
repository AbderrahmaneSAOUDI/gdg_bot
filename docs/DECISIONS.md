# 📋 User Decisions & Architectural Directives Log

> **Rule Invariant**: All decisions, directives, architectural choices, and constraints stated by the user across any chat conversation MUST be recorded in this document and mirrored in [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md). Agents must consult this log at the start of every session so the user never has to repeat orders.

---

## 📜 Active Decisions Index

| ID | Title | Date | Status | Scope |
|---|---|---|---|---|
| [DEC-001](#dec-001-ui-first-interactive-component-paradigm) | UI-First Interactive Component Paradigm | 2026-09-18 | **Active** | UI / Commands |
| [DEC-002](#dec-002-google-brand-colors-for-general-bot-ui) | Google Brand Colors for General Bot UI | 2026-09-18 | **Active** | Visual Tokens |
| [DEC-003](#dec-003-gdg-ghardaia-official-club-structure--department-colors) | Official Club Structure & Department Colors | 2026-09-18 | **Active** | Teams / Roles / Colors |
| [DEC-004](#dec-004-centralized-reusable-discord-component-library) | Centralized Reusable Discord Component Library | 2026-09-18 | **Active** | UI Architecture |
| [DEC-005](#dec-005-decoupled-4-tier-bot-architecture) | Decoupled 4-Tier Bot Architecture | 2026-09-18 | **Active** | Architecture |
| [DEC-006](#dec-006-standardized-navigation-and-custom-id-schema) | Standardized Navigation and Custom ID Schema | 2026-09-18 | **Active** | Interaction Handling |
| [DEC-007](#dec-007-strict-phase-gating-and-anti-speculation) | Strict Phase Gating & Anti-Speculation | 2026-09-18 | **Active** | Project Scope |
| [DEC-008](#dec-008-automatic-decision-tracking--zero-order-repetition) | Automatic Decision Tracking & Zero Order Repetition | 2026-09-18 | **Active** | AI Agent Behavior |
| [DEC-009](#dec-009-unified-core-team-canonical-sort-order--role-naming) | Unified Core Team, Canonical Sort Order & Role Naming | 2026-09-18 | **Active** | Club Structure / Roles |
| [DEC-010](#dec-010-leadership--co-manager-nomenclature-and-core_team-token) | Leadership & Co-Manager Nomenclature & CORE_TEAM Token | 2026-09-18 | **Active** | Terminology / Roles |
| [DEC-011](#dec-011-zero-hardcoding-for-buttons-texts-and-colors) | Zero-Hardcoding for Buttons, Texts, and Colors | 2026-09-18 | **Active** | Architecture / UI |

---

## 🏛️ Recorded Decisions

### DEC-001: UI-First Interactive Component Paradigm
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: *"Commands are for bootstrapping. UI is for everything else."*
- **Details**:
  - Keep slash commands minimal (e.g., `/bot` for general hub, `/bot deploy_channel` for channel-pinned dashboards).
  - All end-user workflows, role browsing, department inspection, settings, and forms must occur via interactive Discord components (Buttons, Select Menus, Modals).
  - Slash command proliferation is strictly banned.

### DEC-002: Google Brand Colors for General Bot UI
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: Use official Google colors only for general bot UI.
- **Details**:
  - Blue (`#4285F4`), Red (`#EA4335`), Yellow (`#FFD427`), Green (`#34A853`), Dark (`#1E1E1E`), Light Grey (`#F0F0F0`).
  - No arbitrary hex colors may be hardcoded or introduced for general-purpose embeds or buttons.
  - All colors must be imported from [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js).

### DEC-003: Official Club Structure & Department Colors
- **Date**: 2026-09-18
- **Status**: Accepted / Active (Refined by DEC-009)
- **User Directive**: Specific club hierarchy and official color assignments:
  - **Core Leadership (Red - `#EA4335`)**: President, Vice President, HR, Secretary General.
  - **Relations Department (Yellow - `#FFD427`)**: Relations Co-Manager + department members.
  - **Logistics Department (Brown - `#A84300`)**: Logistics Co-Manager + department members.
  - **Media Department (Blue - `#4285F4`)**: Media Co-Manager + department members.
  - **Design Department (Green - `#34A853`)**: Design Co-Manager + department members.
  - **Development Department (Purple - `#A142F4`)**: Development Co-Manager + department members.
  - **Members without department (Grey - `#5F6368`)**.
  - **Old members / Alumni (Grey - `#5F6368`)**.
  - **Bots & Apps (Discord Black - `#000001`)**: Uses `#000001` (`0x000001`) instead of `#000000` because Discord renders `#000000` as transparent/default role color.
- **Details**:
  - Never invent, approximate, or modify department colors.
  - Department colors are only used when displaying information specifically related to that department/team.
  - Department tokens are centralized in [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js) (`DEPARTMENT_COLORS`, `DEPARTMENT_HEX_COLORS`) and team configs reside in [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js).

### DEC-004: Centralized Reusable Discord Component Library
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: Before writing feature code, build and reuse centralized components from `src/ui/`.
- **Details**:
  - Reusable components: Buttons (`createPrimaryButton`, `createSecondaryButton`, `createDangerButton`, `createSuccessButton`, `createLinkButton`), Embeds (`createStandardEmbed`, `createAlertEmbed`, `createTeamEmbed`, `createDashboardEmbed`), Select Menus (`createStringSelectMenu`, `createRoleSelectMenu`, `createUserSelectMenu`), and Action Rows (`createPaginationActionRow`, `createNavigationRow`).
  - Raw Discord component creation (`new ButtonBuilder()`, `new EmbedBuilder()`) inside feature handlers is banned.

### DEC-005: Decoupled 4-Tier Bot Architecture
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: Clean separation between Discord interactions, UI rendering, feature logic, and data.
- **Hierarchy**:
  $$\text{Feature/Service} \longrightarrow \text{Data Store} \longrightarrow \text{UI Component} \longrightarrow \text{Discord Interaction}$$
- **Details**:
  - Interaction listeners in `events/` or `commands/` must never contain raw database queries or direct embed building.

### DEC-006: Standardized Navigation and Custom ID Schema
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: Unified navigation and custom ID convention across all interactive views.
- **Details**:
  - Standard navigation controls: `[ ⬅️ Back ]`, `[ 🏠 Home ]`, `[ ✕ Close ]`.
  - Standard Custom ID format: `bot:<namespace>:<action>[:<param1>[:<param2>...]]`.
  - All IDs must be built and parsed via [`src/config/customIds.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/customIds.js).

### DEC-007: Strict Phase Gating & Anti-Speculation
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: Strictly implement the task at hand. Do not build ahead into speculative future phases.
- **Details**:
  - Phase 0: Foundation, UI system, permissions, core setup.
  - Phase 1+: Member tracking, external integrations (Todoist, Google Calendar), AI assistants.
  - Do NOT build future features without explicit user authorization.

### DEC-008: Automatic Decision Tracking & Zero Order Repetition
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**: *"create a rule that follows chats here and write my decisions so I don't have to repeat orders each conversation."*
- **Details**:
  - The agent must continuously observe user statements, preferences, corrections, and instructions in chats.
  - Any architectural choice, formatting preference, constraint, or structural rule must be recorded into this log immediately.
  - Every new conversation session must start by reading [`AGENTS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/AGENTS.md) and [`docs/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/docs/DECISIONS.md) to guarantee full context continuity without the user having to restate orders.

### DEC-009: Unified Core Team, Canonical Sort Order & Role Naming
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**:
  > *"No the core team contains all dep + president + VP + HR + SG, not separating them.*
  > *MEMBER not MEMBER_NO_DEPT*
  > *BOT not BOTS_AND_APPS*
  > *always use this sort for club structure:*
  > *• President*
  > *• Vice President*
  > *• SG*
  > *• HR*
  > *• Relations*
  > *• Logistics*
  > *• Media*
  > *• Design*
  > *• Dev"*
- **Details**:
  - **Unified Core Team**: The Core Team comprises all 9 positions (President, VP, SG, HR, Relations, Logistics, Media, Design, Dev). Do not divide them into separate executive vs co-manager groups.
  - **Canonical Club Structure Sort Order**: Must always use this exact sequence whenever listing roles, squads, or club structure:
    1. `President` (Red `#EA4335`)
    2. `Vice President` (Red `#EA4335`)
    3. `SG` (Red `#EA4335`)
    4. `HR` (Red `#EA4335`)
    5. `Relations` (Yellow `#FFD427`)
    6. `Logistics` (Brown `#A84300`)
    7. `Media` (Blue `#4285F4`)
    8. `Design` (Green `#34A853`)
    9. `Dev` (Purple `#A142F4`)
  - **Canonical Role Names**:
    - Use `MEMBER` (never `MEMBER_NO_DEPT` or `MEMBER_NO_DEPARTMENT`).
    - Use `BOT` (never `BOTS_AND_APPS`).
    - Use `ALUMNI`.
  - **Color Tokens**:
    - Logistics Brown is `#A84300` (`0xa84300`).
    - Discord Bot true black is `#000001` (`0x000001`).
    - Member and Alumni grey is `#5F6368` (`0x5f6368`).
- **Affected Files**:
  - [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js)
  - [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js)
  - [`src/ui/hub.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/hub.js)
  - [`test/ui-components.test.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/test/ui-components.test.js)
  - [`docs/PERMISSIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/docs/PERMISSIONS.md)
  - [`docs/DISCORD_UI.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/docs/DISCORD_UI.md)

### DEC-010: Leadership & Co-Manager Nomenclature and CORE_TEAM Token
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**:
  > *"never call co-managers as leads, the lead is only the president, co-lead is VP, departments managers are called department co-managers."*
- **Concrete Rules**:
  1. **"Lead"**: Strictly reserved for the President (*"Chapter Lead & Community President"*).
  2. **"Co-Lead"**: Strictly reserved for the Vice President (*"Community Vice President & Strategic Co-Lead"*).
  3. **"Department Co-Manager"**: All department heads (Relations, Logistics, Media, Design, Dev) are designated exclusively as *"Department Co-Manager"*. Never refer to them as "leads" or "co-leads".
  4. **Token Naming**: The leadership role color token in [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js) is named `CORE_TEAM` (`ROLE_COLORS.CORE_TEAM` and `ROLE_HEX_COLORS.CORE_TEAM`), replacing `CORE_RED`.
- **Affected Files**:
  - [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js)
  - [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js)
  - [`docs/PERMISSIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/docs/PERMISSIONS.md)
  - [`docs/DISCORD_UI.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/docs/DISCORD_UI.md)
  - [`test/ui-components.test.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/test/ui-components.test.js)

### DEC-011: Zero-Hardcoding for Buttons, Texts, and Colors
- **Date**: 2026-09-18
- **Status**: Accepted / Active
- **User Directive**:
  > *"back to empty bot `/bot` command that shows only [knowledge / My Profile] for now and remove other buttons with details.*
  > *decision: never hardcode buttons and texts and colors, always use config and components"*
- **Context & Rationale**:
  - Enforces pure decoupling and eliminates magic strings, hardcoded IDs, and inline color numbers across all interaction handlers, commands, and UI views.
  - Streamlines `/bot` command to only present verified foundational screens (`Knowledge` and `My Profile`), eliminating speculative/mock features (`Team`, `Meetings`, `Activities`, `Requests`, `More`).
- **Concrete Rules / Implementation**:
  1. **Buttons**: Always use button builders from `src/ui/components/buttons.js` (`createKnowledgeButton`, `createProfileButton`, `createBackButton`, etc.) configured with tokens from `src/config/labels.js` and `src/config/emojis.js`.
  2. **Custom IDs**: All custom IDs must be generated/resolved via `src/config/customIds.js` (`CUSTOM_IDS.HUB_*`).
  3. **Texts & Messages**: All user-facing strings, headers, descriptions, and error notifications must reside in `src/messages/` (`DASHBOARD_MESSAGES`, `KNOWLEDGE_MESSAGES`, `COMMON_MESSAGES`, `ERROR_MESSAGES`) or `src/config/labels.js`.
  4. **Colors**: General UI components and embeds must resolve colors exclusively via `src/config/colors.js`.
- **Affected Files**:
  - [`src/config/labels.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/labels.js)
  - [`src/config/customIds.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/customIds.js)
  - [`src/messages/dashboard.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/messages/dashboard.js)
  - [`src/messages/knowledge.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/messages/knowledge.js)
  - [`src/messages/common.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/messages/common.js)
  - [`src/messages/errors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/messages/errors.js)
  - [`src/ui/components/buttons.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/components/buttons.js)
  - [`src/ui/hub.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/hub.js)
  - [`src/commands/general/bot.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/commands/general/bot.js)
  - [`src/events/interactionCreate.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/events/interactionCreate.js)

### DEC-012: Standardized File Naming Prefixes & Single Responsibility Principle
- **Date**: 2026-09-19
- **Status**: Accepted / Active
- **User Directive**:
  > *"rename all files in this project so I have like: c_* for components, cmd_* for commands, cfg_* for configuration files, f_* for functions, json_* for functions that CRUD json files, view_* for views, msg_* for messages, each file should handle one task, I don't care about number of files, I care about the code to be easy to understand."*
- **Context & Rationale**:
  - Eliminates ambiguity in IDE tabs and fuzzy file searches (`Ctrl+P`).
  - Strict Single Responsibility Principle (SRP): each file performs one task.
  - Distinguishes reusable widgets (`c_*`) from assembled screen payloads (`view_*`).
- **Concrete Rules / Implementation**:
  1. `cmd_*`: Slash commands in `src/commands/general/cmd_bot.js`.
  2. `evt_*`: Gateway event handlers in `src/events/evt_clientReady.js`, `evt_interactionCreate.js`.
  3. `c_*`: Reusable components in `src/ui/components/`, `src/ui/embeds/`, `src/ui/navigation/`.
  4. `view_*`: Assembled screen payloads in `src/ui/view_hub.js`.
  5. `cfg_*`: Configurations and tokens in `src/config/cfg_*.js`.
  6. `msg_*`: Centralized text messages and copy in `src/messages/msg_*.js`.
  7. `json_*`: Local JSON store CRUD operations in `src/data/json_*.js`.
  8. `srv_*`: Business logic services in `src/features/srv_*.js`.
  9. `f_*`: Pure utility helper functions in `src/utils/f_*.js`.
  10. `t_*`: Unit and integration test suites in `test/t_*.test.js`.
  11. Directory barrel files (`index.js`) maintained across all modules.
- **Affected Files**: Entire codebase, `src/`, `test/`, `docs/SHORTCUTS.MD`, `.agent/rules/file-naming.md`

---

## 📝 Decision Entry Template (For Future Entries)

When recording a new decision made in chat, append an entry using this format:

```markdown
### DEC-XXX: [Descriptive Decision Title]
- **Date**: YYYY-MM-DD
- **Status**: Accepted / Active
- **User Directive**: *"[Exact or summarized directive given by user in chat]"*
- **Context & Rationale**: [Why this decision was made]
- **Concrete Rules / Implementation**:
  - [Rule 1]
  - [Rule 2]
- **Affected Files**: [`path/to/file.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/path/to/file.js)
```
