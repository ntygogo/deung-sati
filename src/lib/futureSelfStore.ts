import { emptyFutureJournal, mergeFutureEntries, reconcileFutureJournal, sameFutureValue, validateFutureJournal, type FutureDocument, type FutureFocus, type FutureJournal } from '../shared/futureSelf.js';
export type FutureStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type FutureTransport = (method: 'GET' | 'PUT', value?: { revision: number; journal: FutureJournal }) => Promise<FutureDocument>;
type Cache = { ownerId: string; base: FutureDocument; journal: FutureJournal; pending: boolean };
type Status = 'loading' | 'local' | 'synced' | 'saving' | 'offline' | 'conflict' | 'error';
export type FutureStoreState = { journal: FutureJournal; status: Status; error: string; remoteFocus?: FutureFocus | null };
const storageKey = (owner: string) => `deung_sati_future_practice_v2_${owner}`;
const legacyKey = (owner: string) => `deung_sati_future_practice_v1_${owner}`;
const message = 'ยังซิงก์กับบัญชีไม่ได้ ข้อมูลที่เก็บในเครื่องยังอยู่ ลองอีกครั้งเมื่อเชื่อมต่อได้';
export class FutureSelfStore {
  private owner: string;
  private storage: FutureStorage;
  private transport?: FutureTransport;
  private cache: Cache;
  private state: FutureStoreState;
  private listeners = new Set<() => void>();
  private inFlight?: Promise<void>;
  private conflictRemote?: FutureDocument;
  private blocked = false;
  constructor(owner: string, storage: FutureStorage, transport?: FutureTransport) {
    this.owner = owner; this.storage = storage; this.transport = transport;
    this.cache = { ownerId: owner, base: { ownerId: owner, revision: 0, journal: emptyFutureJournal() }, journal: emptyFutureJournal(), pending: false };
    let error = '';
    try {
      const raw = storage.getItem(storageKey(owner));
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.ownerId !== owner || cached.base?.ownerId !== owner || !Number.isSafeInteger(cached.base.revision) || cached.base.revision < 0) throw new Error('Invalid cache');
        this.cache = { ownerId: owner, base: { ...cached.base, journal: validateFutureJournal(cached.base.journal) }, journal: validateFutureJournal(cached.journal), pending: !!cached.pending };
      } else {
        const legacy = storage.getItem(legacyKey(owner));
        if (legacy) {
          this.cache.journal = validateFutureJournal(JSON.parse(legacy));
          this.cache.pending = owner !== 'guest' && !!(this.cache.journal.focus || this.cache.journal.entries.length);
        }
      }
    } catch { this.blocked = true; error = 'เปิดข้อมูลในเครื่องไม่ได้ ข้อมูลเดิมยังไม่ถูกเขียนทับ กรุณาลองเปิดหน้าใหม่'; }
    this.state = { journal: this.cache.journal, status: this.blocked ? 'error' : owner === 'guest' ? 'local' : 'loading', error };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(status: Status, error = '', remoteFocus?: FutureFocus | null) {
    this.state = { journal: this.cache.journal, status, error, remoteFocus };
    this.listeners.forEach(listener => listener());
  }
  private persist(next: Cache) {
    this.storage.setItem(storageKey(this.owner), JSON.stringify(next));
    this.cache = next;
  }
  commit = (value: FutureJournal): boolean => {
    if (this.blocked || this.state.status === 'loading' || this.state.status === 'conflict') return false;
    try {
      const journal = validateFutureJournal(value);
      this.persist({ ...this.cache, journal, pending: this.owner !== 'guest' });
      this.publish(this.owner === 'guest' ? 'local' : 'saving');
      if (this.owner !== 'guest') void this.sync();
      return true;
    } catch { this.publish('error', 'ยังเก็บในเครื่องไม่ได้ ข้อความในแบบฟอร์มยังอยู่ กรุณาลองอีกครั้ง'); return false; }
  };
  sync = (): Promise<void> => {
    if (this.blocked || this.owner === 'guest' || !this.transport) return Promise.resolve();
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.run().finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  };
  private checkDocument(doc: FutureDocument): FutureDocument {
    if (doc.ownerId !== this.owner || !Number.isSafeInteger(doc.revision) || doc.revision < 0) throw new Error('Account changed');
    return { ...doc, journal: validateFutureJournal(doc.journal) };
  }
  private async run() {
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const remote = this.checkDocument(await this.transport!('GET'));
        const merged = reconcileFutureJournal(this.cache.base.journal, this.cache.journal, remote.journal);
        if (merged.conflict) {
          this.conflictRemote = remote;
          // Keep the old base so a reload still recognises the same conflict.
          this.persist({ ...this.cache, journal: merged.journal, pending: true });
          this.publish('conflict', '', remote.journal.focus); return;
        }
        this.conflictRemote = undefined;
        const pending = !sameFutureValue(merged.journal, remote.journal);
        this.persist({ ownerId: this.owner, base: remote, journal: merged.journal, pending });
        if (!pending) { this.publish('synced'); return; }
        this.publish('saving');
        const outgoing = this.cache.journal;
        let saved: FutureDocument;
        try { saved = this.checkDocument(await this.transport!('PUT', { journal: outgoing, revision: remote.revision })); }
        catch (e) { if ((e as { status?: number; code?: string }).status === 409 && (e as { code?: string }).code !== 'ACCOUNT_CHANGED') continue; throw e; }
        // Edits made while the request was in flight are rebased, never replaced
        // by the older response. Another iteration sends the remaining change.
        const latest = reconcileFutureJournal(outgoing, this.cache.journal, saved.journal).journal;
        const more = !sameFutureValue(latest, saved.journal);
        this.persist({ ownerId: this.owner, base: saved, journal: latest, pending: more });
        if (!more) { this.publish('synced'); return; }
      }
      this.publish('offline', 'มีการแก้ไขจากอีกหน้าอย่างต่อเนื่อง ข้อมูลในเครื่องยังอยู่ กดลองซิงก์อีกครั้งได้');
    } catch (e) {
      const authError = [401, 403].includes((e as { status?: number }).status || 0) || (e as { code?: string }).code === 'ACCOUNT_CHANGED';
      this.publish('offline', authError ? 'บัญชีที่เข้าสู่ระบบเปลี่ยนไปหรือหมดอายุ ข้อมูลยังอยู่ในเครื่องของบัญชีเดิม กรุณาเข้าสู่ระบบใหม่' : message);
    }
  }
  resolveConflict = (use: 'local' | 'account') => {
    if (!this.conflictRemote) return;
    try {
      const remote = this.conflictRemote;
      const journal = { focus: use === 'account' ? remote.journal.focus : this.cache.journal.focus, entries: mergeFutureEntries(remote.journal.entries, this.cache.journal.entries) };
      this.persist({ ownerId: this.owner, base: remote, journal, pending: !sameFutureValue(journal, remote.journal) });
      this.conflictRemote = undefined; this.publish('saving'); void this.sync();
    } catch { this.publish('error', 'ยังเก็บแผนที่เลือกไม่ได้ กรุณาลองอีกครั้ง'); }
  };
  guestImport = (): FutureJournal | null => {
    if (this.owner === 'guest') return null;
    try {
      const v2 = this.storage.getItem(storageKey('guest'));
      const raw = v2 ? JSON.parse(v2).journal : JSON.parse(this.storage.getItem(legacyKey('guest')) || 'null');
      if (!raw) return null;
      const guest = validateFutureJournal(raw);
      const ids = new Set(this.cache.journal.entries.map(entry => entry.id));
      return guest.entries.some(entry => !ids.has(entry.id)) || (!this.cache.journal.focus && guest.focus) ? guest : null;
    } catch { return null; }
  };
  importGuest = (): boolean => {
    const guest = this.guestImport();
    if (!guest) return false;
    try { return this.commit({ focus: this.cache.journal.focus || guest.focus, entries: mergeFutureEntries(this.cache.journal.entries, guest.entries) }); }
    catch { this.publish('error', 'บันทึกนี้มีรหัสซ้ำกับข้อมูลที่ต่างกัน ข้อมูลเดิมยังอยู่ กรุณาตรวจบันทึกก่อน'); return false; }
  };
}
