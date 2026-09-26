import { collectionPreview, COMPANION_COLLECTIONS } from './companionArtDirection';
import { previewAppearance, type CompanionAppearance } from './companionAppearance';
import type { CompanionElement } from './companionElements';

import { REMIX_PALETTES, ELEMENT_LABELS } from './companionDesignCatalog';
export { REMIX_PALETTES, ELEMENT_LABELS } from './companionDesignCatalog';
export type { RemixParts, RemixDesign } from './companionDesignCatalog';
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
