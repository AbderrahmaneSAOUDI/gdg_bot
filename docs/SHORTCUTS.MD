# ⚡ Developer File Shortcuts & Naming Conventions

> **Core Philosophy**: Every file has a single, well-defined responsibility (**Single Responsibility Principle**). Readability and instant recognition in the IDE take precedence over minimizing file counts. Use folders whenever needed.

---

## 🧭 File Prefix Reference Table

Use this quick reference table to immediately identify what any file does by its prefix, whether viewing tabs in your editor or searching via `Ctrl+P` / `Cmd+P`:

| Prefix | Category | Role & Scope | Target Directory | Example Files |
|---|---|---|---|---|
| `cmd_*` | **Commands** | Slash command definitions, metadata (`SlashCommandBuilder`), and execution dispatchers. | `src/commands/<category>/` | `cmd_bot.js` |
| `evt_*` | **Events** | Discord Gateway event handlers (`ClientReady`, `InteractionCreate`, etc.). | `src/events/` | `evt_clientReady.js`, `evt_interactionCreate.js` |
| `c_*` | **Components** | Atomic, reusable UI elements used across multiple screens (buttons, select menus, modals, pagination, action rows). | `src/ui/components/`, `src/ui/embeds/`, `src/ui/navigation/` | `c_buttons.js`, `c_selectMenus.js`, `c_modals.js`, `c_pagination.js`, `c_embedBuilder.js` |
| `view_*` | **Views** | Complete interactive Discord screen payloads (an embed + action rows) sent to a channel or user. | `src/ui/` | `view_hub.js` |
| `cfg_*` | **Configuration & Tokens** | Static design tokens, Google brand colors, official squad colors, custom IDs, emojis, and labels. | `src/config/` | `cfg_colors.js`, `cfg_teams.js`, `cfg_customIds.js`, `cfg_labels.js`, `cfg_emojis.js` |
| `msg_*` | **Messages** | Centralized user-facing copy, error notices, descriptions, help text, and response templates. | `src/messages/` | `msg_common.js`, `msg_dashboard.js`, `msg_errors.js`, `msg_knowledge.js`, `msg_confirmations.js` |
| `json_*` | **JSON CRUD** | Functions and utilities dedicated to reading, writing, updating, or deleting local JSON files/data stores. | `src/data/` | `json_storage.js`, `json_users.js` |
| `srv_*` | **Services / Features** | Domain business logic, workflow controllers, and external API integrations. | `src/features/` | `srv_member.js`, `srv_meeting.js` |
| `f_*` | **Utility Functions** | Pure standalone utility functions (formatters, date parsers, array helpers, validators). | `src/utils/` | `f_date.js`, `f_format.js` |
| `t_*` | **Unit Tests** | Test suites covering components, configs, and services. | `test/` | `t_ui_components.test.js` |

---

## 🧩 Architectural Concept Guide: Component vs. View vs. Hub

To eliminate ambiguity when naming and organizing UI code:

### 1. What is a Component (`c_*`)?
- **Definition**: A reusable building block that can appear multiple times across different bot screens.
- **Rule**: If a piece of UI code can be reused in more than one place, it MUST be a component (`c_*`).
- **Examples**:
  - `c_buttons.js`: Reusable buttons (Primary, Success, Danger, Back, Home, Close).
  - `c_selectMenus.js`: Reusable select dropdowns (Department select, Member select, Option select).
  - `c_modals.js`: Reusable pop-up modals and input fields.
  - `c_pagination.js`: Reusable page navigation controls (`[◀️ Prev] [Page X/Y] [Next ▶️]`).
  - `c_embedBuilder.js`: Reusable Discord embed generator with official Google brand headers and footers.

### 2. What is a View (`view_*`)?
- **Definition**: A complete, assembled screen sent to Discord.
- A View combines:
  1. An **Embed** (built via `c_embedBuilder.js`)
  2. One or more **Action Rows** (containing `c_*` buttons or select menus)
- When a user clicks a button, the bot transitions them to a new **View**.

### 3. What is the Hub (`view_hub.js`)?
- **Definition**: The central main menu / dashboard of the GDG Ghardaia Bot.
- Running `/bot` launches the **Hub**.
- From the Hub, members can access Knowledge, Profile, Squads, and Admin controls. It is simply the root **View** of the application.

---

## 🎯 Single Responsibility Principle (SRP)

- **One File, One Responsibility**:
  - Never put data reading logic inside a component.
  - Never assemble raw embeds inside an event handler.
  - Never hardcode messages or colors inside a view.
- **Folder Organization**:
  - Keep related files grouped logically in folders (`src/ui/components/`, `src/config/`, `src/messages/`, `src/events/`, `src/commands/`).
  - Use `index.js` as the folder's entry-point barrel file to re-export prefixed modules cleanly for consumers.

---

## 🔍 IDE Fuzzy Search Tricks (`Ctrl+P` / `Cmd+P`)

Using these prefixes makes finding files in VS Code / IDEs instantaneous:

- Type `cmd_` to view all slash commands.
- Type `c_` to view all UI components.
- Type `cfg_` to view all design tokens and configs.
- Type `msg_` to edit system copy or templates.
- Type `view_` to adjust complete interactive screens.
- Type `json_` to locate local JSON database handlers.
