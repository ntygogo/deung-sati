import type { IDatabaseAdapter } from '../db/types.js';
import { COLLECTIBLE_CAPACITY, collectibleDesign } from '../../src/shared/companionCollectible.js';

// No cascading foreign key: retiring/deleting an account must not release its look.
export const DESIGN_REGISTRY_SCHEMA = `CREATE TABLE IF NOT EXISTS companion_design_claims (
  slot_id INTEGER PRIMARY KEY CHECK (slot_id >= 0 AND slot_id < 62208),
  companion_id VARCHAR(64) NOT NULL UNIQUE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
export class CompanionDesignPoolExhausted extends Error {
  readonly code='COMPANION_DESIGN_POOL_EXHAUSTED';
  constructor(){super('น้องคอลเลกชันแรกครบ 62,208 แบบแล้ว กรุณารอคอลเลกชันใหม่ โดยบันทึกการฝึกของคุณยังใช้งานได้');}
}
/** Caller owns the transaction and locks its companion row before entering. */
export async function reserveCompanionDesign(tx:IDatabaseAdapter,companionId:string,preferred:number){
  // One transaction-scoped lock across every server process, not a JavaScript mutex.
  // Also serializes first-use schema setup when previews share the same database.
  if(tx.getDriver()==='postgres')await tx.query('SELECT pg_advisory_xact_lock(62208, 1)');
  await tx.execute(DESIGN_REGISTRY_SCHEMA);
  const existing=await tx.queryOne<{slot_id:number}>('SELECT slot_id FROM companion_design_claims WHERE companion_id = $1',[companionId]);
  if(existing)return collectibleDesign(Number(existing.slot_id));
  const start=((Math.trunc(preferred)%COLLECTIBLE_CAPACITY)+COLLECTIBLE_CAPACITY)%COLLECTIBLE_CAPACITY;
  // First free slot is either the requested slot or immediately after a claimed slot.
  // Indexed sparse registry; no 62k INSERT seed or unbounded random retry loop.
  const freeAfter=(lower:number)=>tx.queryOne<{slot_id:number}>(`SELECT candidates.slot_id FROM (
    SELECT CAST($1 AS INTEGER) AS slot_id
    UNION SELECT slot_id + 1 AS slot_id FROM companion_design_claims WHERE slot_id >= $2 AND slot_id < 62207
  ) AS candidates LEFT JOIN companion_design_claims AS used ON used.slot_id = candidates.slot_id
  WHERE used.slot_id IS NULL ORDER BY candidates.slot_id LIMIT 1`,[lower,lower]);
  const free=await freeAfter(start)??(start>0?await freeAfter(0):null);
  if(!free)throw new CompanionDesignPoolExhausted();
  await tx.execute('INSERT INTO companion_design_claims (slot_id, companion_id) VALUES ($1, $2)',[Number(free.slot_id),companionId]);
  return collectibleDesign(Number(free.slot_id));
}
