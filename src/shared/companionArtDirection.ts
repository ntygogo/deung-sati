import { previewAppearance, type CompanionAppearance } from './companionAppearance';

/** Curated previews only. Nothing here overwrites a companion's birth snapshot. */
export const COMPANION_COLLECTIONS = {
  lotus: {
    name: 'บัวชมพู', subtitle: 'กลีบบัวนุ่ม',
    palette: 'soft_sakura', pattern: 'petal_marks', motion: 'dreamy_drift', lampShape: 'bud',
    body: '#EEA6BF', face: '#F6B6C8', belly: '#FFE0C8', fin: '#B4A7DB', finTip: '#F8D1E6', marking: '#AD608D', cheek: '#F28D9F', lamp: '#FFDEA2',
  },
  moonpool: {
    name: 'สายน้ำจันทรา', subtitle: 'ลายน้ำโค้ง',
    palette: 'jade_mint', pattern: 'water_ripples', motion: 'serene_swaying', lampShape: 'drop',
    body: '#97D3BF', face: '#B0DEC9', belly: '#F0E6C7', fin: '#8FBCCD', finTip: '#D2B8E4', marking: '#4E979B', cheek: '#E9A6AD', lamp: '#CEFFF1',
  },
  starlight: {
    name: 'ละอองดาว', subtitle: 'ดาวและฝุ่นมุก',
    palette: 'powder_blue', pattern: 'starlight_speckles', motion: 'curious_peek', lampShape: 'pearl',
    body: '#AABCEB', face: '#BDC9EF', belly: '#F5D9CD', fin: '#B099D0', finTip: '#F2C1DC', marking: '#8364B4', cheek: '#E8A0BC', lamp: '#FFF1B9',
  },
} as const;
export type CompanionCollection = keyof typeof COMPANION_COLLECTIONS;
export function collectionPreview(base: CompanionAppearance, collection: CompanionCollection): CompanionAppearance {
  const design = COMPANION_COLLECTIONS[collection];
  const next = previewAppearance(base, { palette: design.palette, pattern: design.pattern, motion: design.motion });
  return { ...next, previewCollection: collection, previewLamp: design.lampShape,
    palette: { ...next.palette, label: design.name, body: design.body, secondary: design.fin, lamp: design.lamp },
    patternSeed: {lotus:121,moonpool:242,starlight:363}[collection] };
}
