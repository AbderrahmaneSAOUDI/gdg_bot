# 🤖 GDG Ghardaia Discord Bot

Official Discord Bot for the **Google Developer Groups (GDG) Ghardaia** community, built with [Node.js](https://nodejs.org/) (ES Modules) and [discord.js v14](https://discord.js.org/).

---

## ✨ Features

- **Modular Slash Commands**: Organized commands with dynamic loading (`src/commands/`).
- **Clean Event Architecture**: Event listeners decoupled into dedicated modules (`src/events/`).
- **Modern ES Modules (`"type": "module"`)**: Native ESM running smoothly on modern Node.js versions.
- **Hot Reload Development**: Native Node watcher support (`node --watch`) via `npm run dev`.
- **Fast Command Deployment**: Dedicated script to deploy slash commands to a test guild or globally.
- **Safe Secrets Handling**: Preconfigured `.env` and `.env.example` templates to prevent credential leaks.

---

## 📁 Project Structure

```
gdg_bot/
├── .env.example             # Environment variables template
├── .gitignore               # Git ignored patterns
├── LICENSE                  # MIT License
├── package.json             # Project dependencies & scripts
├── README.md                # Documentation & setup guide
└── src/
    ├── index.js             # Bot entry point & loader
    ├── deploy-commands.js   # Script to register slash commands to Discord
    ├── commands/            # Slash command definitions
    │   └── utility/
    │       ├── ping.js      # /ping (Round-trip & WS latency)
    │       └── info.js      # /info (GDG Ghardaia community details)
    └── events/              # Discord gateway event handlers
        ├── clientReady.js   # Bot ready & presence setter
        └── interactionCreate.js # Slash command router & error handler
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ or v22 LTS recommended)
- **npm**: v9+ or higher

### 2. Installation

Clone this repository and install the dependencies:

```bash
git clone https://github.com/AbderrahmaneSAOUDI/gdg_bot.git
cd gdg_bot
npm install
```

---

### 3. Create a Discord Application & Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it (e.g. `GDG Ghardaia Bot`).
3. Navigate to the **Bot** tab on the left:
   - Click **Reset Token** to generate a new bot token and copy it.
   - Under **Privileged Gateway Intents**, enable **Message Content Intent** if needed for future message prefix commands (not required for standard slash commands).
4. Navigate to **OAuth2** -> **URL Generator**:
   - In **Scopes**, check:
     - `bot`
     - `applications.commands`
   - In **Bot Permissions**, select permissions needed (e.g. `Send Messages`, `Embed Links`, `Read Message History`, `Use External Emojis`).
   - Copy the generated URL and open it in your browser to invite the bot to your Discord server.

---

### 4. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and populate your credentials:

```env
# Discord Bot Token
DISCORD_TOKEN=your_bot_token_here

# Application (Client) ID
CLIENT_ID=your_client_id_here

# (Optional) Test Guild ID for instant command propagation during development
GUILD_ID=your_guild_id_here
```

> **Tip:** Setting `GUILD_ID` during development registers slash commands immediately to your test server. Global deployment (leaving `GUILD_ID` blank) can take up to 1 hour to propagate across Discord.

---

### 5. Deploy Slash Commands

Register slash commands (`/ping`, `/info`) with Discord's REST API:

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

## 🛠️ Adding New Commands & Events

### Adding a New Slash Command
1. Create a new `.js` file inside `src/commands/<category>/` (e.g. `src/commands/community/event.js`).
2. Export `data` (using `SlashCommandBuilder`) and an async `execute(interaction)` function:

```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('myevent')
  .setDescription('Shows upcoming GDG Ghardaia events');

export async function execute(interaction) {
  await interaction.reply('Upcoming event: DevFest Ghardaia!');
}
```
3. Run `npm run deploy` to register the new command.

### Adding a New Gateway Event
1. Create a new `.js` file inside `src/events/` (e.g. `src/events/guildMemberAdd.js`).
2. Export `name`, `once` (boolean), and an `execute(...)` function:

```javascript
import { Events } from 'discord.js';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member) {
  console.log(`Welcome to GDG Ghardaia, ${member.user.tag}!`);
}
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).