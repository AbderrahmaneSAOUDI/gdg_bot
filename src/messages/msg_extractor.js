/**
 * Centralized Messages for the Server Data Extractor feature.
 */

export const EXTRACTOR_MESSAGES = Object.freeze({
  START_TITLE: 'Extracting Server Data',
  START_DESC: 'Reading the current server configuration, roles, categories, and accessible channel histories. This can take several minutes; the result will include a report of incomplete histories.',
  PROGRESS_ROLES: 'Reading and mapping server roles and channel permissions...',
  PROGRESS_CHANNELS: (current, total, channelName) =>
    `Extracting channel [${current}/${total}] #${channelName}...`,
  SUCCESS_TITLE: 'Server Data Extracted Successfully',
  PARTIAL_TITLE: 'Server Data Extracted with Incomplete Histories',
  HISTORY_UNAVAILABLE: '(Message history could not be read. See message_history_status.json.)',
  HISTORY_PERMISSION_MISSING: 'The bot needs View Channel and Read Message History in this channel. An empty REST result would not confirm an empty history.',
  NO_MESSAGES: '(No messages were returned for this channel.)',
  NO_MESSAGE_HISTORY: '(This channel does not provide a directly readable message history.)',
  EXPORT_SCOPE: 'Current guild channels and their accessible message histories. Thread histories, deleted messages, and content withheld by Discord are outside this export.',
  SUCCESS_DESC: (stats) =>
    `${stats.complete === false ? 'Saved a partial server export' : 'Saved server data'} to **\`${stats.outputDir}\`**.\n\n` +
    `• **Roles Exported:** ${stats.totalRoles}\n` +
    `• **Categories:** ${stats.totalCategories}\n` +
    `• **Channels:** ${stats.totalChannels} (${stats.textChannels} text/announcements, ${stats.voiceChannels} voice)\n` +
    `• **Total Messages Exported:** ${stats.totalMessages.toLocaleString()}\n` +
    `• **Incomplete Message Histories:** ${(stats.failedMessageChannels || 0) + (stats.partialMessageChannels || 0)}\n` +
    `• **Export Outputs:** Structured JSON, readable transcripts, and \`extraction_report.json\` with per-channel history status.\n\n` +
    `${stats.scope || EXTRACTOR_MESSAGES.EXPORT_SCOPE}`,
  NO_GUILD: 'Server extraction can only be executed inside a Discord guild.',
  UNAUTHORIZED: 'You must have Administrator or Manage Server permissions to extract server data.',
  ERROR: 'An unexpected error occurred during server extraction.',
});
