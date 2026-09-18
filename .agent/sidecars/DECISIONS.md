# Persistent Project Decisions

> **Persistent Memory**: Decisions recorded here are immutable project constraints. Agents must never ask the user to re-confirm these decisions or write code that contradicts them.

---

## Decisions Log

### D-001
- **Decision**: Discord UI (buttons, select menus, modals) is the primary user interface.
- **Status**: Accepted
- **Rationale**: Keeps commands clean, prevents typing errors, and provides an app-like interactive experience. Slash commands are reserved for initial bootstrapping.

### D-002
- **Decision**: `/bot` is the main entry command.
- **Status**: Accepted
- **Rationale**: Provides a unified hub for navigating departments, roles, and administrative functions rather than scattering dozens of distinct slash commands.

### D-003
- **Decision**: Tasks and Todoist integration are outside the MVP (Phase 0).
- **Status**: Accepted
- **Rationale**: Keeps the initial scope bounded to foundational components and core member experience before introducing external API dependencies.

### D-004
- **Decision**: General bot UI exclusively uses official Google Brand colors.
- **Status**: Accepted
- **Tokens**: `BLUE` (`#4285F4`), `RED` (`#EA4335`), `YELLOW` (`#FFD427`), `GREEN` (`#34A853`), `DARK` (`#1E1E1E`), `LIGHT_GREY` (`#F0F0F0`).
- **Rationale**: Preserves the official Google Developer Groups identity. No arbitrary general colors allowed.

### D-005
- **Decision**: Department and squad colors derive strictly from official GDG Ghardaia configuration.
- **Status**: Accepted (Refined by D-009)
- **Assignments**:
  - Relations: Yellow (`#FFD427`)
  - Logistics: Brown (`#A84300`)
  - Media: Blue (`#4285F4`)
  - Design: Green (`#34A853`)
  - Development / Dev: Purple (`#A142F4`)
  - Core Executive: Red (`#EA4335`)
  - Member & Alumni: Grey (`#5F6368`)
  - Bot: Discord Black (`#000001` / `0x000001`)
- **Rationale**: Provided by chapter leadership from brand assets; must never be guessed, approximated, or modified.

### D-006
- **Decision**: All Discord UI components must be imported and reused from `src/ui/`.
- **Status**: Accepted
- **Rationale**: Prevents code duplication, ensures consistent component states, button limits (max 5 per row), and uniform error handling.

### D-007
- **Decision**: 4-Tier Decoupled Architecture (`Interaction -> Service -> Data -> UI`).
- **Status**: Accepted
- **Rationale**: Isolates Discord API details from domain logic and data storage, ensuring high testability and maintainability.

### D-008
- **Decision**: Persistent decision tracking & zero order repetition.
- **Status**: Accepted
- **Rationale**: All user directives from chats are actively captured in `.agent/sidecars/DECISIONS.md` and applied across all sessions so the user never has to repeat orders.

### D-009
- **Decision**: Unified Core Team, Canonical Club Structure Sort Order, and Canonical Role Naming.
- **Status**: Accepted
- **Directives**:
  1. Core Team contains all 9 roles unified (President, Vice President, SG, HR, Relations, Logistics, Media, Design, Dev) without artificial separation.
  2. Always sort club structure as:
     - President
     - Vice President
     - SG
     - HR
     - Relations
     - Logistics
     - Media
     - Design
     - Dev
  3. Strict role naming: `MEMBER` (not `MEMBER_NO_DEPT`), `BOT` (not `BOTS_AND_APPS`).
- **Rationale**: Chapter organizational model defined directly by user. Must be preserved across all views, data structures, and tests.

### D-010
- **Decision**: Leadership & Co-Manager Nomenclature Conventions & CORE_TEAM Token.
- **Status**: Accepted
- **Directives**:
  1. "Lead" is strictly reserved for the President ("Chapter Lead & Community President").
  2. "Co-Lead" is strictly reserved for the Vice President ("Community Vice President & Strategic Co-Lead").
  3. Department heads are always called "Department Co-Managers" (never "leads" or "co-leads").
  4. Core role color token in `colors.js` is named `CORE_TEAM` (`ROLE_COLORS.CORE_TEAM`, `ROLE_HEX_COLORS.CORE_TEAM`).
- **Rationale**: Strict terminology constraint set directly by user.

### D-011
- **Decision**: Never hardcode buttons, texts/labels, emojis, or colors. Always use centralized configuration and reusable components.
- **Status**: Accepted
- **Rationale**: Direct user directive. Keeps codebase maintainable, ensures consistency, eliminates magic strings, and enforces strict separation of concerns.
- **Directives**:
  1. Buttons must be generated via `src/ui/components/buttons.js` using `BUTTON_LABELS` and `EMOJIS`.
  2. All custom IDs must be generated/resolved via `src/config/customIds.js` (`CUSTOM_IDS` / `buildCustomId`).
  3. All texts, titles, descriptions, and system messages must be stored in `src/messages/` or `src/config/labels.js`.
  4. All colors must be imported from `src/config/colors.js`.
  5. The `/bot` hub is simplified to only show `Knowledge` and `My Profile` for now, with other speculative buttons and details removed.
- **Affected Files / Scope**: `src/ui/`, `src/config/`, `src/messages/`, `src/events/`, `src/commands/`

---

## 📝 Sync Format for New Decisions

When recording new decisions from user instructions, append below using this format:

```markdown
### D-XXX
- **Decision**: [Concise statement of decision]
- **Status**: Accepted / Superseded
- **Rationale**: [Why this decision was made]
- **Affected Files / Scope**: [List of components or files affected]
```
