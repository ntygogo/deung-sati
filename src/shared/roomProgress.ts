/** Stable thresholds: never reorder action IDs after release. */
export const ROOM_ACTIONS = [
  { id: 'curious', label: 'เอียงหัวมอง', bond: 0 },
  { id: 'scratch', label: 'เกาหน้าเล่น', bond: 3 },
  { id: 'glass', label: 'เข้ามาทักใกล้ ๆ', bond: 8 },
  { id: 'swim', label: 'ว่ายน้ำเล่น', bond: 15 },
] as const;
export const ROOM_WEATHERS = ['sunny', 'rain', 'mist', 'snow'] as const;
export type RoomWeather = typeof ROOM_WEATHERS[number];
export function growthLevel(xp: number) { return 1 + Math.floor(Math.max(0, xp) / 100); }
export function roomUnlocks(before: number, after: number) {
  return ROOM_ACTIONS.filter(a => a.bond > before && a.bond <= after).map(a => a.id);
}
export function defaultRoomWeather(theme?: string): RoomWeather {
  return theme === 'misty_moss' ? 'mist' : theme === 'moonlit_pond' ? 'rain' : 'sunny';
}
export interface RoomEvent {
  id: string;
  kind: 'growth' | 'bond';
  payload: { xp?: number; progress?: number; previousProgress?: number; level?: number; levelUp?: boolean; hatched?: boolean; bond?: number; unlocks?: string[]; skills?: Record<string, number> };
}
export interface RoomState { bond: number; weather: RoomWeather; events: RoomEvent[] }
