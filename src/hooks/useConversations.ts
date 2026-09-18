import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage } from '../shared/chat-protocol';
import { confirmedTrace, newConversation, traceConversationId, traceFields, type Conversation } from '../shared/conversation';

const GUEST_KEY = 'deung_sati_chat_archive_v1';
type GuestStore = { activeId?: string; conversations: Record<string, Conversation>; deleted: string[] };
const readGuest = (): GuestStore => {
  const data = JSON.parse(localStorage.getItem(GUEST_KEY) || '{}');
  return { activeId: data.activeId, conversations: data.conversations || {}, deleted: data.deleted || [] };
};
const headers = () => {
  const token = localStorage.getItem('deung_sati_session_token');
  return { 'Content-Type': 'application/json', 'X-DeungSati-Client': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
async function request(path = '', method = 'GET', body?: unknown) {
  const res = await fetch('/api/loops/conversations' + path, { method, credentials: 'include', headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (res.status === 404 && method === 'GET') return { conversation: null };
  if (!res.ok) throw new Error(res.status === 409 ? 'มีการเปลี่ยนแชทจากอีกหน้า กรุณาเปิดแชทใหม่ก่อนคุยต่อ' : res.status === 410 ? 'ประวัตินี้ถูกลบแล้ว กรุณาเริ่มบทสนทนาใหม่' : 'ยังเชื่อมต่อเพื่อเก็บหรือเปิดแชทไม่ได้ กรุณาลองอีกครั้ง');
  return res.json();
}
export function useConversations(traces: any[]) {
  const { currentUser, isLoading } = useAuth();
  const owner = isLoading ? 'loading' : currentUser?.id || 'guest';
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const [active, setActive] = useState<Conversation>(() => newConversation());
  const current = useRef(active); current.current = active;
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const ready = loadedOwner === owner && owner !== 'loading';
  const [error, setError] = useState('');
  const revisions = useRef(new Map<string, number>());
  const signatures = useRef(new Map<string, string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const busy = useRef(false);

  const install = useCallback((c: Conversation) => {
    revisions.current.set(c.id, c.revision);
    current.current = c; setActive(c);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoadedOwner(null); setError('');
    revisions.current.clear(); signatures.current.clear();
    install(newConversation());
    if (owner === 'loading') return;
    (async () => {
      try {
        let c: Conversation | null = null;
        if (owner === 'guest') {
          const store = readGuest(); c = store.conversations[store.activeId || ''] || null;
        } else {
          const { conversations } = await request();
          if (conversations[0]) c = (await request('/' + encodeURIComponent(conversations[0].id))).conversation;
        }
        if (cancelled) return;
        if (c) install(c);
        setLoadedOwner(owner);
      } catch (e) { if (!cancelled) { setError((e as Error).message); setLoadedOwner(owner); } }
    })();
    return () => { cancelled = true; };
  }, [owner, install]);

  const persist = useCallback((doc: Conversation) => {
    const expectedOwner = owner;
    const task = queue.current.catch(() => undefined).then(async () => {
      if (ownerRef.current !== expectedOwner || expectedOwner === 'loading') return;
      const messages = doc.messages.filter(m => !m.isStreaming && !m.hasError && m.text.trim());
      if (!messages.some(m => m.role === 'user') && !doc.parentTraceId && !doc.draftTraceId) return;
      const signature = JSON.stringify(messages);
      if (signatures.current.get(doc.id) === signature) return;
      const revision = revisions.current.get(doc.id) ?? doc.revision;
      let saved: Conversation;
      if (expectedOwner === 'guest') {
        const store = readGuest();
        if (store.deleted.includes(doc.id)) throw new Error('ประวัตินี้ถูกลบแล้ว กรุณาเริ่มบทสนทนาใหม่');
        const existing = store.conversations[doc.id];
        if (existing && existing.revision !== revision && JSON.stringify(existing.messages) !== signature) throw new Error('มีการเปลี่ยนแชทจากอีกหน้า กรุณาเปิดแชทใหม่ก่อนคุยต่อ');
        saved = { ...doc, messages, revision: revision + 1, updatedAt: new Date().toISOString() };
        store.conversations[doc.id] = saved; store.activeId = current.current.id;
        localStorage.setItem(GUEST_KEY, JSON.stringify(store));
      } else {
        saved = (await request('/' + encodeURIComponent(doc.id), 'PUT', { ...doc, messages, revision })).conversation;
      }
      if (ownerRef.current !== expectedOwner) return;
      revisions.current.set(doc.id, saved.revision);
      signatures.current.set(doc.id, signature); setError('');
    });
    queue.current = task;
    return task.catch(e => { if (ownerRef.current === expectedOwner) setError(e.message || 'ยังเก็บแชทไม่สำเร็จ'); throw e; });
  }, [owner]);
  const flush = useCallback(async () => {
    if (!ready) throw new Error('กำลังเปิดประวัติ กรุณารอสักครู่');
    await persist(current.current);
  }, [ready, persist]);
  useEffect(() => {
    if (!ready) return;
    void persist(active).catch(() => undefined);
  }, [active, ready, persist]);

  const updateMessages = useCallback((id: string, update: ChatMessage[] | ((old: ChatMessage[]) => ChatMessage[])) => {
    setActive(old => old.id === id ? { ...old, messages: typeof update === 'function' ? update(old.messages) : update, updatedAt: new Date().toISOString() } : old);
  }, []);
  const setMessages = useCallback((update: ChatMessage[] | ((old: ChatMessage[]) => ChatMessage[])) => updateMessages(active.id, update), [active.id, updateMessages]);
  const get = async (id: string) => owner === 'guest' ? readGuest().conversations[id] || null : (await request('/' + encodeURIComponent(id))).conversation as Conversation | null;
  const history = async (trace: any): Promise<Conversation[]> => {
    const source = traceConversationId(trace);
    const list = owner === 'guest' ? Object.values(readGuest().conversations).map(c => ({ id: c.id, parent_trace_id: c.parentTraceId, draft_trace_id: c.draftTraceId })) : (await request('?traceId=' + encodeURIComponent(trace.id))).conversations;
    const ids = list.filter((c: any) => c.id === source || c.parent_trace_id === trace.id || c.draft_trace_id === trace.id).map((c: any) => c.id);
    const docs = await Promise.all(ids.map(get));
    return docs.filter((c): c is Conversation => !!c).sort((a, b) => a.id === source ? -1 : b.id === source ? 1 : a.updatedAt.localeCompare(b.updatedAt));
  };
  const resume = async (trace: any) => {
    if (busy.current) return false;
    busy.current = true;
    try {
      await flush();
      const docs = await history(trace);
      const confirmed = confirmedTrace(trace);
      let doc = confirmed ? docs.filter(c => c.parentTraceId === trace.id).at(-1) : docs.filter(c => !c.parentTraceId).at(-1);
      if (!doc) {
        doc = newConversation();
        if (confirmed) doc.parentTraceId = trace.id; else doc.draftTraceId = trace.id;
        doc.messages = [{ id: 'resume-welcome', role: 'ai', text: docs.length ? 'กลับมาคุยเรื่องนี้ต่อได้เลยนะ ตอนนี้มีอะไรที่อยากเล่า?' : 'แชทนี้เริ่มจากสรุปลูปที่บันทึกไว้ ยังไม่มีบทสนทนาเดิมให้เปิดอ่าน ตอนนี้อยากเล่าตรงไหนต่อก็ได้เลยนะ' }];
      }
      if (!confirmed) {
        // Restore the draft's reviewed wording as well as its guide state.
        const last = [...doc.messages].reverse().find(m => m.structuredTurn?.loop_guide);
        if (last?.structuredTurn?.loop_guide) {
          doc = { ...doc, messages: doc.messages.map(m => m.id === last.id ? { ...m, structuredTurn: { ...last.structuredTurn!, loop_guide: { ...last.structuredTurn!.loop_guide!, fields: traceFields(trace), mode: 'listening', asked: null, preferListening: true } } } : m) };
        }
      }
      install(doc); setError(''); return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { busy.current = false; }
  };
  const startNew = async () => { await flush(); const doc = newConversation(); install(doc); return doc; };
  const removeHistory = async (trace: any) => {
    await queue.current.catch(() => undefined);
    const docs = await history(trace);
    for (const doc of docs) {
      if (owner === 'guest') {
        const store = readGuest(); delete store.conversations[doc.id]; store.deleted.push(doc.id);
        localStorage.setItem(GUEST_KEY, JSON.stringify(store));
      } else await request('/' + encodeURIComponent(doc.id), 'DELETE');
      signatures.current.delete(doc.id);
    }
    if (docs.some(c => c.id === current.current.id)) install(newConversation());
  };
  const listAll = async (): Promise<Conversation[]> => {
    if (owner === 'guest') return Object.values(readGuest().conversations).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const { conversations } = await request();
    return (await Promise.all(conversations.map((c: any) => get(c.id)))).filter((c): c is Conversation => !!c);
  };
  const open = async (c: Conversation) => { await flush(); const latest = await get(c.id); if (latest) install(latest); else throw new Error('ประวัตินี้ไม่มีแล้ว'); };
  const reload = async () => {
    await queue.current.catch(() => undefined);
    const latest = await get(current.current.id);
    signatures.current.delete(current.current.id);
    install(latest || newConversation()); setError('');
  };
  const sourceTrace = traces.find(t => t.id === (active.parentTraceId || active.draftTraceId) || traceConversationId(t) === active.id);
  const pastContext = sourceTrace ? JSON.stringify({ date: sourceTrace.created_at, title: sourceTrace.title, fields: traceFields(sourceTrace) }) : undefined;
  const locked = !!sourceTrace && confirmedTrace(sourceTrace) && !active.parentTraceId;
  return { active, setMessages, updateMessages, ready, error, flush, history, listAll, open, reload, resume, removeHistory, startNew, sourceTrace, pastContext, locked, isGuest: owner === 'guest' };
}
