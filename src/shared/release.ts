/** One release switch for UI navigation and server feature gates. No URL overrides. */
export const CHAT_ONLY_BETA: boolean = true;
export function betaScreenAllowed(screen: string): boolean {
  return !CHAT_ONLY_BETA || ['home', 'chat', 'pause', 'phase2'].includes(screen);
}
export function betaEndpointBlocked(path: string, method: string): boolean {
  if (!CHAT_ONLY_BETA) return false;
  return /^\/(user\/future-self|missions)(\/|$)/.test(path)
    || (method !== 'GET' && /^\/(companion|wallet)(\/|$)/.test(path));
}


