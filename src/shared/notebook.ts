export type NotebookEntry = { id: string; title: string; self: string; grateful: string; note: string; createdAt: string };
export function validateNotebookEntry(value: unknown): NotebookEntry {
  if (!value || typeof value !== 'object') throw new Error('Invalid entry');
  const v = value as Record<string, unknown>;
  for (const [key, limit] of Object.entries({ id: 80, title: 160, self: 20000, grateful: 20000, note: 20000, createdAt: 40 })) {
    if (typeof v[key] !== 'string' || (v[key] as string).length > limit) throw new Error('Invalid entry');
  }
  if (!v.id || !v.title || !Number.isFinite(Date.parse(v.createdAt as string)) || ![v.self, v.grateful, v.note].some(text => (text as string).trim())) throw new Error('Empty entry');
  return { id: v.id as string, title: v.title as string, self: v.self as string, grateful: v.grateful as string, note: v.note as string, createdAt: v.createdAt as string };
}
