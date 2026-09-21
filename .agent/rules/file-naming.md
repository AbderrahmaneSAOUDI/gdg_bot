# File Naming & Prefix Standards

Every agent operating in this repository MUST follow these strict file naming and modularity standards for all current and future implementations.

---

## 1. Standard File Prefixes

All source and test files must use standardized prefixes corresponding to their architectural layer:

| Prefix | Layer / Category | Rules & Target Locations |
|---|---|---|
| `cmd_*` | Slash Commands | Command definitions in `src/commands/<category>/cmd_<name>.js` |
| `evt_*` | Discord Events | Gateway event listeners in `src/events/evt_<eventName>.js` |
| `c_*` | UI Components | Reusable components in `src/ui/components/`, `src/ui/embeds/`, `src/ui/navigation/` |
| `view_*` | Assembled Views | Full screen / interaction payloads in `src/ui/view_<name>.js` |
| `cfg_*` | Config & Tokens | Centralized configurations & tokens in `src/config/cfg_<name>.js` |
| `msg_*` | Message Templates | User-facing copy and message strings in `src/messages/msg_<name>.js` |
| `json_*` | JSON Storage CRUD | Local JSON file read/write/query operations in `src/data/json_<name>.js` |
| `srv_*` | Domain Services | Business logic & feature services in `src/features/srv_<name>.js` |
| `f_*` | Pure Utilities | Standalone helper functions in `src/utils/f_<name>.js` |
| `t_*` | Unit Tests | Automated test suites in `test/t_<target>.test.js` |

---

## 2. Single Responsibility Principle (SRP)

- **One File, One Responsibility**: Each file should handle exactly one task.
- **Modularity over File Count**: Code clarity and simplicity are paramount. Create new files and subdirectories whenever it improves readability and separation of concerns.
- **No Junk Drawers**: Do not bundle disparate utilities together. Group related components in subfolders.

---

## 3. UI Invariant: Components vs. Views

- **Component (`c_*`)**: Any UI element that can be reused more than once (e.g. buttons, select menus, modal fields, pagination controls, embed builders) MUST be placed in `src/ui/components/`, `src/ui/embeds/`, or `src/ui/navigation/` with a `c_` prefix.
- **View (`view_*`)**: Any full screen or screen payload sent to a Discord channel (combining an embed with action rows) is a View, named `view_<screenName>.js`.
- **The Hub (`view_hub.js`)**: The root view representing the `/bot` interactive dashboard.

---

## 4. Barrel Re-Exports (`index.js`)

- Each architectural directory (`src/config/`, `src/messages/`, `src/ui/`, etc.) must maintain an `index.js` file.
- `index.js` re-exports all prefixed modules so consumer files can import cleanly:
  ```javascript
  import { GOOGLE_COLORS, teams } from '../config/index.js';
  import { createPrimaryButton } from '../ui/index.js';
  ```
