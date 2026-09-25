import assert from 'node:assert/strict';
import { prepareLoopChat, applyLoopChat } from '../../src/shared/chat-protocol/loopChatGuide.ts';

const u = content => ({ role: 'user', content });
const a = content => ({ role: 'assistant', content });
const base = {
  assistant_message: 'ตอนนี้อยากลองมองอะไรต่อ?',
  safety_state: 'normal',
  mode: 'HOLD',
  capacity: 'medium',
  user_intent: 'decide',
  readiness: 'story',
};
const guidance = {
  needed: true,
  reflection: 'หลังเลิกงานเธออยากพักและอยู่กับแมว แต่ก็ยังอยากดูแลร่างกาย',
  options: [
    'ยืดตัวหรือเดินในห้อง 5 นาที แล้วไปเล่นกับแมว',
    'เล่นกับแมวก่อน 15 นาที แล้วค่อยดูว่ายังมีแรงขยับไหม',
    'พักวันนี้ และกำหนดเวลาออกกำลังกายพรุ่งนี้ให้ชัด',
  ],
  recommendation: 'ยืดตัวหรือเดินในห้องเพียง 5 นาที',
  reason: 'ได้เริ่มดูแลตัวเองโดยไม่แย่งเวลาพัก',
  question: 'ทางนี้พอทำไหวไหม หรืออยากเลือกอีกทาง?',
};

const history = [
  u('หลังเลิกงานอยากนอนและอยากเล่นกับแมว'),
  a('หลังเลิกงานเธอคงอยากพัก'),
  u('ต้องทำยังไง'),
];
const advised = applyLoopChat(prepareLoopChat(history), { actionGuidance: guidance }, base);
assert.equal(advised.loop_guide.mode, 'guided');
assert.equal(advised.loop_guide.asked, 'options');
assert.equal(advised.loop_guide.actionPlanning, true);
assert.match(advised.assistant_message, /1\. ยืดตัวหรือเดินในห้อง 5 นาที/);
assert.match(advised.assistant_message, /เราแนะนำให้เริ่มจาก.*5 นาที/);
assert.match(advised.assistant_message, /เพราะได้เริ่มดูแลตัวเอง/);
assert.deepEqual(advised.quick_replies, guidance.options);

const reflectionGuide = {
  mode: 'guided',
  fields: { trigger: 'หลังเลิกงาน', emotion_or_body: 'เหนื่อย', options: 'ออกกำลังกาย' },
  skipped: [],
  asked: 'reflection',
  nextOfferAt: 2,
};
const overridden = applyLoopChat(
  prepareLoopChat([u('ต้องทำยังไง ช่วยแนะนำหน่อย')], reflectionGuide),
  { guideSupport: { needed: true, message: 'ลองมองย้อนดูอีกที' }, actionGuidance: guidance },
  base,
);
assert.equal(overridden.loop_guide.asked, 'options');
assert.match(overridden.assistant_message, /เราแนะนำให้เริ่มจาก/);
assert.doesNotMatch(overridden.assistant_message, /ลองมองย้อนดูอีกที/);

const picked = applyLoopChat(
  prepareLoopChat([...history, a(advised.assistant_message), u(guidance.options[0])], advised.loop_guide),
  {
    loopTrace: { options: { quote: guidance.options[0] } },
    loopSummary: 'เธอเลือกขยับร่างกายสั้น ๆ ก่อนพัก',
    guideQuestion: { field: 'micro_action', message: 'ถ้าจะให้เริ่มง่ายที่สุด วันนี้ลองเดิน 5 นาทีทันทีที่กลับถึงบ้านดีไหม?' },
  },
  base,
);
assert.equal(picked.loop_guide.fields.options, guidance.options[0]);
assert.equal(picked.loop_guide.asked, 'micro_action');
assert.match(picked.assistant_message, /วันนี้ลองเดิน 5 นาที/);
assert.doesNotMatch(picked.assistant_message, /ก่อนรู้สึกแบบนี้/);

const fallback = applyLoopChat(prepareLoopChat([u('ช่วยคิดทางออกให้หน่อย')]), {}, base);
assert.match(fallback.assistant_message, /1\. ลดสิ่งที่จะทำให้เล็ก/);
assert.match(fallback.assistant_message, /เราแนะนำให้เริ่มจาก/);
assert.equal(fallback.loop_guide.actionPlanning, true);

const actionHelp = applyLoopChat(
  prepareLoopChat([u('ยังไม่รู้ ช่วยไกด์หน่อย')], { ...reflectionGuide, asked: 'micro_action' }),
  { actionGuidance: guidance },
  base,
);
assert.match(actionHelp.assistant_message, /เราแนะนำให้เริ่มจาก/);

const actionQuestion = applyLoopChat(
  prepareLoopChat([u('โอเค')], { ...reflectionGuide, asked: 'options', actionPlanning: true, fields: { trigger: 'หลังเลิกงาน' } }),
  { guideQuestion: { field: 'options', message: 'ตอนนี้อยากลองพักก่อนหรือขยับร่างกายสั้น ๆ?' } },
  base,
);
assert.deepEqual(actionQuestion.quick_replies, ['ขอตัวเลือกที่ทำได้จริง', 'เลือกให้หน่อย', 'ขอพักก่อน']);

const paused = applyLoopChat(
  prepareLoopChat([u('ขอพักก่อน')], advised.loop_guide),
  {},
  base,
);
assert.equal(paused.loop_guide.mode, 'listening');
assert.equal(paused.loop_guide.actionPlanning, false);

for (const text of ['เขาถามว่าต้องทำยังไง', 'ไม่ต้องแนะนำ แค่อยากให้ฟังก่อน']) {
  const result = applyLoopChat(prepareLoopChat([u(text)]), { actionGuidance: guidance }, base);
  assert.doesNotMatch(result.assistant_message, /เราแนะนำให้เริ่มจาก/, text);
}

const safety = applyLoopChat(prepareLoopChat([u('ต้องทำยังไง')]), { actionGuidance: guidance }, { ...base, safety_state: 'crisis', assistant_message: 'safety first' });
assert.equal(safety.assistant_message, 'safety first');

console.log('PASS: explicit requests receive concrete options, one recommendation, and an action-sized next step without restarting discovery.');
