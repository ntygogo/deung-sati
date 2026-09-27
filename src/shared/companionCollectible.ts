import { REMIX_PALETTES, type RemixDesign } from './companionDesignCatalog.js';
// These orders define the permanent v1 slot encoding. Never reorder them.
export const COLLECTIBLE_ELEMENTS = ['earth','water','wind','fire','leaf','flower'] as const;
export const COLLECTIBLE_PATTERNS = ['pearl_freckles','starlight_speckles','water_ripples','petal_marks'] as const;
export const COLLECTIBLE_CAPACITY = 62208;
export const COLLECTIBLE_PATTERN_CAPACITY = 15552;
export const ELEMENT_LAMPS = {earth:'pearl',water:'drop',wind:'pearl',fire:'drop',leaf:'bud',flower:'bud'} as const;
export interface CollectibleDesign extends RemixDesign {
  edition:'v1'; slot:number; serial:number;
  pattern:typeof COLLECTIBLE_PATTERNS[number];
}
export function collectibleDesign(slot:number):CollectibleDesign {
  if(!Number.isInteger(slot)||slot<0||slot>=COLLECTIBLE_CAPACITY)throw new Error('Invalid collectible slot');
  let remaining=slot;
  const take=(radix:number)=>{const digit=remaining%radix;remaining=Math.floor(remaining/radix);return digit;};
  const palette=take(12);
  const parts={gills:COLLECTIBLE_ELEMENTS[take(6)],dorsal:COLLECTIBLE_ELEMENTS[take(6)],tail:COLLECTIBLE_ELEMENTS[take(6)],lamp:COLLECTIBLE_ELEMENTS[take(6)]};
  return {edition:'v1',slot,serial:slot+1,palette,parts,pattern:COLLECTIBLE_PATTERNS[take(4)],colors:{...REMIX_PALETTES[palette]}};
}
export function readCollectibleDesign(value:unknown):CollectibleDesign|null {
  if(!value||typeof value!=='object')return null;
  const candidate=value as CollectibleDesign;
  if(candidate.edition!=='v1'||!Number.isInteger(candidate.slot)||candidate.slot<0||candidate.slot>=COLLECTIBLE_CAPACITY)return null;
  const expected=collectibleDesign(candidate.slot);
  if(candidate.serial!==expected.serial||candidate.palette!==expected.palette||candidate.pattern!==expected.pattern)return null;
  if(!candidate.parts||Object.keys(expected.parts).some(key=>candidate.parts[key as keyof typeof expected.parts]!==expected.parts[key as keyof typeof expected.parts]))return null;
  // Persist the exact v1 recipe and reject partial/mismatched snapshots.
  if(!candidate.colors||Object.keys(expected.colors!).some(key=>candidate.colors![key as keyof typeof expected.colors]!==expected.colors![key as keyof typeof expected.colors]))return null;
  return candidate;
}
