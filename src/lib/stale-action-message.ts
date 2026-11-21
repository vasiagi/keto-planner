const STALE_SERVER_ACTION = /Server Action .* was not found|Failed to find Server Action/i;

export function isStaleServerActionMessage(message: string) {
  return STALE_SERVER_ACTION.test(message);
}
