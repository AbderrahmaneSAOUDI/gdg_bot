# 🤖 GDG Ghardaia Discord Bot

Official Discord Bot for the **Google Developer Groups (GDG) Ghardaia** community, engineered with [Node.js](https://nodejs.org/) (ES Modules) and [discord.js v14](https://discord.js.org/).

> *"Commands are for bootstrapping. UI is for everything else."*

---

## ✨ Key Features & Capabilities

- **Single Entry Point (`/bot`)**: Clean slash command opening an ephemeral interactive dashboard.
- **UI-First Philosophy**: Replace cumbersome slash command memorization with tactile buttons, select menus, and modals.
- **Persistent Channel Dashboard Anchor**: Deploy a permanent interactive hub message in dedicated channels (e.g., `#team-hub`) so members never need to type slash commands.
- **Privacy & Clutter-Free**: Personal interactions run in ephemeral private sessions without cluttering public discussion channels.
- **Google Brand Palette**: Built using official Google Developer Groups color tokens (`Blue`, `Red`, `Yellow`, `Green`, `Dark Slate`).
- **Tactile Multi-View Navigation**: Seamlessly navigate across Squads, Meetings, Activities, Knowledge Base, Logistics Requests, and Member Profiles with standard return breadcrumbs.
- **Modern ES Modules (`"type": "module"`)**: High-performance native ESM running smoothly on modern Node.js runtimes.

---

## 📚 Complete Project Documentation (`docs/`)

Explore our comprehensive engineering and product specifications:

| Document | Purpose |
|---|---|
| [🤖 AGENTS.md](AGENTS.md) | Guidelines, invariants, and coding standards for AI coding assistants and developers. |
| [🌐 VISION.md](docs/VISION.md) | Mission statement, community personas, and the UI-First Manifesto. |
| [📋 REQUIREMENTS.md](docs/REQUIREMENTS.md) | Complete functional (FR) and non-functional (NFR) requirements specification. |
| [🏗️ ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, component decomposition, and interaction lifecycles. |
| [🗄️ DATA_MODEL.md](docs/DATA_MODEL.md) | Entity relationship diagram (ERD), collection schemas, and Firestore specifications. |
| [🎨 DISCORD_UI.md](docs/DISCORD_UI.md) | Discord UI design system, Google brand color tokens, and screen blueprints. |
| [🔐 PERMISSIONS.md](docs/PERMISSIONS.md) | Discord permissions matrix, OAuth2 scopes, and 5-tier role-based access control (RBAC). |
| [🔄 WORKFLOWS.md](docs/WORKFLOWS.md) | Sequence diagrams for hub navigation, persistent deployment, and request lifecycles. |
| [🗺️ ROADMAP.md](docs/ROADMAP.md) | Phased development milestones from core bootstrap to cloud and Google Calendar sync. |

---

## 📁 Project Directory Layout

```
gdg_bot/
├── .env                     # Local environment secrets (ignored by git)
├── .env.example             # Documented environment variable template
├── .gitignore               # Git ignored patterns
├── AGENTS.md                # AI Agent guidelines & engineering standards
├── LICENSE                  # MIT License
├── package.json             # ES Module manifest, dependencies & scripts
├── README.md                # Project overview & developer guide
├── docs/                    # Architectural and product specifications
│   ├── VISION.md            # Mission, philosophy & community personas
│   ├── REQUIREMENTS.md      # Functional & non-functional requirements
│   ├── ARCHITECTURE.md      # System architecture & component flows
│   ├── DATA_MODEL.md        # Firestore schemas & entity relationships
│   ├── DISCORD_UI.md        # Design tokens, color palette & screen blueprints
│   ├── PERMISSIONS.md       # Discord RBAC matrix & permissions
│   ├── WORKFLOWS.md         # Detailed workflows & sequence diagrams
│   └── ROADMAP.md           # Phased milestones & feature trajectory
└── src/
    ├── index.js             # Bot entry point & dynamic component loaders
    ├── deploy-commands.js   # REST script to deploy slash commands to Discord
    ├── commands/            # Slash command definitions
    │   └── general/
    │       └── bot.js       # /bot (Single entry point & hub launcher)
    ├── events/              # Discord gateway event handlers
    │   ├── clientReady.js   # Ready handler, presence & startup greeting
    │   └── interactionCreate.js # Command & button interaction dispatcher
    └── ui/                  # UI view builders, embeds & action rows
        └── hub.js           # Team Hub views & Google brand color tokens
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ or v22 LTS recommended)
- **npm**: v9+ or higher

### 2. Installation

Clone this repository and install dependencies:

```bash
git clone https://github.com/AbderrahmaneSAOUDI/gdg_bot.git
cd gdg_bot
npm install
```

---

### 3. Create a Discord Application & Bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it (e.g. `GDG Ghardaia Bot`).
3. Navigate to the **Bot** tab on the left:
   - Click **Reset Token** to generate a new bot token and copy it.
4. Navigate to **OAuth2** -> **URL Generator**:
   - In **Scopes**, check:
     - `bot`
     - `applications.commands`
   - In **Bot Permissions**, select permissions needed:
     - `View Channels`
     - `Send Messages`
     - `Embed Links`
     - `Read Message History`
     - `Use External Emojis`
   - Copy the generated URL and open it in your browser to invite the bot to your Discord server.

---

### 4. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Populate `.env` with your credentials:

```env
# Discord Bot Token
DISCORD_TOKEN=your_bot_token_here

# Application (Client) ID
CLIENT_ID=your_client_id_here

# (Optional) Test Guild ID for instant command propagation during development
GUILD_ID=your_guild_id_here

# (Optional) Channel ID for startup greeting
STARTUP_CHANNEL_ID=
```

> **Tip:** Setting `GUILD_ID` during development registers slash commands instantly to your test server. Global deployment (leaving `GUILD_ID` blank) can take up to 1 hour to propagate across Discord.

---

### 5. Deploy Slash Commands

Register the `/bot` command with Discord's REST API:

```bash
npm run deploy
```

---

### 6. Run the Bot

**Development Mode (auto-reloads on file changes):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

---

## 🛠️ Operational Commands

### Launch Ephemeral Team Hub
```
/bot
```
Opens your private interactive session with full navigation access to all squads, meetings, activities, knowledge, requests, and your profile.

### Deploy Persistent Channel Hub Anchor (Admins only)
```
/bot deploy_channel:#team-hub
```
Posts a permanent public message with interactive launch buttons into the specified channel.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).