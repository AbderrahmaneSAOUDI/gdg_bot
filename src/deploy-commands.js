import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ [CONFIG ERROR] Missing DISCORD_TOKEN or CLIENT_ID in environment variables.');
  console.error('👉 Please copy .env.example to .env and configure your credentials.');
  process.exit(1);
}

const commands = [];
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
        commands.push(command.data.toJSON());
      } else {
        console.warn(`⚠️ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
}

const rest = new REST().setToken(token);

try {
  console.log(`🚀 [DEPLOY] Started refreshing ${commands.length} application (/) commands.`);

  let data;
  if (guildId) {
    console.log(`📌 [DEPLOY] Deploying commands to Guild ID: ${guildId} (instant update)`);
    data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
  } else {
    console.log('🌍 [DEPLOY] Deploying commands globally (propagates across all servers within ~1 hour)');
    data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
  }

  console.log(`✅ [DEPLOY] Successfully deployed ${data.length} application (/) commands.`);
} catch (error) {
  console.error('❌ [DEPLOY ERROR] Failed to deploy slash commands:', error);
  process.exit(1);
}
