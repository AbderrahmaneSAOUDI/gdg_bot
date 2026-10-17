/**
 * Centralized Common User-Facing Text Templates.
 */

export const COMMON_MESSAGES = Object.freeze({
  LOADING: 'Loading...',
  EMPTY: 'Nothing to show here yet.',
  UNAVAILABLE: "This section isn't available yet.",
  COMING_SOON: 'This feature is currently under active development. Stay tuned!',
  ACTION_SUCCESS: 'Operation completed successfully.',
  ACTION_CANCELLED: 'Action was cancelled.',
  SESSION_EXPIRED: 'This interactive session has expired. Use `/bot` to start a new one.',
  SESSION_CLOSED: 'Session closed.',
  PERSISTENT_DEPLOYED: 'Persistent Team Hub dashboard successfully deployed to the channel.',
  PERSISTENT_DEPLOYED_TO: (channel) => `Persistent Team Hub dashboard successfully posted in ${channel}! Members can now interact with the hub directly without running commands.`,
});
