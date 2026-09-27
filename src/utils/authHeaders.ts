export function authHeaders(): Record<string, string> {
  let token: string | null = null;
  try { token = localStorage.getItem('deung_sati_session_token'); } catch { /* Cookie auth still works. */ }
  return { 'Content-Type': 'application/json', 'X-DeungSati-Client': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
