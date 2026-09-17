import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real review builder, including its scope rules, rather than a copy.
const source = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  const prepareLoopReviewData = () => {');
const end = source.indexOf('  const handleOpenLoopReview =', start);
assert(start >= 0 && end > start, 'Review builder must be present');
const builder = stripTypeScriptTypes(`function review(messages: any[], serverExtractedLoop: any = null) {
  const UNEXPLORED = 'ยังไม่ได้สำรวจ';
  ${source.slice(start, end)}
  return prepareLoopReviewData();
}`);
const review = new Function(`${builder}; return review;`)();
const user = text => ({ role: 'user', text });
const initial = user('วันนี้หัวหน้าขอให้แก้งานสองจุด ฉันรู้สึกเสียใจและแน่นหน้าอก คิดว่าตัวเองไม่เก่ง');
const clarification = user('ขอคุยต่อก่อน ข้อเท็จจริงคือหัวหน้าขอแก้เอกสารสองจุด เขาไม่ได้บอกว่าฉันไม่เก่ง ฉันอยากรู้ว่าต้องปรับตรงไหน จะลองถามเขาให้ชัด การแก้งานไม่ได้แปลว่าฉันไม่มีความสามารถ');
const result = review([initial, clarification, user('ตอนนี้เบาลงแล้ว ช่วยสรุปแล้วบันทึกลูปนี้ไว้')]);
assert.equal(result.trigger, 'วันนี้หัวหน้าขอให้แก้งานสองจุด');
assert.equal(result.emotionOrBody, 'เสียใจและแน่นหน้าอก');
assert.equal(result.automaticStory, 'คิดว่าตัวเองไม่เก่ง');
assert.match(result.facts, /ข้อเท็จจริงคือหัวหน้าขอแก้เอกสารสองจุด/);
assert.match(result.microAction, /^จะลองถามเขาให้ชัด/);
assert.equal(result.options, 'ยังไม่ได้สำรวจ');
assert.equal(result.conversationStatus, 'complete_loop');

const newTopic = review([initial, clarification, user('วันนี้เพื่อนยกเลิกนัด')]);
assert.equal(newTopic.trigger, 'วันนี้เพื่อนยกเลิกนัด');
assert.equal(newTopic.emotionOrBody, 'ยังไม่ได้สำรวจ');
assert.equal(newTopic.automaticStory, 'ยังไม่ได้สำรวจ');
assert.equal(newTopic.conversationStatus, 'partial_loop');

const firstFacts = review([user('ข้อเท็จจริงคือหัวหน้าส่งงานกลับมา ฉันรู้สึกเศร้า')]);
assert.match(firstFacts.trigger, /หัวหน้าส่งงานกลับมา/);
assert.equal(firstFacts.emotionOrBody, 'เศร้า');
assert.equal(review([user('วันนี้งานเยอะจนกังวล อยากค่อย ๆ เริ่มทีละอย่าง')]).emotionOrBody, 'กังวล');
assert.equal(review([user('ตอนนี้ฉันเครียดมาก')]).emotionOrBody, 'เครียด');
for (const text of ['เพื่อนงานเยอะจนกังวล', 'วันนี้ไม่กังวลแล้ว', 'ถ้างานเยอะจนกังวลจะทำอย่างไร', 'กังวลไหม']) {
  assert.equal(review([user(text)]).emotionOrBody, 'ยังไม่ได้สำรวจ', text);
}
console.log('PASS: factual clarification retains prior emotion/story; new topic stays isolated; first factual turn works.');
