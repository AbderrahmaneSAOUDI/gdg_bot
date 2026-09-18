# 🎨 GDG Ghardaia Discord Bot — UI & Component System Specification

This document defines the visual identity, reusable component architecture, token systems, and interaction conventions for the **GDG Ghardaia Discord Bot**.

> *"Commands are for bootstrapping. UI is for everything else."*

---

## 1. Design Principles & Aesthetic Invariants

1. **Google & GDG Visual Heritage**: The bot belongs to Google Developer Groups (GDG) Ghardaia. The general UI exclusively uses official Google brand color tokens and clean, modern styling.
2. **UI-First Interaction**: Minimize slash commands to the bare minimum (`/bot`). Every user flow operates through interactive buttons, select menus, and modals.
3. **Clean & Ephemeral**: Default member interactions must be ephemeral (`MessageFlags.Ephemeral`) to preserve channel cleanlines. Only persistent dashboards in dedicated channels (`#team-hub`) are public.
4. **Predictable Navigation**: Users must never feel trapped or forced to re-type slash commands. Every view provides standard `[Back]`, `[Home]`, or `[Close]` navigation buttons.
5. **Decoupled Architecture**: Discord UI construction is strictly decoupled from business logic and database persistence:
   $$\text{Feature/Service} \longrightarrow \text{Data} \longrightarrow \text{UI Component} \longrightarrow \text{Discord Interaction}$$
6. **Humane Feedback**: Never expose stack traces, database schema errors, or raw exceptions to members. Surface concise, friendly error explanations and log technical details internally.

---

## 2. Color Systems

