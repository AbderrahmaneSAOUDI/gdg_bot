import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;

if (!token || token === 'your_bot_token_here') {
  console.error('❌ [CONFIG ERROR] DISCORD_TOKEN is missing or not configured in .env!');
  console.error('👉 Please copy .env.example to .env and set your DISCORD_TOKEN.');
  process.exit(1);
}

// Initialize Discord Client with standard Gateway Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
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
client.login(token);
