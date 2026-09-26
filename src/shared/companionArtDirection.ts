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
  earth: { name:'สวนโอปอล', subtitle:'ธาตุดิน · หางผลึกโอปอลและสันแร่', palette:'soft_sakura', pattern:'starlight_speckles', motion:'serene_swaying', lampShape:'pearl', body:'#DEA58D',face:'#EDB89C',belly:'#FFE0AE',fin:'#538F83',finTip:'#A0DCBD',marking:'#8C5969',cheek:'#DF7F83',lamp:'#FFE1A0' },
  water: { name:'บัวแก้ว', subtitle:'ธาตุน้ำ · หางคลื่นมุกและหยดแก้ว', palette:'jade_mint', pattern:'water_ripples', motion:'serene_swaying',lampShape:'drop',body:'#72C7C8',face:'#94D8D2',belly:'#FFE0BD',fin:'#428BBA',finTip:'#B7ADF0',marking:'#346F91',cheek:'#F1A391',lamp:'#A2F6E5' },
  wind: { name:'เมฆอรุณ',subtitle:'ธาตุลม · หางแพรเมฆและครีบสายลม',palette:'powder_blue',pattern:'water_ripples',motion:'dreamy_drift',lampShape:'pearl',body:'#B49AD9',face:'#C5ACE7',belly:'#FFE3BB',fin:'#6879B9',finTip:'#F3BCBA',marking:'#755195',cheek:'#E894AE',lamp:'#FFE4A3' },
  fire: { name:'เปลวพีช',subtitle:'ธาตุไฟ · หางเปลวพีชและครีบเพลิง',palette:'soft_sakura',pattern:'petal_marks',motion:'curious_peek',lampShape:'drop',body:'#F2A08A',face:'#F6B39A',belly:'#FFDBA1',fin:'#BC527F',finTip:'#F9BE67',marking:'#AD4770',cheek:'#E77679',lamp:'#FFC465' },
  leaf: { name:'ภูตพิสตาชิโอ',subtitle:'ใบไม้ · หางพัดใบหยกและยอดอ่อน',palette:'jade_mint',pattern:'water_ripples',motion:'serene_swaying',lampShape:'bud',body:'#B4CF87',face:'#CBDB9A',belly:'#FFE4B7',fin:'#4C9A80',finTip:'#E9A3B8',marking:'#528B68',cheek:'#E9A090',lamp:'#F9D988' },
  flower: { name:'พีโอนีบลูม',subtitle:'ดอกไม้ · หางกลีบพีโอนีและดอกตูม',palette:'soft_sakura',pattern:'petal_marks',motion:'dreamy_drift',lampShape:'bud',body:'#E89ABA',face:'#F0ACC7',belly:'#FFDCBD',fin:'#925FAD',finTip:'#F4B5D1',marking:'#9B457F',cheek:'#E579A0',lamp:'#FFDA84' },
} as const;
export type CompanionCollection = keyof typeof COMPANION_COLLECTIONS;
export function collectionPreview(base: CompanionAppearance, collection: CompanionCollection): CompanionAppearance {
  const design = COMPANION_COLLECTIONS[collection];
  const next = previewAppearance(base, { palette: design.palette, pattern: design.pattern, motion: design.motion });
  return { ...next, collectibleSerial: undefined, previewRemix: undefined, previewCollection: collection, previewLamp: design.lampShape,
    palette: { ...next.palette, label: design.name, body: design.body, secondary: design.fin, lamp: design.lamp },
    patternSeed: {lotus:121,moonpool:242,starlight:363,earth:414,water:525,wind:636,fire:747,leaf:858,flower:969}[collection] };
}
