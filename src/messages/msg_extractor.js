/**
 * Centralized Messages for the Server Data Extractor feature.
 */

export const EXTRACTOR_MESSAGES = Object.freeze({
  START_TITLE: 'Extracting Server Data',
  START_DESC: 'Starting full server extraction. Fetching server configuration, roles, categories, and full chat history from creation...',
  PROGRESS_ROLES: 'Reading and mapping server roles and channel permissions...',
  PROGRESS_CHANNELS: (current, total, channelName) =>
    `Extracting channel [${current}/${total}] #${channelName}...`,
  SUCCESS_TITLE: 'Server Data Extracted Successfully',
  SUCCESS_DESC: (stats) =>
    `Successfully extracted complete server data to **\`${stats.outputDir}\`**.\n\n` +
    `• **Roles Exported:** ${stats.totalRoles}\n` +
    `• **Categories:** ${stats.totalCategories}\n` +
    `• **Channels:** ${stats.totalChannels} (${stats.textChannels} text/announcements, ${stats.voiceChannels} voice)\n` +
    `• **Total Messages Exported:** ${stats.totalMessages.toLocaleString()}\n` +
    `• **Export Outputs:** Structured JSON (\`messages.json\`, \`roles.json\`, \`server_info.json\`, permission maps) and readable transcripts (\`transcript.txt\`).`,
  NO_GUILD: 'Server extraction can only be executed inside a Discord guild.',
  UNAUTHORIZED: 'You must have Administrator or Manage Server permissions to extract server data.',
  ERROR: 'An unexpected error occurred during server extraction.',
});
