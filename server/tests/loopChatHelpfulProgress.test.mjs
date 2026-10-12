import assert from 'node:assert/strict';
import { prepareLoopChat, applyLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.ts';
const u = content => ({role:'user',content});
const a = content => ({role:'assistant',content});
const base = {assistant_message:'ลองบอกว่า วันนี้รับเพิ่มได้หนึ่งงาน ขอให้ช่วยเลือกงานด่วนที่สุด', safety_state:'normal',mode:'HOLD',capacity:'medium',user_intent:'decide',readiness:'story'};
const guided = {mode:'guided',asked:'needs',fields:{trigger:'หัวหน้าเพิ่มงาน'},skipped:[],nextOfferAt:2};
for (const input of ['ถามวนแล้ว ช่วยตอบตรงๆ','ช่วยร่างข้อความให้หน่อย','มีทางอื่นอีกไหม']) {
  const c = prepareLoopChat([u('หัวหน้าเพิ่มงาน'),a('เธอต้องการอะไร'),u(input)],guided);
  assert.equal(c.actionGuidanceRequested,true);
  const t = applyLoopChat(c,{directAnswer:true},base);
  assert.equal(t.assistant_message,base.assistant_message);
  assert.deepEqual(t.quick_replies,[]);
  assert.equal(t.loop_guide.fields.micro_action,undefined);
}
const follow = applyLoopChat(prepareLoopChat([u('เคยลองแล้ว เขาไม่ทำตาม')],{...guided,asked:'options',actionPlanning:true}),{directAnswer:true},base);
assert.equal(follow.assistant_message,base.assistant_message);
const advice={needed:true,options:['ขอให้หัวหน้าจัดลำดับงาน','แจ้งเวลาที่แต่ละงานต้องใช้'],recommendation:'แจ้งเวลาที่แต่ละงานต้องใช้',reason:'เห็นข้อจำกัดชัด'};
const proactive=applyLoopChat(prepareLoopChat([u('หัวหน้าเพิ่มงาน'),a('เหลือเวลาเท่าไหร่'),u('เหลือสองชั่วโมง แต่งานเดิมก็ยังไม่เสร็จ')],{...guided,mode:'listening'}),{actionGuidance:advice},base);
assert.match(proactive.assistant_message,/แจ้งเวลาที่แต่ละงานต้องใช้/);
assert.equal(proactive.loop_guide.actionPlanning,true);
const vent=applyLoopChat(prepareLoopChat([u('ไม่ต้องแนะนำ แค่อยากระบายก่อน')],guided),{actionGuidance:advice},{...base,assistant_message:'เล่าต่อได้ เราฟังอยู่'});
assert.equal(vent.loop_guide.mode,'listening');
assert.equal(vent.loop_guide.actionPlanning,false);
assert.equal(vent.assistant_message,'เล่าต่อได้ เราฟังอยู่');
const crisis=applyLoopChat(prepareLoopChat([u('ช่วยตอบตรงๆ')],guided),{directAnswer:true},{...base,safety_state:'crisis',assistant_message:'safety first'});
assert.equal(crisis.assistant_message,'safety first');
console.log('PASS: direct answers, failed-advice follow-up, proactive options, vent-only and safety precedence');
