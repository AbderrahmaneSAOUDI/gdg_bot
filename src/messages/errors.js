/**
 * Centralized Error & Permission Messages.
 * Invariant: Never expose raw stack traces or internal errors to users.
 */

export const ERROR_MESSAGES = Object.freeze({
  PERMISSION_DENIED:
    "You don't have permission to perform this action. If you believe this is a mistake, contact an organizer.",
  ADMIN_REQUIRED:
    'This action requires Administrator or Manage Server permissions.',
  NOT_CONFIGURED:
    "This feature or channel hasn't been configured yet. Please check back later.",
  NOT_FOUND:
    "The requested item or entity could not be found. It may have been removed or moved.",
  INVALID_INPUT:
    'The provided information is invalid. Please double-check your input and try again.',
  OPERATION_FAILED:
    'Something went wrong while completing your request. Please try again in a few moments.',
  DISCORD_API_FAILURE:
    'Discord is currently experiencing delays. Please try again shortly.',
  UNEXPECTED_ERROR:
    'An unexpected error occurred. Our team has been notified.',
  UNKNOWN_INTERACTION:
    'This interaction is unrecognized or has expired. Please restart via `/bot`.',
});
