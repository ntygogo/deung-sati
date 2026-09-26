import { collectionPreview, COMPANION_COLLECTIONS } from './companionArtDirection';
import { previewAppearance, type CompanionAppearance } from './companionAppearance';
import type { CompanionElement } from './companionElements';

// A complete palette travels together across every silhouette: no unrelated RGB lottery.
export const REMIX_PALETTES = [
  {name:'เชอร์รี่มังกร',body:'#ED648E',face:'#FA91A5',belly:'#FFD6AD',fin:'#663BA7',finTip:'#FBA55D',marking:'#A82C65',cheek:'#EA526D',lamp:'#FFD16A'},
  {name:'ลากูนป๊อป',body:'#39C5BB',face:'#77DED0',belly:'#FFE0AB',fin:'#2766BB',finTip:'#B997F3',marking:'#216880',cheek:'#F39294',lamp:'#FFD66F'},
  {name:'ม่วงจักรวาล',body:'#9870DC',face:'#B795F1',belly:'#FFD3BF',fin:'#3D488E',finTip:'#F68EC5',marking:'#5D368F',cheek:'#F181B0',lamp:'#FFD278'},
  {name:'มะม่วงซันเซ็ต',body:'#F6B447',face:'#FFCF74',belly:'#FFE7B3',fin:'#D5577C',finTip:'#AF7BDC',marking:'#B76138',cheek:'#EC826F',lamp:'#FFE689'},
  {name:'มังกรหยก',body:'#54B784',face:'#8CD4A1',belly:'#FFE0B0',fin:'#216A6B',finTip:'#E9BD69',marking:'#267757',cheek:'#F2A090',lamp:'#FFD776'},
  {name:'บลูเบอร์รี่โซดา',body:'#649BEC',face:'#93B9FB',belly:'#FFD8C6',fin:'#6550A8',finTip:'#74E3D0',marking:'#355CA5',cheek:'#ED92B9',lamp:'#FFCF75'},
  {name:'พีชฟลามิงโก',body:'#F48871',face:'#FFAF91',belly:'#FFE0AF',fin:'#AF347D',finTip:'#FA96BE',marking:'#B34866',cheek:'#E56179',lamp:'#FFD47B'},
  {name:'ลิ้นจี่มินต์',body:'#ED80B4',face:'#F7A2C8',belly:'#FFE0CA',fin:'#298E91',finTip:'#88E2CB',marking:'#AD447E',cheek:'#E86C91',lamp:'#FFE39A'},
  {name:'ออโรร่าออร์คิด',body:'#5CBCCF',face:'#94D7E3',belly:'#FFE2CA',fin:'#9C4AB3',finTip:'#F7A7C9',marking:'#426896',cheek:'#E894B9',lamp:'#FFE094'},
  {name:'พิทาย่าไลม์',body:'#C880DC',face:'#DFA7EB',belly:'#FFE1CA',fin:'#628D4A',finTip:'#CDE98A',marking:'#854DA3',cheek:'#EF94B2',lamp:'#FFE48E'},
  {name:'แอปริคอตโอเชียน',body:'#EEA166',face:'#F8C18A',belly:'#FFE3BA',fin:'#327CA3',finTip:'#78DCC8',marking:'#B66951',cheek:'#ED827C',lamp:'#FFD473'},
  {name:'มิดไนต์พีโอนี',body:'#7884CD',face:'#A0ADE9',belly:'#FAD1C5',fin:'#573877',finTip:'#EF82B0',marking:'#494F99',cheek:'#EB8CB3',lamp:'#FFD17A'},
] as const;
export const ELEMENT_LABELS:Record<CompanionElement,string>={earth:'ผลึก',water:'คลื่นแก้ว',wind:'แพรลม',fire:'เปลวไฟ',leaf:'ใบหยก',flower:'กลีบดอก'};
export type RemixParts={gills:CompanionElement;dorsal:CompanionElement;tail:CompanionElement;lamp:CompanionElement};
type RemixColors={name:string;body:string;face:string;belly:string;fin:string;finTip:string;marking:string;cheek:string;lamp:string};
export type RemixDesign={palette:number;parts:RemixParts;colors?:RemixColors};
const elements=Object.keys(ELEMENT_LABELS) as CompanionElement[];
export function remixArt(appearance:CompanionAppearance) {
  return appearance.previewRemix ? (appearance.previewRemix.colors??REMIX_PALETTES[appearance.previewRemix.palette]) : appearance.previewCollection ? COMPANION_COLLECTIONS[appearance.previewCollection] : null;
}
export function remixDescription(appearance:CompanionAppearance) {
  const p=appearance.previewRemix?.parts;
  return p?`เหงือก${ELEMENT_LABELS[p.gills]} · หลัง${ELEMENT_LABELS[p.dorsal]} · หาง${ELEMENT_LABELS[p.tail]} · โคม${ELEMENT_LABELS[p.lamp]}`:'';
}
/** Random choices are UI previews; saved identity and birth snapshot are never rewritten. */
export function remixPreview(base:CompanionAppearance,mode:'all'|'colors'|'parts'='all',random= Math.random):CompanionAppearance {
  const pick=<T,>(items:readonly T[])=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
  const previous=base.previewRemix;
  const originalElement=elements.includes(base.previewCollection as CompanionElement)?base.previewCollection as CompanionElement:'flower';
  const originalParts={gills:originalElement,dorsal:originalElement,tail:originalElement,lamp:originalElement};
  let parts=mode==='colors'?(previous?.parts??originalParts):{gills:pick(elements),dorsal:pick(elements),tail:pick(elements),lamp:pick(elements)};
  if(mode!=='colors'&&previous&&JSON.stringify(parts)===JSON.stringify(previous.parts))parts={...parts,tail:elements[(elements.indexOf(parts.tail)+1)%elements.length]};
  const palette=mode==='parts'&&previous?previous.palette:pick(REMIX_PALETTES.map((_,i)=>i).filter(i=>i!==previous?.palette));
  const art=mode==='parts'?(remixArt(base)??REMIX_PALETTES[palette]):REMIX_PALETTES[palette];
  const themed=collectionPreview(base,parts.gills);
  const next=mode==='all'?previewAppearance(themed,{pattern:pick(['pearl_freckles','starlight_speckles','water_ripples','petal_marks'])}):themed;
  const keepPattern=mode!=='all';
  return {...next,previewRemix:{palette,parts,colors:mode==='parts'?art:undefined},previewLamp:mode==='colors'?(base.previewLamp??COMPANION_COLLECTIONS[parts.lamp].lampShape):COMPANION_COLLECTIONS[parts.lamp].lampShape,
    palette:{...next.palette,label:art.name,body:art.body,secondary:art.fin,lamp:art.lamp},
    traits:keepPattern?base.traits:next.traits,patternSeed:keepPattern?base.patternSeed:Math.floor(random()*1000000)};
}

export function selectRemixPalette(base:CompanionAppearance,index:number):CompanionAppearance {
  const art=REMIX_PALETTES[index];
  if(!art) return base;
  const next=remixPreview(base,'colors');
  return {...next,previewRemix:{...next.previewRemix!,palette:index,colors:undefined},palette:{...next.palette,label:art.name,body:art.body,secondary:art.fin,lamp:art.lamp}};
}
