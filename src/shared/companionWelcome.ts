export function welcomeName(value:unknown):string {
  if(typeof value!=='string')throw new Error('กรุณาตั้งชื่อให้น้อง');
  const name=value.trim();
  if(!name||Array.from(name).length>40||/[\u0000-\u001f\u007f]/.test(name))throw new Error('ตั้งชื่อได้ 1–40 ตัวอักษร');
  return name;
}
export function needsCompanionWelcome(companion:{stage?:number;snapshot?:unknown}|null|undefined):boolean {
  if(!companion||!companion.stage)return false;
  const snapshot=companion.snapshot as {dna_json?:{collectibleDesign?:{edition?:string}};stats_summary_json?:{welcomedAt?:string}}|undefined;
  return snapshot?.dna_json?.collectibleDesign?.edition==='v1'&&!snapshot.stats_summary_json?.welcomedAt;
}
