import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

// Prioritize IPv4 to avoid gateway connection hangs on Docker/Pterodactyl hosting (e.g. Wispbyte)
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;

if (!token || token === 'your_bot_token_here') {
  console.error('❌ [CONFIG ERROR] DISCORD_TOKEN is missing or not configured in .env!');
  console.error('👉 Please copy .env.example to .env and set your DISCORD_TOKEN.');
  process.exit(1);
}

// Initialize Discord Client with standard Gateway Intents + MessageContent for chat history extraction
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Command Collection
client.commands = new Collection();

// Load Commands dynamically from src/commands/
const foldersPath = path.join(__dirname, 'commands');

if (fs.existsSync(foldersPath)) {
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(pathToFileURL(filePath).href);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[COMMAND] Loaded /${command.data.name}`);
      } else {
        console.warn(`⚠️ [WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
      }
    }
  }
}

// Load Events dynamically from src/events/
const eventsPath = path.join(__dirname, 'events');

if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = await import(pathToFileURL(filePath).href);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`[EVENT] Registered event: ${event.name}`);
  }
}

// Global safety error handlers
process.on('unhandledRejection', (error) => {
  console.error('💥 [UNHANDLED REJECTION]', error);
});

process.on('uncaughtException', (error) => {
  console.error('💥 [UNCAUGHT EXCEPTION]', error);
});

// Login to Discord
console.log('📡 [GATEWAY] Connecting to Discord Gateway...');
try {
  await client.login(token);
} catch (error) {
  if (error?.message?.toLowerCase().includes('disallowed intents') || error?.code === 'DisallowedIntents') {
    console.error('\n' + '='.repeat(80));
    console.error('❌ [DISCORD INTENTS ERROR] "Message Content Intent" is disabled in Discord Developer Portal!');
    console.error('👉 Discord blanks out all chat messages (content: "") unless this intent is enabled.');
    console.error('👉 To export full chat messages, please enable the toggle (takes 10 seconds):');
    console.error('   1. Open: https://discord.com/developers/applications');
    console.error('   2. Select your Bot Application');
    console.error('   3. In the left sidebar, click "Bot"');
    console.error('   4. Scroll down to "Privileged Gateway Intents"');
    console.error('   5. Toggle ON: [✔] MESSAGE CONTENT INTENT');
    console.error('   6. Click "Save Changes" at the bottom');
    console.error('   7. Run: pnpm dev');
    console.error('='.repeat(80) + '\n');
  } else {
    console.error('❌ [LOGIN ERROR] Failed to connect to Discord:', error);
  }
  process.exit(1);
}
