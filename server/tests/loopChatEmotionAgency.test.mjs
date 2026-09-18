import assert from 'node:assert/strict';
import { prepareLoopChat, applyLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.ts';
const u=content=>({role:'user',content});
const base={assistant_message:'คำตอบต่อคำถามของเธอ',safety_state:'normal',mode:'HOLD',capacity:'medium',user_intent:'vent',readiness:'story'};
const old={mode:'guided',fields:{trigger:'เพื่อนไม่ชวน',emotion_or_body:'น้อยใจ',automatic_story:'เราไม่สำคัญ',facts:'เพื่อนไปกินข้าว'},skipped:[],asked:'needs',nextOfferAt:2};
for(const [source,quote] of [
  ['ไม่ได้โกรธ แค่รำคาญ','โกรธ'],['ไม่โกรธ','โกรธ'],
  ['ไม่รู้ว่าเศร้าหรือโกรธ','เศร้า'],['ไม่รู้ว่าเศร้าหรือโกรธ','โกรธ'],
  ['อย่าบอกว่าเรากลัวนะ','กลัว'],['เพื่อนโกรธ แต่เราเฉย ๆ','โกรธ'],
  ['มันน้อยใจนิดนึงมั้ง','น้อยใจ'],['ตอนแรกคิดว่าโกรธ แต่ยังไม่แน่ใจ','โกรธ'],
  ['คำว่าอึดอัดเราก็ยังไม่แน่ใจนะ','อึดอัด'],['ไม่ได้เศร้า มันโล่งมากกว่า','ไม่ได้เศร้า'],
]) {
  const r=applyLoopChat(prepareLoopChat([u(source)]),{loopTrace:{emotion_or_body:{quote}}},base);
  assert.equal(r.loop_guide.fields.emotion_or_body,undefined,source+' -> '+quote);
}
for(const [source,quote] of [
  ['ไม่ได้โกรธ แค่รำคาญ','รำคาญ'],['ไม่รู้ชื่อ แต่ตื้อ ๆ','ตื้อ ๆ'],
  ['มันน้อยใจนิดนึงมั้ง','น้อยใจนิดนึงมั้ง'],['ไม่ได้เศร้า มันโล่งมากกว่า','โล่ง'],
  ['ดีใจกับเพื่อน แต่ในอกหวิว ๆ','ดีใจกับเพื่อน แต่ในอกหวิว ๆ'],
  ['ตอนนี้รู้สึกไม่สบายใจ','ไม่สบายใจ'],
]) {
  const r=applyLoopChat(prepareLoopChat([u(source)]),{loopTrace:{emotion_or_body:{quote}}},base);
  assert.equal(r.loop_guide.fields.emotion_or_body,quote,source);
}
const history=[u('น้อยใจ'),u('ขอถอนคำว่าน้อยใจก่อน ตอนนี้ยังไม่แน่ใจทั้งโกรธทั้งน้อยใจ รู้แค่ว่าจุก')];
const withdrawn=applyLoopChat(prepareLoopChat(history,old),{loopTrace:{emotion_or_body:{quote:'น้อยใจ'}}},base);
assert.equal(withdrawn.loop_guide.fields.emotion_or_body,undefined);
const continued=applyLoopChat(prepareLoopChat([...history,u('อยากให้ฟังก่อน')],withdrawn.loop_guide),{loopTrace:{emotion_or_body:{quote:'น้อยใจ'}}},base);
assert.equal(continued.loop_guide.fields.emotion_or_body,undefined,'An old label must not return on the next turn.');
const replaced=applyLoopChat(prepareLoopChat(history,old),{loopTrace:{emotion_or_body:{quote:'จุก'}}},base);
assert.equal(replaced.loop_guide.fields.emotion_or_body,'จุก');
const reendorsed=applyLoopChat(prepareLoopChat([...history,u('ตอนนี้รู้แล้วว่าเราน้อยใจ')],replaced.loop_guide),{loopTrace:{emotion_or_body:{quote:'น้อยใจ'}}},base);
assert.equal(reendorsed.loop_guide.fields.emotion_or_body,'น้อยใจ','Users may change their own description again.');
assert.equal(prepareLoopChat([u('เพื่อนบอกว่าไม่ได้โกรธ')],old).state.fields.emotion_or_body,'น้อยใจ');
for(const [previous,text] of [['รำคาญ','อยากสำรวจ แต่ไม่เอาคำว่าโกรธนะ'],['ค้างคา','อยากสำรวจ แต่อย่าเพิ่งสรุปว่าหึง']]) {
  const r=applyLoopChat(prepareLoopChat([u(previous),u(text)],{...old,fields:{...old.fields,emotion_or_body:previous}}),{},base);
  assert.equal(r.loop_guide.fields.emotion_or_body,previous,'Keep a descriptor the user has not rejected.');
}
const preferred='อยากสำรวจ แต่ขอใช้คำว่าเจ็บ ๆ กับอายก่อนได้ไหม';
const preferredResult=applyLoopChat(prepareLoopChat([u('เสียใจ'),u(preferred)],{...old,fields:{...old.fields,emotion_or_body:'เสียใจ'}}),{loopTrace:{emotion_or_body:{quote:'เจ็บ ๆ กับอาย'}}},base);
assert.equal(preferredResult.loop_guide.fields.emotion_or_body,'เจ็บ ๆ กับอาย');
const embeddedListen=applyLoopChat(prepareLoopChat([u('รำคาญไง บอกไปแล้ว อยากให้ฟังก่อน ไม่ต้องถามให้เลือกใหม่')],old),{},base);
assert.equal(embeddedListen.loop_guide.mode,'listening');
assert.deepEqual(embeddedListen.quick_replies,[]);
const skipChoices=applyLoopChat(prepareLoopChat([u('ยังไม่พร้อมคิดทางเลือก ขอข้ามข้อนี้ก่อน')],old),{},base);
assert.equal(skipChoices.loop_guide.asked,'reflection');
for(const text of ['อยากสำรวจ แต่ไม่เอาคำว่าโกรธนะ','อยากสำรวจ แต่อย่าเพิ่งสรุปว่าอิจฉา','อยากสำรวจ แต่ยังไม่รู้ว่าอารมณ์คืออะไร']) {
  assert.equal(prepareLoopChat([u(text)],{...old,mode:'offered'}).state.mode,'guided',text);
}
for(const text of ['อยากสำรวจ แต่วันนี้ยังไม่พร้อม','อยากสำรวจ แต่เปลี่ยนใจแล้ว']) {
  assert.notEqual(prepareLoopChat([u(text)],{...old,mode:'offered'}).state.mode,'guided',text);
}
for(const text of ['ถ้ายอมรับว่าเสียใจแปลว่าอ่อนแอไหม','ขอแค่ตัวอย่างประโยคที่จะถามหัวหน้า']) {
  const r=applyLoopChat(prepareLoopChat([u('งานไม่ผ่าน'),u(text)],{...old,mode:'listening'}),{},base);
  assert.equal(r.assistant_message,base.assistant_message,'Answer the question before offering navigation.');
}
const stopped=applyLoopChat(prepareLoopChat([u('วันนี้พอก่อน ขอบคุณที่ช่วยประโยคนี้โดยไม่ต้องรู้ชื่ออารมณ์')],old),{},base);
assert.deepEqual(stopped.quick_replies,[]);
assert.doesNotMatch(stopped.assistant_message,/ไหม|หรือ/);
console.log('PASS: user authority over emotion words, negation, uncertainty, correction persistence, self-revision, boundaries and direct questions.');
