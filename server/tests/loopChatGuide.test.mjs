import assert from 'node:assert/strict';
import { prepareLoopChat, applyLoopChat, loopChatReview, LOOP_CHAT_FIELDS, LOOP_CHAT_START, LOOP_CHAT_VENT, LOOP_CHAT_SKIP } from '../../src/shared/chat-protocol/loopChatGuide.ts';
const base = { assistant_message: 'รับฟังอยู่', safety_state: 'normal', mode: 'HOLD', capacity: 'medium', user_intent: 'vent', readiness: 'story' };
const u = content => ({role:'user',content});
const event = 'หัวหน้าขอแก้งานสองจุด';
const feeling = 'เสียใจ';
let messages = [u(event)];
let turn = applyLoopChat(prepareLoopChat(messages), {loopTrace:{trigger:{quote:event}}}, base);
assert.equal(turn.loop_guide.mode,'listening');
messages.push(u(feeling));
turn = applyLoopChat(prepareLoopChat(messages,turn.loop_guide), {loopTrace:{emotion_or_body:{quote:feeling}},loopSummary:'งานถูกขอแก้และเธอเสียใจ'}, base);
assert.equal(turn.loop_guide.mode,'offered');
assert.deepEqual(turn.quick_replies,[LOOP_CHAT_VENT,LOOP_CHAT_START]);
const declined = applyLoopChat(prepareLoopChat([...messages,u(LOOP_CHAT_VENT)],turn.loop_guide),{},base);
assert.equal(declined.loop_guide.mode,'listening');
assert.equal(applyLoopChat(prepareLoopChat([...messages,u(LOOP_CHAT_VENT),u('อยากเล่าอีกนิด')],declined.loop_guide),{},base).loop_guide.mode,'listening');
messages.push(u(LOOP_CHAT_START));
turn=applyLoopChat(prepareLoopChat(messages,turn.loop_guide),{},base);
assert.equal(turn.loop_guide.asked,'automatic_story');
const answers={automatic_story:'คิดว่าฉันไม่เก่ง',facts:'เอกสารมีจุดแก้สองแห่ง',needs:'อยากได้คำแนะนำที่ชัดเจน',options:'ถามหัวหน้าหรือเปิดคู่มือ',micro_action:'จะถามรายละเอียดพรุ่งนี้',reflection:'การแก้งานไม่ใช่การตัดสินคุณค่าตัวเอง'};
for(const [key,quote] of Object.entries(answers)){
  assert.equal(turn.loop_guide.asked,key);
  messages.push(u(quote));
  turn=applyLoopChat(prepareLoopChat(messages,turn.loop_guide),{loopTrace:{[key]:{quote}}},base);
}
assert.equal(turn.loop_guide.mode,'review');
assert.equal(LOOP_CHAT_FIELDS.filter(k=>turn.loop_guide.fields[k]).length,8);
assert.equal(loopChatReview(turn.loop_guide).microAction,answers.micro_action);
assert.equal(loopChatReview(turn.loop_guide).needs,answers.needs);
// Evidence from the assistant or invented text must never populate a trace.
const rejected=applyLoopChat(prepareLoopChat([u(event),{role:'assistant',content:'คุณคงเสียใจ'}]),{loopTrace:{emotion_or_body:{quote:'คุณคงเสียใจ'},needs:{quote:'ต้องการการยอมรับ'}}},base);
assert.equal(rejected.loop_guide.fields.emotion_or_body,undefined);
assert.equal(rejected.loop_guide.fields.needs,undefined);
// Explicitly skipped fields stay blank and do not trap the user on the same question.
const skippedContext=prepareLoopChat([u(event),u(LOOP_CHAT_SKIP)],{mode:'guided',fields:{trigger:event},asked:'emotion_or_body',skipped:[],nextOfferAt:2});
const skipped=applyLoopChat(skippedContext,{},base);
assert.equal(skipped.loop_guide.asked,'automatic_story');
assert.equal(loopChatReview(skipped.loop_guide).emotionOrBody,'ยังไม่ได้สำรวจ');
const newTopic=applyLoopChat(prepareLoopChat([...messages,u('เปลี่ยนเรื่อง เพื่อนยกเลิกนัด')],turn.loop_guide),{newLoopTopic:true,loopTrace:{trigger:{quote:'เพื่อนยกเลิกนัด'}}},base);
assert.deepEqual(newTopic.loop_guide.fields,{trigger:'เพื่อนยกเลิกนัด'});
const crisis=applyLoopChat(prepareLoopChat(messages,turn.loop_guide),{}, {...base,safety_state:'crisis'});
assert.equal(crisis.loop_guide,undefined);
console.log('PASS: offer, consent/decline, all eight fields, quote grounding, skip, topic reset and safety precedence.');
