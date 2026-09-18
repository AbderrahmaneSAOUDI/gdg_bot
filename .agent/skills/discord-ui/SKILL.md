---
name: discord-ui
description: >-
  Procedures for building and composing Discord UI components, embeds, menus, modals,
  pagination, and navigation using the project's centralized UI library.
---

# Discord UI Skill

This skill explains how to build interactive Discord interfaces using the project's centralized component architecture.

---

## 1. Component Assembly Workflow

1. **Import from UI Hub**:
   Always import from [`src/ui/index.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/index.js):
   ```javascript
   import {
     createPrimaryButton,
     createSecondaryButton,
     createStandardEmbed,
     createNavigationRow,
     createActionRows,
     buildCustomId
   } from '../ui/index.js';
   ```

2. **Colors & Brand Integrity**:
   - Use Google colors for general embeds and buttons (`src/config/colors.js`).
   - Use `getTeamColor(teamKey)` or `getRoleColor(roleName)` from `src/config/teams.js` when displaying department-specific data.
   - Never hardcode `#HEX` strings in feature files.

3. **Action Rows & Button Limits**:
   - Discord permits a maximum of 5 buttons per Action Row.
   - Always pass button arrays to `createActionRows(buttons)` which automatically partitions them into rows of 5.

4. **Navigation Row**:
   - For subviews and detail screens, append standard navigation via `createNavigationRow({ backCustomId, homeCustomId, includeClose: true })`.

5. **Custom IDs**:
   - Use `buildCustomId('namespace', 'action', ...params)`.
   - Never assemble unvalidated custom ID strings manually.
