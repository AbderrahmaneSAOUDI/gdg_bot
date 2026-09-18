import { Events, ActivityType } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client) {
  console.log(`[READY] Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [
      {
        name: 'GDG Ghardaia Community',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
}
