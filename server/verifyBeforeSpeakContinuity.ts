import { streamChatResponse } from './aiProvider.js';

async function testContinuity() {
  console.log('=== Verifying Before Speak Immediate Post-Exercise Continuity ===\n');

  const messages = [
    { role: 'user', content: 'กูไม่ไหวแล้ว เขาอ่านไม่ตอบเลย โคตรหงุดหงิด' },
    { role: 'assistant', content: 'มันชวนให้หงุดหงิดและกระวนกระวายใจจริงๆ ที่เห็นเขาอ่านแล้วเงียบไป ลองหยุดเกลาคำพูดก่อนส่งไหม เพื่อช่วยเรียบเรียงสิ่งที่เราอยากสื่อจริงๆ' },
  ];

  const exerciseResult = {
    type: 'exercise_result',
    exercise_id: 'before_speak',
    timing: 'immediate',
    result: {
      completed: true,
      outcome: 'better',
      user_inputs: {
        raw_message: 'ทำไมอ่านแล้วไม่ตอบ กูโคตรไม่โอเคเลย',
        feeling: 'โกรธ น้อยใจ และอึดอัดที่ต้องรอ',
        core_need: 'ต้องการความชัดเจนในการสื่อสารและอยากรู้สึกว่าอีกฝ่ายให้ความสำคัญ',
        observable_fact: 'ข้อความขึ้นสถานะอ่านแล้ว แต่ยังไม่มีการตอบกลับ',
        refined_message: 'เห็นว่าอ่านแล้วนะ แต่ยังไม่ตอบ เราเลยรู้สึกไม่ค่อยดีเท่าไหร่ มีอะไรติดขัดหรือยุ่งอยู่หรือเปล่า บอกกันหน่อยได้ไหม',
      },
    },
    summary_text: '[กรองคำก่อนพูด]\n- สิ่งที่อยากพูดตอนแรก: "ทำไมอ่านแล้วไม่ตอบ กูโคตรไม่โอเคเลย"\n- สิ่งที่อยากสื่อจริงๆ: ต้องการความชัดเจนในการสื่อสาร\n- ลองพูดแบบนี้ได้: "เห็นว่าอ่านแล้วนะ แต่ยังไม่ตอบ..."',
  };

  let assistantText = '';
  let meta: any = null;

  await streamChatResponse({
    messages,
    exerciseResult: exerciseResult as any,
    onAssistantToken: (t) => { assistantText += t; },
    onAssistantMeta: (m) => { meta = m; },
    onDone: (text, _source, fullTurn) => {
      assistantText = text;
      meta = fullTurn;
    },
    onError: (err) => {
      console.error('Stream error:', err);
      process.exit(1);
    },
  });

  console.log('AI Response after Before Speak:');
  console.log(`"${assistantText}"\n`);
  console.log('Mode:', meta?.mode);
  console.log('Intent:', meta?.user_intent);
  console.log('Quick replies:', meta?.quick_replies);

  // Assertions
  const repeatsQuestion = assistantText.includes('อยากพูดอะไร') || assistantText.includes('อยากพิมพ์อะไร');
  if (repeatsQuestion) {
    throw new Error('FAILED: AI asked user to repeat what they wanted to say.');
  }

  const mentionsConcrete =
    assistantText.includes('เกลา') ||
    assistantText.includes('สื่อ') ||
    assistantText.includes('อ่าน') ||
    assistantText.includes('ตอบ') ||
    assistantText.includes('ประโยค') ||
    assistantText.includes('ข้อความ');

  if (!mentionsConcrete) {
    throw new Error('FAILED: AI response did not reflect concrete details from the exercise discovery.');
  }

  console.log('\n=== CONTINUITY VERIFICATION PASSED ===');
}

testContinuity().catch((err) => {
  console.error('Continuity test failed:', err);
  process.exit(1);
});
