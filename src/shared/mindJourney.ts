export const MOODS = ['สงบ','ดีใจ','มีหวัง','เศร้า','กังวล','โกรธ','เหงา','เหนื่อย','ยังบอกไม่ถูก'] as const;
export const OUTCOMES = ['ยังไม่เจอสถานการณ์เดิม','รู้ตัวหลังเหตุการณ์','รู้ตัวระหว่างเกิด','ลองตอบสนองใหม่แล้ว','ยังติดขัด อยากปรับวิธี'] as const;
export type JourneyData = {kind:'checkin'|'loop'; day:string; emotions:string[]; intensity:number; event:string; story:string; response:string; consequence:string; need:string; needConfirmed:boolean; care:string; plan:string; outcome:string; reflection:string};
export type JourneyEntry = JourneyData & {id:string; revision:number; createdAt:string; updatedAt:string};
export function localDay(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function emptyJourney(kind:JourneyData['kind']='checkin'):JourneyData {return {kind,day:localDay(),emotions:[],intensity:3,event:'',story:'',response:'',consequence:'',need:'',needConfirmed:false,care:'',plan:'',outcome:'',reflection:''};}
export function validateJourney(value:unknown):JourneyData {
 if(!value || typeof value!=='object')throw new Error('ข้อมูลไม่ถูกต้อง');
 const v=value as JourneyData;
 if(!['checkin','loop'].includes(v.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(v.day)||Number.isNaN(Date.parse(v.day))||new Date(v.day).toISOString().slice(0,10)!==v.day)throw new Error('วันที่ไม่ถูกต้อง');
 if(!Array.isArray(v.emotions)||v.emotions.length>MOODS.length||new Set(v.emotions).size!==v.emotions.length||v.emotions.some(e=>!MOODS.includes(e as typeof MOODS[number])))throw new Error('เลือกอารมณ์จากรายการ');
 if(!Number.isInteger(v.intensity)||v.intensity<1||v.intensity>5||typeof v.needConfirmed!=='boolean')throw new Error('ข้อมูลความรู้สึกไม่ถูกต้อง');
 const result=emptyJourney(v.kind);result.day=v.day;result.emotions=v.emotions;result.intensity=v.intensity;result.needConfirmed=v.needConfirmed;
 for(const key of ['event','story','response','consequence','need','care','plan','outcome','reflection'] as const){if(typeof v[key]!=='string'||v[key].length>2000)throw new Error('แต่ละช่องเขียนได้ไม่เกิน 2,000 ตัวอักษร');result[key]=v[key].trim();}
 if(v.kind==='checkin'&&!v.emotions.length)throw new Error('เลือกอารมณ์ หรือยังบอกไม่ถูก');
 if(v.kind==='loop'&&!result.event)throw new Error('เล่าเหตุการณ์สั้น ๆ ก่อนบันทึก');
 if(result.outcome&&!OUTCOMES.includes(result.outcome as typeof OUTCOMES[number]))throw new Error('ผลการลองไม่ถูกต้อง');
 if(!result.need)result.needConfirmed=false;
 return result;
}
export function journeyChat(entry:JourneyData){return `อยากคุยต่อจากบันทึกของฉัน วันที่ ${entry.day}\n${[['เหตุการณ์',entry.event],['อารมณ์',entry.emotions.join(', ')],['สิ่งที่ฉันตีความ',entry.story],['การตอบสนองเดิม',entry.response],['ผลที่ตามมา',entry.consequence],['ความต้องการ'+(entry.needConfirmed?'ที่ฉันยืนยันแล้ว':'ที่ยังไม่แน่ใจ'),entry.need],['สิ่งที่อยากลอง',entry.plan],['ผลการลอง',entry.outcome],['สิ่งที่เรียนรู้',entry.reflection]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n')}\nช่วยรับฟังและต่อยอดจากตรงนี้ ไม่ต้องถามข้อมูลเดิมซ้ำ ถ้ายังไม่ชัดช่วยสำรวจทีละนิด โดยไม่สรุปความต้องการแทนฉัน`}
