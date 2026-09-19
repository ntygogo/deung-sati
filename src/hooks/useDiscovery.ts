import { useCallback, useEffect, useRef, useState } from 'react';
import { validateDiscoveryRecord, type DiscoveryRecord, type SavedDiscoveryRecord } from '../shared/discovery';

export const discoveryGuestKey = 'deung_sati_discovery_guest_v1';
export function discoveryInput(record: SavedDiscoveryRecord): DiscoveryRecord {
  const { id, kind, version, locale, createdAt, data } = record;
  return validateDiscoveryRecord({ id, kind, version, locale, createdAt, data });
}
function savedRecord(value: unknown): SavedDiscoveryRecord {
  const item = value as SavedDiscoveryRecord;
  const record = discoveryInput(item);
  if (!Number.isSafeInteger(item.revision) || item.revision < 1 || typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt))) throw new Error('Invalid saved reflection');
  return { ...record, revision: item.revision, updatedAt: item.updatedAt };
}
const sorted = (records: SavedDiscoveryRecord[]) => [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
function readGuestRecords(): SavedDiscoveryRecord[] {
  const raw = localStorage.getItem(discoveryGuestKey);
  const stored = raw ? JSON.parse(raw) : { version: 1, records: [] };
  if (stored.version !== 1 || !Array.isArray(stored.records) || stored.records.length > 1000) throw new Error('Invalid guest collection');
  const records = stored.records.map(savedRecord) as SavedDiscoveryRecord[];
  if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('Duplicate record');
  return records;
}
async function withGuestLock<T>(operation: () => T): Promise<T> {
  if (!navigator.locks) throw Object.assign(new Error('Browser lock unavailable'), { code: 'LOCK_UNAVAILABLE' });
  return navigator.locks.request(discoveryGuestKey, operation);
}
const errorCode = (error: unknown) => {
  const e = error as { status?: number; code?: string };
  if (e.code === 'LOCK_UNAVAILABLE') return 'unsupported';
  if (e.code === 'ACCOUNT_CHANGED' || e.status === 401 || e.status === 403) return 'account';
  if (e.status === 409 || e.status === 404 || e.status === 410) return 'conflict';
  if (e.status === 400 || e.status === 413) return 'invalid';
  return 'connection';
};

/** Guest storage is opt-in per save. Signed-in reflections live in the account only. */
export function useDiscovery(ownerId: string | null) {
  const [records, setRecords] = useState<SavedDiscoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const recordsRef = useRef<SavedDiscoveryRecord[]>([]);
  const busy = useRef(false);
  const blockedGuest = useRef(false);
  const requestVersion = useRef(0);
  const alive = useRef(true);
  const publish = useCallback((next: SavedDiscoveryRecord[]) => {
    recordsRef.current = sorted(next);
    if (alive.current) setRecords(recordsRef.current);
  }, []);
  const request = useCallback(async (path = '', method = 'GET', body?: unknown) => {
    let token: string | null = null;
    try { token = localStorage.getItem('deung_sati_session_token'); } catch { /* Cookie auth can still work. */ }
    const response = await fetch(`/api/user/discovery${path}`, {
      method, credentials: 'include', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-DeungSati-Client': 'true', 'X-DeungSati-Owner': ownerId || '', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('Reflection request failed'), { status: response.status, code: result.code });
    if (result.ownerId !== ownerId) throw Object.assign(new Error('Account changed'), { code: 'ACCOUNT_CHANGED' });
    return result;
  }, [ownerId]);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      let items: unknown;
      if (ownerId) items = (await request()).records;
      else items = readGuestRecords();
      if (!Array.isArray(items) || items.length > 1000) throw new Error('Invalid collection');
      const next = items.map(savedRecord);
      if (new Set(next.map(item => item.id)).size !== next.length) throw new Error('Duplicate record');
      if (alive.current && version === requestVersion.current) { publish(next); blockedGuest.current = false; }
    } catch (e) {
      if (alive.current && version === requestVersion.current) {
        if (!ownerId) blockedGuest.current = true;
        setError(ownerId ? errorCode(e) : 'storage');
      }
    } finally { if (alive.current && version === requestVersion.current) setLoading(false); }
  }, [ownerId, publish, request]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const changed = (event: StorageEvent) => { if (!ownerId && event.key === discoveryGuestKey) void refresh(); };
    window.addEventListener('storage', changed);
    return () => { alive.current = false; requestVersion.current++; window.removeEventListener('storage', changed); };
  }, [refresh, ownerId]);
  const save = async (value: DiscoveryRecord, revision?: number): Promise<SavedDiscoveryRecord | null> => {
    if (busy.current || (!ownerId && blockedGuest.current)) return null;
    busy.current = true; requestVersion.current++; setSaving(true); setError('');
    try {
      const record = validateDiscoveryRecord(value);
      let saved: SavedDiscoveryRecord;
      if (ownerId) {
        const result = await request(revision ? `/${encodeURIComponent(record.id)}` : '', revision ? 'PUT' : 'POST', revision ? { record, revision } : { record });
        saved = savedRecord(result.record);
        if (saved.id !== record.id || saved.kind !== record.kind) throw new Error('Mismatched saved record');
      } else {
        saved = await withGuestLock(() => {
          const latest = readGuestRecords();
          const current = latest.find(item => item.id === record.id);
          if (revision !== undefined && current?.revision !== revision) throw Object.assign(new Error('Record changed'), { status: 409 });
          if (revision === undefined && current) throw Object.assign(new Error('Record exists'), { status: 409 });
          if (current && (current.kind !== record.kind || current.createdAt !== record.createdAt || current.version !== record.version || current.locale !== record.locale || (current.kind === 'assessment' && record.kind === 'assessment' && current.data.assessmentId !== record.data.assessmentId))) throw Object.assign(new Error('Record identity changed'), { status: 409 });
          const value: SavedDiscoveryRecord = { ...record, revision: (current?.revision || 0) + 1, updatedAt: new Date().toISOString() };
          const next = [value, ...latest.filter(item => item.id !== value.id)];
          if (next.length > 1000) throw Object.assign(new Error('Record limit'), { status: 413 });
          localStorage.setItem(discoveryGuestKey, JSON.stringify({ version: 1, records: next }));
          recordsRef.current = next;
          return value;
        });
      }
      if (alive.current) publish([saved, ...recordsRef.current.filter(item => item.id !== saved.id)]);
      return saved;
    } catch (e) { if (alive.current) setError(ownerId ? errorCode(e) : (e as { status?: number; code?: string }).status || (e as { code?: string }).code ? errorCode(e) : 'storage'); return null; }
    finally { busy.current = false; if (alive.current) { setSaving(false); setLoading(false); } }
  };
  const remove = async (record: SavedDiscoveryRecord): Promise<boolean> => {
    if (busy.current || (!ownerId && blockedGuest.current)) return false;
    busy.current = true; requestVersion.current++; setSaving(true); setError('');
    try {
      if (ownerId) await request(`/${encodeURIComponent(record.id)}`, 'DELETE', { revision: record.revision });
      const next = ownerId ? recordsRef.current.filter(item => item.id !== record.id) : await withGuestLock(() => {
        const latest = readGuestRecords();
        if (latest.some(item => item.id === record.id && item.revision !== record.revision)) throw Object.assign(new Error('Record changed'), { status: 409 });
        const remaining = latest.filter(item => item.id !== record.id);
        localStorage.setItem(discoveryGuestKey, JSON.stringify({ version: 1, records: remaining }));
        return remaining;
      });
      if (alive.current) publish(next);
      return true;
    } catch (e) { if (alive.current) setError(ownerId ? errorCode(e) : (e as { status?: number; code?: string }).status || (e as { code?: string }).code ? errorCode(e) : 'storage'); return false; }
    finally { busy.current = false; if (alive.current) { setSaving(false); setLoading(false); } }
  };
  return { records, loading, saving, error, refresh, save, remove };
}
