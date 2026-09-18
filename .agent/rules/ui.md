# Discord UI Design System Rules

## Core Paradigm: Interactive UI-First

*"Commands are for bootstrapping. UI is for everything else."*
- Slash commands are strictly entry points (e.g. `/bot`, `/bot deploy_channel`).
- All end-user workflows, role selection, team browsing, modal forms, and pagination must be handled via interactive Discord components.

---

## 🎨 Color Rules

### 1. General Bot UI
- Exclusively uses official **Google Brand Colors**:
  - `BLUE`: `#4285F4` (`0x4285F4`)
  - `RED`: `#EA4335` (`0xEA4335`)
  - `YELLOW`: `#FFD427` (`0xFFD427`)
  - `GREEN`: `#34A853` (`0x34A853`)
  - `DARK`: `#1E1E1E` (`0x1E1E1E`)
  - `LIGHT_GREY`: `#F0F0F0` (`0xF0F0F0`)
- Never hardcode arbitrary hex values. Always import from [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js).

### 2. Department & Team Colors
- GDG Ghardaia squads have official brand colors from leadership:
  - **Relations**: Yellow (`#FFD427` / `0xFFD427`)
  - **Logistics**: Brown (`#795548` / `0x795548`)
  - **Media**: Blue (`#4285F4` / `0x4285F4`)
  - **Design**: Green (`#34A853` / `0x34A853`)
  - **Development**: Purple (`#A142F4` / `0xA142F4`)
  - **Members without department**: Grey (`#5F6368` / `0x5F6368`)
  - **Alumni**: Grey (`#5F6368` / `0x5F6368`)
  - **Bots & Apps**: Discord Black (`#000001` / `0x000001` to prevent transparent rendering)
- Never approximate, invent, or modify team colors. Always resolve via `getTeamColor(teamKey)` or `getRoleColor(roleName)` from [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js).

---

## 🧩 Reusable Component Library

Never construct raw Discord objects manually in feature code. Always import from [`src/ui/index.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/index.js):

1. **Buttons**: `createPrimaryButton`, `createSecondaryButton`, `createDangerButton`, `createSuccessButton`, `createLinkButton`.
2. **Embed Archetypes**: `createStandardEmbed`, `createAlertEmbed`, `createTeamEmbed`, `createDashboardEmbed`, `createPaginatedPayload`.
3. **Select Menus**: `createStringSelectMenu`, `createRoleSelectMenu`, `createUserSelectMenu`, `createTeamSelectMenu`.
4. **Action Rows**: `createActionRows` (automatically chunks buttons into rows of max 5), `createNavigationRow` (`[ ⬅️ Back ]`, `[ 🏠 Home ]`, `[ ✕ Close ]`).
5. **Modals**: `createModal`, `createShortTextInput`, `createParagraphTextInput`, `createUrlInput`, `createDateInput`.

---

## 🧭 Navigation & Custom ID Schema

1. **Flow Hierarchy**:
   $$\text{Dashboard} \longrightarrow \text{Section} \longrightarrow \text{Details} \longrightarrow \text{Action} \longrightarrow \text{Confirmation} \longrightarrow \text{Result}$$
2. **Custom ID Standard**:
   `bot:<namespace>:<action>[:<param1>[:<param2>...]]`
   - Build with `buildCustomId(namespace, action, ...params)`.
   - Parse with `parseCustomId(customId)`.
   - Max 100 characters (Discord limit enforced).
