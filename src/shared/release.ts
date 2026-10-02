/** Room development is isolated from the rest of Phase 2. */
export const COMPANION_ROOM_ENABLED: boolean = true;
/** One release switch for UI navigation and server feature gates. No URL overrides. */
export const CHAT_ONLY_BETA: boolean = true;
export function betaScreenAllowed(screen: string): boolean {
  return !CHAT_ONLY_BETA || (COMPANION_ROOM_ENABLED && screen === 'companion') || ['home', 'chat', 'pause', 'phase2'].includes(screen);
}
export function betaEndpointBlocked(path: string, method: string): boolean {
  if (!CHAT_ONLY_BETA) return false;
  if (COMPANION_ROOM_ENABLED && path === '/companion/create' && method === 'POST') return false;
  return /^\/(user\/future-self|missions)(\/|$)/.test(path)
    || (method !== 'GET' && /^\/(companion|wallet)(\/|$)/.test(path));
}