All color definitions reside centrally in [`src/config/colors.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/colors.js) and [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js). **Never hardcode hex values or integers in feature code.**

### 2.1 Google Brand Palette (General Bot UI)

General informational screens, navigation controls, and general embeds must strictly use the Google brand palette:

| Token | Hex Number | Hex String | Purpose |
|---|---|---|---|
| `GOOGLE_COLORS.BLUE` | `0x4285F4` | `#4285F4` | Primary brand color, general info, Media Department |
| `GOOGLE_COLORS.RED` | `0xEA4335` | `#EA4335` | Core Executive leadership, destructive actions, errors |
| `GOOGLE_COLORS.YELLOW` | `0xFFD427` | `#FFD427` | Relations Department, warnings, meeting syncs |
| `GOOGLE_COLORS.GREEN` | `0x34A853` | `#34A853` | Design Department, success states, team directory |
| `GOOGLE_COLORS.PURPLE` | `0xA142F4` | `#A142F4` | Dev Department |
| `GOOGLE_COLORS.BROWN` | `0xA84300` | `#A84300` | Logistics Department |
| `GOOGLE_COLORS.DARK` | `0x1E1E1E` | `#1E1E1E` | System settings, bot diagnostics, dark UI backgrounds |
| `GOOGLE_COLORS.GREY` | `0x5F6368` | `#5F6368` | Members, Alumni, empty states |
| `GOOGLE_COLORS.BOT_BLACK` | `0x000001` | `#000001` | Discord bots, applications, and system integrators |

### 2.2 Semantic Status Colors

| Semantic Token | Underlying Color | Usage |
|---|---|---|
| `STATUS_COLORS.SUCCESS` | `GOOGLE_COLORS.GREEN` (`0x34A853`) | Operation completed successfully |
| `STATUS_COLORS.ERROR` / `DANGER` | `GOOGLE_COLORS.RED` (`0xEA4335`) | Failures, permission denied, destructive prompts |
| `STATUS_COLORS.WARNING` | `GOOGLE_COLORS.YELLOW` (`0xFFD427`) | Confirmations, timeouts, alerts |
| `STATUS_COLORS.INFO` | `GOOGLE_COLORS.BLUE` (`0x4285F4`) | Informational notifications, loading screens |

### 2.3 Unified Club Structure & Canonical Sort Order (`src/config/teams.js`)

GDG Ghardaia operates with a unified Core Team containing President (Chapter Lead), Vice President (Strategic Co-Lead), SG, HR, and all department co-managers. The structure strictly follows this canonical order:

| # | Role / Department | Color | Hex Code | Scope / Notes |
|---|---|---|---|---|
| 1 | **President** | Red | `#EA4335` | Chapter Lead & Community President |
| 2 | **Vice President** | Red | `#EA4335` | Community Vice President & Strategic Co-Lead |
| 3 | **SG** | Red | `#EA4335` | Secretary General — records & documentation |
| 4 | **HR** | Red | `#EA4335` | Human Resources & Member Experience |
| 5 | **Relations** | Yellow | `#FFD427` | Relations Department Co-Manager & squad members |
| 6 | **Logistics** | Brown | `#A84300` | Logistics Department Co-Manager & squad members |
| 7 | **Media** | Blue | `#4285F4` | Media Department Co-Manager & squad members |
| 8 | **Design** | Green | `#34A853` | Design Department Co-Manager & squad members |
| 9 | **Dev** | Purple | `#A142F4` | Dev Department Co-Manager & squad members |
| — | **Member** | Grey | `#5F6368` | General members without department |
| — | **Alumni** | Grey | `#5F6368` | Former organizing team members |
| — | **Bot** | Black | `#000001` | All bots and automated apps |

> [!CAUTION]
> **STRICT PRESERVATION RULE**: Do NOT guess, modify, approximate, or replace team colors. The project owner provides the exact team names and hex colors. Update only in [`src/config/teams.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/teams.js).

```javascript
import { getTeam, getTeamColor, getRoleColor } from '../config/teams.js';

// Retrieve department configuration and embed color integer
const devDept = getTeam('DEVELOPMENT');
const devColor = getTeamColor('DEVELOPMENT'); // 0xA142F4

// Retrieve role hex color
const presidentColor = getRoleColor('President'); // '#EA4335'
```

---

## 3. Component Architecture & Catalog

All reusable UI components reside under [`src/ui/`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/) and are exported via [`src/ui/index.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/ui/index.js).

### 3.1 Button Variants & Common Actions (`src/ui/components/buttons.js`)

#### Core Style Variants
- `createPrimaryButton({ customId, label, emoji, disabled })` (Discord Blurple/Primary)
- `createSecondaryButton({ customId, label, emoji, disabled })` (Discord Grey/Secondary)
- `createSuccessButton({ customId, label, emoji, disabled })` (Discord Green/Success)
- `createDangerButton({ customId, label, emoji, disabled })` (Discord Red/Danger)
- `createLinkButton({ url, label, emoji, disabled })` (URL Link Button)

#### Reusable Common Actions
Standardized buttons pre-configured with centralized labels and emojis:

| Function | Default Label | Default Emoji | Style | Custom ID |
|---|---|---|---|---|
| `createBackButton()` | Back | ⬅️ | Secondary | `bot:nav:back` |
| `createHomeButton()` | Home | 🏠 | Secondary | `bot:nav:home` |
| `createCloseButton()` | Close | ✕ | Secondary | `bot:nav:close` |
| `createCancelButton()` | Cancel | 🚫 | Secondary | `bot:confirm:no` |
| `createConfirmButton({ isDestructive })` | Confirm | ✅ | Success / Danger | `bot:confirm:yes` |
| `createSaveButton()` | Save | 💾 | Success | Feature-specific |
| `createEditButton()` | Edit | ✏️ | Primary | Feature-specific |
| `createDeleteButton()` | Delete | 🗑️ | Danger | Feature-specific |
| `createCreateButton()` | Create | ➕ | Success | Feature-specific |
| `createRefreshButton()`| Refresh | 🔄 | Secondary | `bot:nav:refresh` |
| `createNextButton()` | Next | ▶️ | Secondary | `bot:page:next` |
| `createPreviousButton()`| Previous | ◀️ | Secondary | `bot:page:prev` |
| `createViewButton()` | View | 👁️ | Primary | Feature-specific |
| `createOpenButton()` | Open | 📂 | Primary | Feature-specific |

### 3.2 Select Menus (`src/ui/components/selectMenus.js`)

- `createOptionSelectMenu({ customId, placeholder, options, minValues, maxValues, disabled })`: Generic String Select Menu.
- `createMemberSelectMenu({ customId, placeholder, minValues, maxValues, disabled })`: Native Discord user/member picker (`ComponentType.UserSelect`).
- `createRoleSelectMenu({ customId, placeholder, minValues, maxValues, disabled })`: Native Discord role picker (`ComponentType.RoleSelect`).
- `createTeamSelectMenu({ customId, placeholder, disabled })`: Pre-populated with GDG squads from `src/config/teams.js`.
- `createActivitySelectMenu({ customId, placeholder, activities, disabled })`: For choosing workshops or hackathon events.
- `createCategorySelectMenu({ customId, placeholder, categories, disabled })`: For filtering resources and documents.

### 3.3 Modals & Form Inputs (`src/ui/components/modals.js`)

Modals automatically wrap each text input into its own `ActionRowBuilder` to satisfy Discord API invariants:

```javascript
import {
  createModal,
  createShortTextInput,
  createLongTextInput,
  createUrlInput,
  createDateInput,
  createTimeInput,
  createNumberInput,
} from '../ui/index.js';

const modal = createModal({
  customId: 'bot:modal:proposal',
  title: 'Workshop Proposal',
  inputs: [
    createShortTextInput({ customId: 'topic', label: 'Workshop Title', placeholder: 'e.g. Intro to Flutter' }),
    createDateInput({ customId: 'target_date' }),
    createTimeInput({ customId: 'target_time' }),
    createLongTextInput({ customId: 'outline', label: 'Outline & Agenda' }),
  ],
});
```

### 3.4 ActionRow Auto-Chunking (`src/ui/components/actionRows.js`)

Discord restricts messages to a maximum of 5 buttons per `ActionRowBuilder`, and requires Select Menus to occupy their own individual row.
`createActionRows(...components)` automatically chunks arrays of buttons into compliant rows of at most 5 buttons each and isolates select menus:

```javascript
import { createActionRows, createPrimaryButton } from '../ui/index.js';

// Automatically chunks 7 buttons into Row 1 (5 buttons) and Row 2 (2 buttons)
const rows = createActionRows(...sevenButtons);
```

---

## 4. Embed Archetypes (`src/ui/embeds/embedBuilder.js`)

All embeds include standard timestamps and the canonical `GDG Ghardaia` footer.

| Archetype | Factory | Primary Color | Typical Use |
|---|---|---|---|
| **Standard** | `createStandardEmbed()` | `GOOGLE_COLORS.BLUE` | Hub dashboards, informational screens |
| **Profile** | `createProfileEmbed()` | `GOOGLE_COLORS.BLUE` | Member cards, roles, server join date, avatar |
| **List** | `createListEmbed()` | `GOOGLE_COLORS.BLUE` / Team | Item collections, directory overviews |
| **Detail** | `createDetailEmbed()` | `GOOGLE_COLORS.BLUE` / Team | Single entity inspection with structured fields |
| **Success** | `createSuccessEmbed()` | `STATUS_COLORS.SUCCESS` | Completed tasks, saved updates, approvals |
| **Warning** | `createWarningEmbed()` | `STATUS_COLORS.WARNING` | Confirmations, timeouts, rate limit cautions |
| **Error** | `createErrorEmbed()` | `STATUS_COLORS.ERROR` | Permission denied, not found, failed operations |
| **Empty** | `createEmptyEmbed()` | `GOOGLE_COLORS.GREY` | Sections without data yet ("Nothing to show here yet") |
| **Loading** | `createLoadingEmbed()` | `GOOGLE_COLORS.BLUE` | Asynchronous operations in progress |

---

## 5. Navigation Pattern & Breadcrumbs

### 5.1 The Interaction Lifecycle

```text
Dashboard (/bot)
   ↓
Section (e.g. My Team)
   ↓
Details (e.g. Tech Squad)
   ↓
Action (e.g. Propose Workshop)
   ↓
Confirmation (e.g. Confirm Submission)
   ↓
Result (Success / Error)
```

### 5.2 Standard Navigation Bar (`src/ui/navigation/navigation.js`)

Every sub-view must provide predictable return controls using `createNavigationRow()`:

```javascript
import { createNavigationRow, createPrimaryButton } from '../ui/index.js';

const navRow = createNavigationRow({
  backCustomId: 'bot:team:list',
  homeCustomId: 'bot:nav:home',
  closeCustomId: 'bot:nav:close',
  extraButtons: [
    createPrimaryButton({ customId: 'bot:team:join', label: 'Join Squad' }),
  ],
});
```

Yields: `[ ⬅️ Back ] [ 🏠 Home ] [ ✕ Close ] [ Join Squad ]`

---

## 6. Pagination System (`src/ui/components/pagination.js`)

For datasets that exceed a single embed or list view:

```javascript
import { createPaginatedPayload, createListEmbed } from '../ui/index.js';

const payload = createPaginatedPayload({
  items: memberList,
  page: 1,
  pageSize: 5,
  customIdPrefix: 'bot:page:members',
  renderEmbed: ({ pageItems, page, totalPages }) =>
    createListEmbed({
      title: 'Active Community Members',
      items: pageItems,
      page,
      totalPages,
    }),
});
```

---

## 7. Confirmation System (`src/ui/components/confirmation.js`)

**Destructive actions (deletion, cancellation, role removal) must never be executed immediately without confirmation.**

```javascript
import { createConfirmationPayload } from '../ui/index.js';

const payload = createConfirmationPayload({
  title: 'Confirm Squad Departure',
  description: 'Are you sure you want to step down from the Design Squad?',
  confirmCustomId: 'bot:team:leave_confirm:design',
  cancelCustomId: 'bot:team:view:design',
  isDestructive: true,
  confirmLabel: 'Leave Squad',
  cancelLabel: 'Stay in Squad',
});
```

---

## 8. Custom ID Naming Convention

Custom IDs follow a strict namespaced pattern:

```text
bot:<namespace>:<action>[:<param1>[:<param2>...]]
```

### Namespaces:
- `nav`: Navigation controls (`bot:nav:back`, `bot:nav:home`, `bot:nav:close`)
- `confirm`: Confirmation dialogs (`bot:confirm:yes:123`, `bot:confirm:no:123`)
- `page`: Pagination navigation (`bot:page:team:next:2`)
- `team`: Department/Squad operations (`bot:team:view:tech`)
- `meeting`: Meeting syncs (`bot:meeting:view:weekly_core`)
- `modal`: Modal submissions (`bot:modal:submit_proposal`)

Use `buildCustomId(namespace, action, ...params)` and `parseCustomId(customId)` from [`src/config/customIds.js`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/config/customIds.js) to build and parse IDs safely.

---

## 9. Centralized User-Facing Messages

All strings presented to users reside in [`src/messages/`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/src/messages/):

- `COMMON_MESSAGES`: Loading, Empty, Unavailable, Action Success.
- `ERROR_MESSAGES`: Permission Denied, Admin Required, Not Configured, Not Found, Invalid Input, Operation Failed, Unexpected Error.
- `CONFIRMATION_MESSAGES`: Destructive warnings, Discard changes.
- `DASHBOARD_MESSAGES`: Hub titles, welcome copy, squad descriptions.

---

## 10. Complete Composition Example

Here is an example demonstrating correct composition of embeds, select menus, action rows, and navigation:

```javascript
import {
  createDetailEmbed,
  createTeamSelectMenu,
  createNavigationRow,
  createActionRows,
  createPrimaryButton,
  getTeam,
} from '../ui/index.js';

export function getSquadOverviewPayload(squadKey) {
  const squad = getTeam(squadKey);

  const embed = createDetailEmbed({
    title: `Squad: ${squad.name}`,
    description: squad.description,
    teamKey: squadKey,
    fields: [
      { name: '🎯 Focus Area', value: 'Community Workshops & Hands-on Labs', inline: true },
      { name: '👥 Member Count', value: '14 Active Contributors', inline: true },
    ],
  });

  const selectMenu = createTeamSelectMenu({
    customId: 'bot:team:select',
    placeholder: 'Switch department / squad...',
  });

  const navRow = createNavigationRow({
    backCustomId: 'bot:team:list',
    homeCustomId: 'bot:nav:home',
    extraButtons: [
      createPrimaryButton({ customId: `bot:team:join:${squadKey}`, label: 'Request to Join' }),
    ],
  });

  return {
    embeds: [embed],
    components: [...createActionRows(selectMenu), navRow],
  };
}
```
