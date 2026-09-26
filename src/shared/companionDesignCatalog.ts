import type { CompanionElement } from './companionElements';

// Frozen v1 catalog: do not reorder or replace entries once issued.
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
export type RemixColors={name:string;body:string;face:string;belly:string;fin:string;finTip:string;marking:string;cheek:string;lamp:string};
export type RemixDesign={palette:number;parts:RemixParts;colors?:RemixColors};
