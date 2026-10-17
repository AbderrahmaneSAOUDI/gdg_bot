# 🔐 GDG Ghardaia — Club Structure & Permissions Matrix

This document defines the official club structure, role hierarchy, and color assignments for the **Google Developer Groups (GDG) Ghardaia** Discord server.

---

## 1. Club Organizational Structure & Color Codes

### 1.1 Core Team (Unified)

The Core Team contains all 9 leadership roles (President, Vice President, SG, HR, and all department co-managers) without artificial separation.
**Canonical Sort Order:**

| # | Role | Color | Hex Code | Discord Int | Description |
|---|---|---|---|---|---|
| 1 | **President** | Red | `#EA4335` | `0xEA4335` | Chapter Lead & Community President |
| 2 | **Vice President** | Red | `#EA4335` | `0xEA4335` | Strategic Co-Lead & Operations Vice President |
| 3 | **SG** | Red | `#EA4335` | `0xEA4335` | Secretary General — documentation & official records |
| 4 | **HR** | Red | `#EA4335` | `0xEA4335` | Human Resources & Member Experience |
| 5 | **Relations** | Yellow | `#FFD427` | `0xFFD427` | Relations Department Co-Manager |
| 6 | **Logistics** | Brown | `#A84300` | `0xA84300` | Logistics Department Co-Manager |
| 7 | **Media** | Blue | `#4285F4` | `0x4285F4` | Media Department Co-Manager |
| 8 | **Design** | Green | `#34A853` | `0x34A853` | Design Department Co-Manager |
| 9 | **Dev** | Purple | `#A142F4` | `0xA142F4` | Dev Department Co-Manager |

---

### 1.2 Official Departments

Each department has its official color. **All department members inherit the color of their respective department:**

| # | Department | Official Color | Hex Code | Discord Int | Scope & Responsibilities |
|---|---|---|---|---|---|
| 1 | **Relations Department** | Yellow | `#FFD427` | `0xFFD427` | Speaker outreach, sponsorships, partnerships, external PR |
| 2 | **Logistics Department** | Brown | `#A84300` | `0xA84300` | Venue management, hardware, equipment, catering, on-site setup |
| 3 | **Media Department** | Blue | `#4285F4` | `0x4285F4` | Photography, videography, media production, coverage |
| 4 | **Design Department** | Green | `#34A853` | `0x34A853` | Branding, graphics, UI/UX, slide decks, social creatives |
| 5 | **Dev Department** | Purple | `#A142F4` | `0xA142F4` | Codelabs, workshops, platform tooling, open source code |

---

### 1.3 Other Roles & Status Groups

| Role / Group | Color | Hex Code | Discord Int | Notes |
|---|---|---|---|---|
| **Department Members** | *Department Color* | *Inherited* | *Inherited* | Members belonging to a specific department take their department's color |
| **Member** | Grey | `#5F6368` | `0x5F6368` | Community members without specific department assignment |
| **Alumni** | Grey | `#5F6368` | `0x5F6368` | Former core and organizing team members |
| **Bot** | Discord Black | `#000001` | `0x000001` | Automated bots, webhook integrators, and applications |

> [!NOTE]
> Discord treats `#000000` as transparent/default. Therefore, official Discord bot/app roles use `#000001` (`0x000001`) to render true black.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Permission Level | Roles | Typical Privileges |
|---|---|---|
| **Tier 1: Administrator** | President, Vice President | Server administration, persistent dashboard deployment (`/bot deploy_channel`), bot configuration |
| **Tier 2: Management** | SG, HR, Department Co-Managers (Relations, Logistics, Media, Design, Dev) | Meeting scheduling, task backlog management, logistics approvals |
| **Tier 3: Organizing Team** | Department Members | Squad channel access, resource management, internal documentation |
| **Tier 4: General Community** | Member, Alumni | Interactive ephemeral Team Hub access via `/bot` or channel anchor, workshop participation |
| **Tier 5: System** | Bot | Webhook publishing, bot gateway integration, automated status logging |
