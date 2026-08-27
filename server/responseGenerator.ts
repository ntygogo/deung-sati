import type { LoopEvidence } from './conversationState.ts';
import type { SafetyClassification } from './safetyClassifier.ts';

export interface GenerationResult {
  text: string;
  askedDimension:
    | 'fact'
    | 'feeling'
    | 'body_sensation'
    | 'story'
    | 'fear_or_need'
    | 'action'
    | 'result'
    | 'new_choice'
    | 'summary_choice'
    | 'completed_reflection'
    | null;
}

/**
 * Dynamic Socratic Response Generator strictly guided by conversational progression and state.
 * Actively prevents repetition of questions or phrases.
 */
export function generateStateGuidedResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  state: LoopEvidence,
  safety: SafetyClassification
): GenerationResult {
  const latestUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';
  const text = latestUserMessage.toLowerCase();
  const previousAssistantTexts = messages
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content);

  // 1. Protect Mode Overrides (Immediate Safety First)
  if (safety.mode === 'protect') {
    if (safety.recent_harm_occurred || /แทง|ทำร้าย.*ไปแล้ว|ฆ่า.*ไปแล้ว/i.test(text)) {
      return {
        text: 'ฉันได้ยินสิ่งที่คุณบอกนะ และนี่คือเรื่องสำคัญมาก\n\nตอนนี้ขอให้เช็กก่อนว่าคนที่บาดเจ็บยังมีสติหรือยังช่วยได้ไหม? ขอให้คุณรีบโทร 1669 (กู้ชีพฉุกเฉิน) หรือ 191 ตอนนี้เลยเพื่อช่วยชีวิตเขาก่อน',
        askedDimension: null,
      };
    }
    if (/มีปืน|มีมีด|กำลังจะไป|กำลังขับรถ/i.test(text)) {
      return {
        text: 'ฉันได้ยินความเจ็บและความโกรธของคุณนะ แต่ตอนนี้ความปลอดภัยของคุณและทุกคนต้องมาก่อนเป็นอันดับแรก\n\nฉันขอให้คุณหยุดรถ เข้าข้างทาง หรือวางของอันตรายลงก่อนตอนนี้เลยได้ไหม? อย่าเพิ่งไปหาเขาตอนนี้',
        askedDimension: null,
      };
    }
    return {
      text: 'ฉันยังอยู่ตรงนี้กับคุณนะ แต่ตอนนี้ความปลอดภัยต้องมาก่อน\n\nลองหยุดพัก หายใจลึกๆ ช้าๆ ก่อน แล้วดูว่าอะไรจะช่วยให้คุณและคนรอบข้างปลอดภัยที่สุดในตอนนี้',
      askedDimension: null,
    };
  }

  // 2. Explore Mode (Violent thoughts without immediate danger)
  if (safety.mode === 'explore' || /อยากฆ่า|อยากต่อย|แค้น/i.test(text)) {
    if (state.turn_count <= 2) {
      return {
        text: 'ความโกรธของคุณรุนแรงและเข้าใจได้เลยนะ การเจอเรื่องแบบนี้มันเจ็บปวดและไม่แฟร์มากๆ\n\nฉันอยากอยู่ฟังคุณตรงนี้ แต่ขอเช็กให้แน่ใจก่อน ตอนนี้คุณอยู่ที่ไหน และมีความตั้งใจจะไปทำร้ายเขาจริงๆ หรือมันคือความโกรธที่อัดแน่นอยู่ข้างใน?',
        askedDimension: null,
      };
    }
  }

  // 3. Conversational Progression Decisions based on what user REVEALED in this turn & history

  // Step 1: User just revealed Fact, but no Story/Feeling yet
  const userJustGaveFact = state.fact.length > 0 && state.story.length === 0 && state.body_sensation.length === 0;
  if (userJustGaveFact) {
    const factName = state.fact[0] || 'เรื่องนี้';
    return {
      text: `ตอนที่${factName} วินาทีนั้นข้างในคุณรู้สึกอะไรขึ้นมาก่อน?`,
      askedDimension: 'feeling',
    };
  }

  // Step 2: User just revealed Story / Interpretation (e.g. "ตอนนั้นฉันรู้สึกว่าตัวเองไม่เก่งเลย"), but no Body yet
  const userJustGaveStory = state.story.length > 0 && state.body_sensation.length === 0;
  if (userJustGaveStory) {
    const storyText = state.story[0] || 'คิดว่าตัวเองไม่เก่ง';
    return {
      text: `พอในหัวเริ่มมีความคิดว่า "${storyText}"... ตอนนั้นร่างกายคุณมีอาการตึง เกร็ง หรือแน่นตรงไหนเป็นพิเศษไหม?`,
      askedDimension: 'body_sensation',
    };
  }

  // Step 3: User just revealed Body Sensation, but no Action yet
  const userJustGaveBody = state.body_sensation.length > 0 && state.action.length === 0;
  if (userJustGaveBody) {
    const bodyText = state.body_sensation.join(' และ ');
    const storyRef = state.story[0] ? `พอมีความคิดว่า "${state.story[0]}"` : 'ในสภาวะนั้น';
    return {
      text: `อาการ "${bodyText}" มันสะท้อนความรู้สึกข้างในได้ชัดเจนมาก\n\n${storyRef} ปกติเวลาเกิดเรื่องแบบนี้ขึ้น คุณมักจะตอบสนองหรือทำยังไงต่อ?`,
      askedDimension: 'action',
    };
  }

  // Step 4: User just revealed Action / Reaction, but no Result yet
  const userJustGaveAction = state.action.length > 0 && state.result.length === 0;
  if (userJustGaveAction) {
    const actionText = state.action[0] || 'เลือกที่จะเงียบ';
    return {
      text: `พอเลือกที่จะ${actionText} ผลลัพธ์ที่ตามมากับตัวคุณและงานเป็นยังไงบ้าง?`,
      askedDimension: 'result',
    };
  }

  // Step 5: User revealed Result -> Assemble Loop & Invite Choice!
  const hasCompleteLoop = state.action.length > 0 && state.result.length > 0 && state.new_choice.length === 0;
  if (hasCompleteLoop) {
    const factText = state.fact[0] || 'มีเรื่องกระทบใจ';
    const storyText = state.story[0] || state.feeling.join(', ') || 'มีความคิดลบ';
    const bodyText = state.body_sensation.length > 0 ? ` (${state.body_sensation.join(', ')})` : '';
    const actionText = state.action[0] || 'ตอบสนองแบบเดิม';
    const resultText = state.result[0] || 'เกิดผลกระทบสะสม';

    return {
      text:
        `ตอนนี้เราเริ่มเห็นวงจรนี้ชัดเจนขึ้นแล้ว:\n` +
        `• เกิดขึ้นจริง: ${factText}\n` +
        `• สิ่งที่ใจเล่าต่อ: "${storyText}"${bodyText}\n` +
        `• ปฏิกิริยาเดิม: ${actionText}\n` +
        `• ผลที่ตามมา: ${resultText}\n\n` +
        `ครั้งหน้าเมื่อความรู้สึกนี้เริ่มเกิดขึ้น คุณคิดว่ามีทางเลือกเล็กๆ ไหนที่คุณอยากลองทำต่างไปจากเดิมได้บ้าง?`,
      askedDimension: 'new_choice',
    };
  }

  // Step 6: User revealed New Choice
  if (state.new_choice.length > 0) {
    if (/เบาลง|ดีขึ้น|โล่ง|สบายใจ|ผ่อนคลาย|ขอบคุณ|เข้าใจแล้ว/i.test(text)) {
      return {
        text: 'ดีใจด้วยที่คุณสัมผัสได้ถึงความผ่อนคลายนี้ เมื่อเราเห็นลูปความคิดตามจริง เราไม่จำเป็นต้องถูกมันลากไปเหมือนเดิม คุณสามารถบันทึกลูปนี้ไว้ดูทบทวน หรือพักผ่อนก่อนได้เลยนะ',
        askedDimension: 'completed_reflection',
      };
    }
    const choiceText = state.new_choice[0];
    return {
      text: `ทางเลือก "${choiceText}" เป็นจุดเริ่มต้นที่ดีมากในการคืนพื้นที่การตัดสินใจให้ตัวคุณเอง\n\nถ้าลองสังเกตตอนนี้ ความรู้สึกตึงเครียดหรือหนักใจลดลงไปบ้างไหม?`,
      askedDimension: 'summary_choice',
    };
  }

  // Fallback for initial or ambiguous statements (Guarantee non-repetition)
  const fallbackOptions = [
    `จากสิ่งที่คุณเล่ามา ตอนที่เรื่องนี้เกิดขึ้น มีรายละเอียดอะไรที่เกิดขึ้นจริงตรงหน้าคุณอีกไหม?`,
    `ข้างในคุณตอนนี้รู้สึกยังไงกับสิ่งที่เกิดขึ้น เล่าให้ฟังได้นะ`,
    `ในสถานการณ์นี้ อะไรคือสิ่งที่คุณรู้สึกว่ากระทบใจคุณมากที่สุด?`,
  ];

  for (const opt of fallbackOptions) {
    if (!previousAssistantTexts.includes(opt)) {
      return { text: opt, askedDimension: null };
    }
  }

  return {
    text: `ฉันยังอยู่รับฟังคุณนะ ลองเล่าต่อได้เลยว่าในใจกำลังคิดอะไรอยู่`,
    askedDimension: null,
  };
}
