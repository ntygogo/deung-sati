import assert from 'node:assert/strict';
import { prepareLoopChat, applyLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.ts';
const u = content => ({role:'user',content});
const base = {assistant_message:'เราฟังอยู่',safety_state:'normal',mode:'HOLD',capacity:'medium',user_intent:'vent',readiness:'story'};
function extracted(source, key, quote) {
  return applyLoopChat(prepareLoopChat([u(source)]), {loopTrace:{[key]:{quote}}}, base).loop_guide.fields[key];
}
for (const [source,key,quote] of [
  ['ทุกคนคิดว่าเราต้องเศร้า แต่เราโล่ง','automatic_story','ทุกคนคิดว่าเราต้องเศร้า'],
  ['ทุกคนคิดว่าเราต้องเศร้า แต่เราโล่ง','automatic_story','เราต้องเศร้า'],
  ['เพื่อนบอกว่าเราใจดำ แต่เราไม่ได้คิดแบบนั้น','automatic_story','เราใจดำ'],
  ['มีตัวอย่างทางเลือกที่เล็กกว่านี้ไหม','options','ทางเลือกที่เล็กกว่านี้'],
  ['ขอประโยคที่จะพูดกับหัวหน้าหน่อย','micro_action','พูดกับหัวหน้า'],
  ['วันนี้เรียกว่าอึดอัดไว้ก่อนก็พอ','needs','เรียกว่าอึดอัดไว้ก่อน'],
  ['ฉันคิดว่าเขาไม่สนใจ','facts','เขาไม่สนใจ'],
  ['คิดว่าเขาไม่สนใจ','facts','คิดว่าเขาไม่สนใจ'],
  ['ส่งข้อความถามดีไหม','micro_action','ส่งข้อความถามดีไหม'],
]) assert.equal(extracted(source,key,quote),undefined,`${key}: ${source}`);

for (const [source,key,quote] of [
  ['ทุกคนคิดว่าเราต้องเศร้า แต่เราเลยคิดว่าเราผิดปกติ','automatic_story','เราผิดปกติ'],
  ['เพื่อนบอกว่าเราใจดำ ตอนนั้นคิดว่าเราแย่จริง','automatic_story','เราแย่จริง'],
  ['เราอยากพักโดยไม่ถูกขัด มีตัวอย่างทางเลือกไหม','needs','เราอยากพักโดยไม่ถูกขัด'],
  ['ขอตัวอย่างหน่อย แต่เราอาจลองขอเวลาสิบนาที','options','เราอาจลองขอเวลาสิบนาที'],
  ['ส่งข้อความถามดีไหม','options','ส่งข้อความถามดีไหม'],
  ['หัวหน้าบอกให้แก้งานสองจุด','facts','หัวหน้าบอกให้แก้งานสองจุด'],
  ['จะขอเวลาพักสิบนาที','micro_action','จะขอเวลาพักสิบนาที'],
  ['อยากให้เขารับฟังโดยไม่ตัดสิน','needs','อยากให้เขารับฟังโดยไม่ตัดสิน'],
]) assert.equal(extracted(source,key,quote),quote,`${key}: ${source}`);

const stale = {mode:'guided',asked:'needs',fields:{trigger:'เลิกกัน',emotion_or_body:'โล่ง',automatic_story:'เราต้องเศร้า'},skipped:[],nextOfferAt:2};
const cleaned = prepareLoopChat([u('เลิกกัน ทุกคนคิดว่าเราต้องเศร้า แต่เราโล่ง')], stale);
assert.equal(cleaned.state.fields.automatic_story,undefined,'Recheck cached excerpts against their speaker.');
assert.equal(cleaned.state.fields.emotion_or_body,'โล่ง');
const safety = applyLoopChat(cleaned,{}, {...base,safety_state:'crisis',assistant_message:'safety response'});
assert.equal(safety.assistant_message,'safety response');
const listening = applyLoopChat(prepareLoopChat([u('หัวหน้าเรียกคุย อึดอัด')]),{}, {...base,quick_replies:['ตอนเขาพูดเรื่องกำหนดส่งงาน']});
assert.deepEqual(listening.quick_replies,[],'Do not suggest invented first-person details in listening chips.');
const mixed='เขาบอกให้แก้งานสองจุด ฉันคิดว่างานแค่นี้ยังทำไม่ดีเลย อยากสำรวจ';
const entered = applyLoopChat(prepareLoopChat([u(mixed)]),{loopTrace:{trigger:{quote:'เขาบอกให้แก้งานสองจุด'},automatic_story:{quote:'ฉันคิดว่างานแค่นี้ยังทำไม่ดีเลย'}}},base);
assert.equal(entered.loop_guide.mode,'guided');
assert.equal(entered.loop_guide.fields.trigger,'เขาบอกให้แก้งานสองจุด');
assert.equal(entered.loop_guide.fields.automatic_story,'ฉันคิดว่างานแค่นี้ยังทำไม่ดีเลย');
assert.doesNotMatch(entered.assistant_message,/ตอนนี้อยากระบายต่อ/);
for(const text of ['เพื่อนบอกว่า อยากสำรวจ','เขาถามว่า อยากสำรวจ','ไม่อยากสำรวจ','ไม่ได้อยากสำรวจ','อยากสำรวจแต่ยังไม่พร้อม']) assert.notEqual(prepareLoopChat([u(text)]).state.mode,'guided',text);
const unsure = applyLoopChat(prepareLoopChat([u('เพื่อนลืมวันเกิด'),u('น้อยใจนิดนึงมั้ง ยังไม่แน่ใจ')]),{loopTrace:{trigger:{quote:'เพื่อนลืมวันเกิด'}},loopSummary:'เธอน้อยใจเพราะอยากให้เพื่อนใส่ใจ'},base);
assert.doesNotMatch(unsure.assistant_message,/เธอน้อยใจเพราะ/);
console.log('PASS: source speaker, help requests, label preferences, proposals versus commitments, facts and cached-field cleanup.');
