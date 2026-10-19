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
### D-012
- **Decision**: Standardized File Naming & Prefix Conventions with Single Responsibility Principle.
- **Status**: Accepted
- **Rationale**: Direct user directive. Maximizes code readability and instant file recognition in the editor (tabs and fuzzy search `Ctrl+P`). Enforces that every file handles a single task, while keeping reusable components distinct from assembled views.
- **Directives**:
  1. `cmd_*`: Slash commands in `src/commands/`.
  2. `evt_*`: Discord gateway event handlers in `src/events/`.
  3. `c_*`: Reusable UI components used more than once in `src/ui/components/`, `src/ui/embeds/`, `src/ui/navigation/`.
  4. `view_*`: Assembled screen payloads in `src/ui/` (e.g. `view_hub.js`).
  5. `cfg_*`: Configuration, design tokens, and keys in `src/config/`.
  6. `msg_*`: System messages, text copy, and response templates in `src/messages/`.
  7. `json_*`: Local JSON storage CRUD functions in `src/data/`.
  8. `srv_*`: Business logic & service handlers in `src/features/`.
  9. `f_*`: Pure standalone utility helper functions in `src/utils/`.
  10. `t_*`: Unit and integration tests in `test/`.
  11. Every file must handle one task (Single Responsibility Principle). Folders should be used freely to maintain clean separation.
  12. Architectural directories must maintain `index.js` barrel files that re-export prefixed modules.
- **Affected Files / Scope**: Entire project, `src/`, `test/`, `docs/`, `.agent/`

---

### D-013
- **Decision**: Event & Team Management Architecture, Canonical Team Naming, Automated Role Provisioning, and @CORE View-Only Invariant.
- **Status**: Accepted
- **Rationale**: User directive for organizing Discord competitions, hackathons, and activities. Requires strict naming ("Teams" instead of "groups"), automatic provisioning of Member and Mentor roles, and strict view-only channel permission isolation for the `@CORE` role.
- **Directives**:
  1. Nomenclature: The term "Groups" is deprecated; use "Teams" across all UI labels, custom IDs, and data structures.
  2. Role Naming Format: `${eventName} - Team ${teamNumber} - Member` and `${eventName} - Team ${teamNumber} - Mentor`.
  3. Team Member Role: Standard permissions (`ViewChannel`, `SendMessages`, `AddReactions`, `AttachFiles`, `Connect`, `Speak`). Color: Google Blue (`#4285F4`).
  4. Team Mentor Role: Hoisted = true. Permissions: Member permissions + `PrioritySpeaker`, `ManageMessages`. Color: Google Yellow (`#FFD427`).
  5. `@CORE` View-Only Invariant on Team Channels: `@CORE` has `ViewChannel: true` and `ReadMessageHistory: true`, but explicitly `SendMessages: false`, `AddReactions: false`, `CreatePublicThreads: false`, `CreatePrivateThreads: false`, `SendMessagesInThreads: false`, and `Speak: false`.
  6. Discord native `UserSelectMenu` is used for multi-member and mentor assignments.
- **Affected Files / Scope**: `src/config/`, `src/features/`, `src/data/`, `src/ui/`, `src/messages/`, `src/events/`, `test/`

### D-014
- **Decision**: Human-Readable Entity Formatting for Users, Roles, Channels, and Servers.
- **Status**: Accepted
- **Rationale**: Direct user directive. Avoid displaying raw Discord snowflake mention codes like `<@1442993500399472710>`, `<#...>`, or `<@&...>`. All user, role, channel, and server representations in UI embeds and views must resolve to clean, readable display names using live cache with cold-start directory fallback.
- **Directives**:
  1. `formatUserName(guild, userId)`: Resolves member/user display names using guild cache, client cache, or `KNOWN_MEMBERS` directory.
  2. `formatRoleName(guild, roleId, fallback)`: Resolves role names using guild cache or `KNOWN_ROLES` directory.
  3. `formatChannelName(guild, channelId, fallback)`: Resolves channel names with proper `#` or `🔊 ` prefixes using guild cache or `KNOWN_CHANNELS` directory.
  4. `formatGuildName(guild)`: Resolves guild name or defaults cleanly to `GDG Ghardaia`.
  5. UI payloads must never emit raw mention code strings like `<@ID>`.
- **Affected Files / Scope**: `src/utils/f_formatters.js`, `src/utils/index.js`, `src/ui/view_teams.js`, `src/ui/view_mentors.js`, `src/ui/view_event_detail.js`, `src/ui/view_assign.js`, `src/events/evt_interactionCreate.js`, `test/t_formatters.test.js`

### D-015
- **Decision**: Server Data Extractor with Dual Structured JSON & Human-Readable Transcripts, Admin Gating, and Categorized Hierarchy.
- **Status**: Accepted
- **Rationale**: Direct user directive to extract all guild metadata, roles, permission matrices, and complete message histories from server creation to the local `server_data` folder.
- **Directives**:
  1. Primary Trigger: An Administrator-only button [📥 Extract Server Data] rendered in `/bot` Hub action rows (`CUSTOM_IDS.HUB_EXTRACT_SERVER`).
  2. Scope of Extraction: Full server info, all roles with permissions, channel-role permission matrix, categories as folders with `_category_info.json`, channels as subfolders with `channel_info.json` or `voice_info.json`.
  3. Message History: All messages paginated back to creation saved in both structured `messages.json` and human-readable `transcript.txt`.
  4. Security: Gated strictly to guild members with `Administrator` or `ManageGuild` permissions.
  5. Gateway Intents: Uses standard unprivileged intents (`Guilds`, `GuildMessages`). REST message pagination via HTTP operates without requiring privileged WebSocket intents.
- **Affected Files / Scope**: `src/config/cfg_customIds.js`, `src/config/cfg_labels.js`, `src/config/cfg_emojis.js`, `src/ui/components/c_buttons.js`, `src/ui/view_hub.js`, `src/messages/msg_extractor.js`, `src/utils/f_sanitizer.js`, `src/features/srv_extractor.js`, `src/events/evt_interactionCreate.js`, `src/index.js`, `test/t_extractor.test.js`

### D-015
- **Decision**: Teams View Pagination, One-Name-Per-Line Formatting, and Removal of Unrequested Categories.
- **Status**: Accepted
- **Rationale**: Direct user directive. Teams page displays one team at a time with `[◀️ Previous] [Team X of Y] [Next ▶️]` pagination controls. Mentors and members are formatted cleanly one name per line (`• <DisplayName>`) to ensure maximum readability and eliminate visual clutter. Artificial categories ("Web & Mobile", etc.) are strictly removed; teams are identified by their canonical name (e.g. `Team 1`). EventX description is tailored to its role as an internal hands-on Core Team simulation program for planning DevFest-scale events.
- **Affected Files / Scope**: `src/ui/view_teams.js`, `src/events/evt_interactionCreate.js`, `src/data/json_events.js`, `data/events.json`, `src/ui/components/c_modals.js`, `test/t_events_teams.test.js`

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


