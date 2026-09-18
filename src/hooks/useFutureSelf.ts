import { useEffect, useState, useSyncExternalStore } from 'react';
import { FutureSelfStore, type FutureTransport } from '../lib/futureSelfStore';
export function useFutureSelf(ownerId: string) {
  const [store] = useState(() => {
    const transport: FutureTransport = async (method, body) => {
      let token: string | null = null;
      try { token = localStorage.getItem('deung_sati_session_token'); } catch { /* Cookie authentication still works. */ }
      const res = await fetch('/api/user/future-self', {
        method, credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-DeungSati-Client': 'true', 'X-DeungSati-Owner': ownerId, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw Object.assign(new Error('Future Self request failed'), { status: res.status, code: payload.code });
      }
      return res.json();
    };
    // Do not resolve window.localStorage until the operation; private browsing
    // may throw even when reading the property.
    const storage = { getItem: (key: string) => localStorage.getItem(key), setItem: (key: string, value: string) => localStorage.setItem(key, value) };
    return new FutureSelfStore(ownerId, storage, ownerId === 'guest' ? undefined : transport);
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    const refresh = () => { void store.sync(); };
    refresh(); window.addEventListener('online', refresh); window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
  }, [store]);
  return { ...state, commit: store.commit, retry: store.sync, resolveConflict: store.resolveConflict, guestImport: store.guestImport(), importGuest: store.importGuest };
}
