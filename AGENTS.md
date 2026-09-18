# 🤖 AGENTS.md — GDG Ghardaia Discord Bot Development Invariants

This document sets mandatory guidelines and constraints for AI coding agents and human contributors working on the **GDG Ghardaia Discord Bot**.

---

## 🚨 Non-Negotiable Core Invariants

All future feature implementation and refactoring must adhere strictly to these eight core rules:

### 1. Reuse Existing Components
- Always import and reuse UI components from [`src/ui/index.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/index.js) (`createPrimaryButton`, `createBackButton`, `createStandardEmbed`, `createPaginationActionRow`, etc.).
- Never construct raw Discord components manually when a reusable equivalent exists.

### 2. Never Duplicate Common UI Components Unnecessarily
- Do not build custom button variants, navigation bars, or pagination systems inside individual feature directories.
- If a new generic UI pattern is needed, propose and add it to [`src/ui/components/`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/components/) rather than duplicating code across features.

### 3. Never Hardcode Colors Inside Feature Code
- Always import color tokens from [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js) (`GOOGLE_COLORS`, `STATUS_COLORS`).
- General bot UI must exclusively use the official Google Brand Colors (`Blue`, `Red`, `Yellow`, `Green`, `Dark`).

### 4. Never Guess, Modify, or Invent Department Colors
- GDG Ghardaia departments/teams have their own official colors provided by the project owner from an official brand reference.
- Department/squad colors reside exclusively in [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js).
- Never approximate, modify, or invent colors for teams. Use `getTeamColor(teamKey)` to retrieve official colors.
- Team colors may only be used when displaying information specifically related to that department or team.

### 5. Prefer Buttons, Select Menus, and Modals Over New Slash Commands
- Adhere to the project philosophy: *"Commands are for bootstrapping. UI is for everything else."*
- Maintain a single entry point (`/bot`) or minimal administrative commands.
- All user workflows, navigation, submissions, and inspections must happen via Discord interactive components.

### 6. Keep UI and Business Logic Decoupled
- Follow the clean layered architecture:
  $$\text{Feature/Service} \longrightarrow \text{Data Store} \longrightarrow \text{UI Component} \longrightarrow \text{Discord Interaction}$$
- Handlers in `events/` or `commands/` must never contain raw database queries combined with inline Discord embed building. Separate data retrieval, business logic, and UI payload generation into discrete modules.

### 7. Follow Documented Navigation & Custom ID Conventions
- Navigation must follow the standard flow:
  $$\text{Dashboard} \longrightarrow \text{Section} \longrightarrow \text{Details} \longrightarrow \text{Action} \longrightarrow \text{Confirmation} \longrightarrow \text{Result}$$
- Always provide standard navigation controls: `[ ⬅️ Back ]`, `[ 🏠 Home ]`, and `[ ✕ Close ]` via `createNavigationRow()`.
- Custom IDs must follow the format:
  `bot:<namespace>:<action>[:<param1>[:<param2>...]]`
- Build and parse custom IDs with `buildCustomId()` and `parseCustomId()` from [`src/config/customIds.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/customIds.js).

### 8. Avoid Implementing Future-Phase Features Without Explicit Approval
- Strictly implement the task at hand.
- Do not build ahead into Phase 1, Phase 2, or speculative features (e.g. member tracking, Todoist sync, Google Calendar sync, AI assistants) until explicitly instructed and planned with the user.

---

## 📦 Reference Directories

- Design Tokens & Config: [`src/config/`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/)
- Centralized Messages: [`src/messages/`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/messages/)
- Reusable UI Components: [`src/ui/`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/)
- UI Documentation & Blueprint: [`docs/DISCORD_UI.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/docs/DISCORD_UI.md)
