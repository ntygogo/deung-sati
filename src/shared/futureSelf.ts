export type FutureFocus = { id: string; title: string; outcome: string; cue: string; action: string; obstacle: string; fallback: string };
export type FutureEntry = { id: string; at: string; focus: string; action: string; result: 'helpful' | 'little' | 'same' | 'harder' | 'notyet'; note: string };
export type FutureJournal = { focus: FutureFocus | null; entries: FutureEntry[] };
export type FutureDocument = { ownerId: string; revision: number; journal: FutureJournal };
export const emptyFutureJournal = (): FutureJournal => ({ focus: null, entries: [] });
export const sameFutureValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const text = (value: unknown, max: number, required = false): string => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Invalid Future Self text');
  return value;
};
export function validateFutureJournal(value: unknown): FutureJournal {
  if (!value || typeof value !== 'object') throw new Error('Invalid Future Self journal');
  const data = value as FutureJournal;
  if (!Array.isArray(data.entries) || data.entries.length > 1000) throw new Error('Too many Future Self entries');
  let focus: FutureFocus | null = null;
  if (data.focus !== null) {
    const f = data.focus;
    if (!f || typeof f !== 'object') throw new Error('Invalid Future Self focus');
    focus = { id: text(f.id, 160, true), title: text(f.title, 200, true), outcome: text(f.outcome, 400), cue: text(f.cue, 400, true), action: text(f.action, 400, true), obstacle: text(f.obstacle, 400), fallback: text(f.fallback, 400) };
  }
  const ids = new Set<string>();
  const entries = data.entries.map(e => {
    if (!e || !['helpful', 'little', 'same', 'harder', 'notyet'].includes(e.result)) throw new Error('Invalid Future Self result');
    const id = text(e.id, 160, true);
    if (ids.has(id)) throw new Error('Duplicate Future Self entry');
    ids.add(id);
    const at = text(e.at, 40, true);
    if (!Number.isFinite(Date.parse(at))) throw new Error('Invalid Future Self date');
    return { id, at, focus: text(e.focus, 200, true), action: text(e.action, 400, true), result: e.result, note: text(e.note, 800) };
  });
  if (JSON.stringify({ focus, entries }).length > 450000) throw new Error('Future Self journal too large');
  return { focus, entries };
}
export function mergeFutureEntries(left: FutureEntry[], right: FutureEntry[]): FutureEntry[] {
  const entries = new Map(left.map(entry => [entry.id, entry]));
  for (const entry of right) {
    const old = entries.get(entry.id);
    if (old && !sameFutureValue(old, entry)) throw new Error('A saved reflection cannot be replaced');
    entries.set(entry.id, entry);
  }
  return [...entries.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}
export function reconcileFutureJournal(base: FutureJournal, local: FutureJournal, remote: FutureJournal) {
  const localChanged = !sameFutureValue(local.focus, base.focus);
  const remoteChanged = !sameFutureValue(remote.focus, base.focus);
  const conflict = localChanged && remoteChanged && !sameFutureValue(local.focus, remote.focus);
  return { conflict, journal: { focus: localChanged ? local.focus : remote.focus, entries: mergeFutureEntries(remote.entries, local.entries) } };
}
