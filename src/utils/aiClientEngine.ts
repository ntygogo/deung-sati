import type {
  ChatMessage,
  LoopMapData,
  EmotionalCheckinData,
  EmotionalCheckinStep,
  ConversationIntent,
  CbtConversationStage,
  ExerciseCardData,
} from '../types.ts';
import {
  evaluateCheckinConsent,
  isCrisisMessage,
  classifyConversationIntent,
  isExplicitTopicShift,
  CHIP_LABELS,
} from '../shared/chat-protocol/index.ts';

export interface ClientAiResponse {
  text: string;
  options?: string[];
  checkinData?: EmotionalCheckinData;
  cbtStage?: CbtConversationStage;
  conversationIntent?: ConversationIntent;
  exerciseCard?: ExerciseCardData;
  safetyMode?: 'normal' | 'explore' | 'protect';
  suggestedLoop?: Partial<LoopMapData>;
}

/**
 * Pure Local Deterministic Adaptive CBT & Guided Check-in Engine
 *
 * NOTE: Operates 100% locally without secret API keys.
 * Used for offline mode or as client-side fallback.
 */
export function generateDynamicCBTResponse(
  history: ChatMessage[],
  currentCheckin?: EmotionalCheckinData,
  currentStage: CbtConversationStage = 1
): ClientAiResponse {
  const userMessages = history.filter((m) => m.role === 'user');
  const latestMsg = userMessages[userMessages.length - 1]?.text?.trim() || '';

  // =========================================================================
  // 1. PRIORITY 0: CRISIS SAFETY GATE
  // =========================================================================
  if (isCrisisMessage(latestMsg)) {
    return {
      text: `ความปลอดภัยและความรู้สึกของเธอสำคัญที่สุดในตอนนี้เลยนะ...\nขอให้เธอหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน\n\nหากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) หรือ 1669 / 191 เพื่อให้มีคนรับฟังและดูแลความปลอดภัยของเธอทันทีนะ 🌿`,
      safetyMode: 'protect',
      conversationIntent: 'crisis',
    };
  }

  // =========================================================================
  // 2. EXPLICIT TOPIC SHIFT
  // =========================================================================
  if (isExplicitTopicShift(latestMsg)) {
    return {
      text: `ได้เลย งั้นเราพักเรื่องนั้นไว้ก่อนนะ... ตอนนี้มีเรื่องไหนที่เธออยากเล่าต่อ เล่าให้เราฟังได้เลย`,
      checkinData: { step: 'idle' },
      cbtStage: 1,
      conversationIntent: 'venting',
    };
  }

  // =========================================================================
  // 3. IMPULSIVE DECISION REALITY CHECK
  // =========================================================================
  const intent = classifyConversationIntent(latestMsg, history);
  if (intent === 'pausing') {
    return {
      text: `เข้าใจเลยว่าตอนนั้นมันโกรธจนอยากระเบิดออกมาเดี๋ยวนี้...\n\nแต่ลองหยุดหายใจลึกๆ 10 วินาที... ถ้าทำไปตอนนี้ ความสะใจอยู่กับเราแป๊บเดียว แล้วผลแย่ที่สุดที่จะตามมาหลังจากนั้น เธอพร้อมรับมือกับมันจริงๆ หรือเปล่า?`,
      conversationIntent: 'pausing',
      options: ['ขอเวลาคิดแป๊บหนึ่ง', 'ยังโกรธอยู่มาก', 'ลองใจเย็นลงก่อน'],
    };
  }

  // =========================================================================
  // 4. GUIDED EMOTIONAL CHECK-IN STATE MACHINE (Strict Consent)
  // =========================================================================
  const checkinStep: EmotionalCheckinStep = currentCheckin?.step || 'idle';

  // A. OFFERED / AWAITING CONSENT
  if (checkinStep === 'offered' || checkinStep === 'awaiting_consent') {
    const consent = evaluateCheckinConsent(latestMsg);

    if (consent === 'affirmative') {
      return {
        text: `ถ้ายังไม่ต้องตั้งชื่ออารมณ์ ตอนนี้ร่างกายตรงไหนรู้สึกชัดที่สุด?`,
        options: [...CHIP_LABELS.STEP1_BODY],
        checkinData: { step: 'step1_body' },
        conversationIntent: 'exploring',
      };
    }

    if (consent === 'declined') {
      return {
        text: `ได้เลย ไม่เป็นไรเลยนะ... งั้นเราคุยกันต่อตามปกติ เธออยากเล่าหรือระบายเรื่องไหนต่อ เล่าได้เลยนะ`,
        checkinData: { step: 'declined' },
        conversationIntent: 'venting',
        cbtStage: currentStage,
      };
    }

    // Ambiguous / hesitant response -> DO NOT enter body exploration! Ask simpler choice:
    return {
      text: `ไม่เป็นไรเลยนะ เธอยังไม่ต้องรีบตัดสินใจก็ได้ ตอนนี้อยากให้เราอยู่ฟังเธอเล่าต่อ หรืออยากลองสังเกตร่างกายด้วยกันแค่หนึ่งคำถามดี?`,
      options: [...CHIP_LABELS.CONSENT_AMBIGUOUS],
      checkinData: { step: 'awaiting_consent' },
      conversationIntent: 'unclear',
    };
  }

  // B. STEP 1: Body Check-in Response
  if (checkinStep === 'step1_body') {
    const isUnknown = /ไม่รู้|ไม่รู้สึก|บอกไม่ถูก|เฉย/i.test(latestMsg);
    const chosenPart = isUnknown ? 'ร่างกาย' : latestMsg;

    if (isUnknown) {
      return {
        text: `ไม่เป็นไรเลย แค่รู้ว่าตอนนี้มันยังบอกไม่ถูกก็ถือว่าเราเริ่มสังเกตเห็นแล้ว\n\nถ้ามองโดยรวมทั้งตัว ตอนนี้มันใกล้กับความรู้สึกแบบไหนมากที่สุด?`,
        options: [...CHIP_LABELS.STEP2_TEXTURE],
        checkinData: {
          step: 'step2_texture',
          bodyPart: 'ทั้งตัว',
        },
        conversationIntent: 'exploring',
      };
    }

    return {
      text: `ตรง${chosenPart}นั้น มันใกล้กับแบบไหนมากที่สุด?`,
      options: [...CHIP_LABELS.STEP2_TEXTURE],
      checkinData: {
        step: 'step2_texture',
        bodyPart: chosenPart,
      },
      conversationIntent: 'exploring',
    };
  }

  // C. STEP 2: Sensation Texture Response
  if (checkinStep === 'step2_texture') {
    const texture = latestMsg;
    const bodyPart = currentCheckin?.bodyPart || 'ร่างกาย';

    return {
      text: `ก่อนที่จะรู้สึกตรง${bodyPart}แบบนี้ มีอะไรเกิดขึ้น หรือมีความคิดอะไรแวบขึ้นมาบ้างไหม?`,
      options: [...CHIP_LABELS.STEP3_TRIGGER],
      checkinData: {
        step: 'step3_trigger',
        bodyPart,
        texture,
      },
      conversationIntent: 'exploring',
    };
  }

  // D. STEP 3: Trigger Context Response
  if (checkinStep === 'step3_trigger') {
    const triggerEvent = latestMsg;
    const texture = currentCheckin?.texture || 'แน่น';

    return {
      text: `จากที่เล่า มันอาจใกล้กับคำไหนมากที่สุด ไม่ต้องตรงทั้งหมดนะ`,
      options: [...CHIP_LABELS.STEP4_EMOTIONS],
      checkinData: {
        step: 'step4_naming',
        bodyPart: currentCheckin?.bodyPart,
        texture,
        triggerEvent,
      },
      conversationIntent: 'exploring',
    };
  }

  // E. STEP 4: Emotional Naming -> Fact vs Feeling Breakdown
  if (checkinStep === 'step4_naming') {
    const emotionName = latestMsg;
    const triggerEvent = currentCheckin?.triggerEvent || 'มีเหตุการณ์เข้ามากระทบใจ';
    const bodyPart = currentCheckin?.bodyPart || 'ร่างกาย';
    const texture = currentCheckin?.texture || 'แน่น';

    return {
      text: `ลองแยกสิ่งที่เกิดขึ้นออกมาดูนะ\n\nสิ่งที่เกิดขึ้นจริง:\n${triggerEvent}\n\nความรู้สึกหรือความหมายที่ใจตีความ:\nรู้สึก${emotionName} (มีอาการ${texture}ที่${bodyPart})\n\nความรู้สึกนี้เกิดขึ้นจริงและสำคัญนะ แต่สิ่งที่เรากลัวอาจยังไม่ใช่ข้อเท็จจริงทั้งหมด`,
      options: [...CHIP_LABELS.STEP5_FACT_FEELING],
      checkinData: {
        step: 'step5_fact_feeling',
        bodyPart,
        texture,
        triggerEvent,
        emotionName,
        fact: triggerEvent,
        feelingOrStory: `รู้สึก${emotionName}`,
      },
      conversationIntent: 'exploring',
    };
  }

  // F. STEP 5: Fact vs Feeling -> Offer Micro-Exercise
  if (checkinStep === 'step5_fact_feeling') {
    return {
      text: `ตอนนี้อยากลองทำอะไรเล็กๆ เพื่อให้ตัวเองเบาลงหน่อยไหม?`,
      options: [...CHIP_LABELS.STEP6_EXERCISES],
      checkinData: {
        ...currentCheckin,
        step: 'step6_exercise',
      },
      conversationIntent: 'practicing',
    };
  }

  // G. STEP 6: Micro-Exercise Execution & Mode Wrap-up
  if (checkinStep === 'step6_exercise') {
    const choice = latestMsg;
    const emotion = currentCheckin?.emotionName || 'ความรู้สึกนี้';
    const texture = currentCheckin?.texture || 'แน่น';

    if (/ยังไม่พร้อม|ไม่เอา|ข้าม/i.test(choice)) {
      return {
        text: `ไม่เป็นไรเลยนะ... ตอนนี้อยากคุยเรื่องนี้ต่อ หรืออยากกลับไปดูว่าเธอต้องการทำอะไรต่อจากตรงนี้ดี?`,
        options: [...CHIP_LABELS.WRAPUP_RETURN],
        checkinData: { step: 'completed' },
        conversationIntent: 'venting',
        cbtStage: 2,
      };
    }

    let exerciseCard: ExerciseCardData = {
      title: 'ฝึกหายใจช้าๆ ผ่อนคลายร่างกาย (1 นาที)',
      description: 'ช่วยให้ระบบประสาทสงบลงและคลายความตึงแน่นในร่างกาย',
      steps: [
        '1. หายใจเข้าทางจมูกช้าๆ นับ 1-4',
        '2. กลั้นหายใจนิ่งๆ นับ 1-4',
        '3. ผ่อนลมหายใจออกทางปากยาวๆ นับ 1-6',
        '4. ทำซ้ำ 3-4 รอบ สังเกตความรู้สึกที่ค่อยๆ คลายลง',
      ],
      duration: '1 นาที',
    };

    if (/เขียน/i.test(choice)) {
      exerciseCard = {
        title: 'เขียนระบายสิ่งที่ติดค้าง (1 นาที)',
        description: 'เทความคิดในหัวลงบนกระดาษโดยไม่ต้องเรียบเรียง',
        steps: [
          '1. เขียนสิ่งที่รู้สึกโกรธ/กังวลออกมาตรงๆ 3 บรรทัด',
          '2. วงกลมสิ่งที่ควบคุมได้ และขีดฆ่าสิ่งที่ควบคุมไม่ได้',
        ],
        duration: '1 นาที',
      };
    } else if (/มองข้อเท็จจริง/i.test(choice)) {
      exerciseCard = {
        title: 'แยกสิ่งที่รู้จริง vs สิ่งที่คาดเดา (1 นาที)',
        description: 'หยุดเรื่องเล่าในหัวด้วยการมองตามจริง',
        steps: [
          '1. ถามตัวเอง: เรื่องนี้เรารู้แน่ชัด 100% หรือเรากำลังเดาใจคนอื่น?',
          '2. บอกตัวเอง: เราไม่ต้องแบกความคิดของคนอื่นไว้ทั้งหมด',
        ],
        duration: '1 นาที',
      };
    }

    return {
      text: `ตอนแรกมันเหมือนเป็นความรู้สึกที่บอกไม่ถูก แต่ตอนนี้เราเริ่มเห็นว่ามีความรู้สึก${emotion}และอาการ${texture}อยู่ข้างใน ความรู้สึกนั้นเป็นเรื่องจริง ส่วนสิ่งที่เราคิดกังวลยังเป็นสิ่งที่เรายังไม่รู้แน่\n\nตอนนี้อยากคุยเรื่องนี้ต่อ หรืออยากกลับไปดูว่าเธอต้องการทำอะไรต่อจากตรงนี้?`,
      options: [...CHIP_LABELS.WRAPUP_RETURN],
      exerciseCard,
      checkinData: { step: 'completed' },
      conversationIntent: 'venting',
      cbtStage: 2,
    };
  }

  // =========================================================================
  // 5. TRIGGER DETECTION FOR GUIDED EMOTIONAL CHECK-IN
  // =========================================================================
  if (intent === 'exploring' && checkinStep !== 'declined' && checkinStep !== 'completed') {
    return {
      text: `เหมือนตอนนี้มันยังบอกไม่ถูกว่าเกิดอะไรขึ้นข้างใน ใช่ไหม\n\nอยากให้เราค่อยๆ ช่วยสำรวจจากความรู้สึกในร่างกายทีละนิดไหม?`,
      options: [...CHIP_LABELS.CONSENT_OFFER],
      checkinData: { step: 'offered' },
      conversationIntent: 'exploring',
    };
  }

  // =========================================================================
  // 6. ADAPTIVE CBT CONVERSATION ENGINE (Stages 1–7)
  // =========================================================================
  const hasRelationship = /แฟน|คนรัก|คนคุย|เขา|เธอ|สามี|ภรรยา/i.test(latestMsg);
  const hasWork = /งาน|หัวหน้า|เจ้านาย|เพื่อนร่วมงาน|ลูกค้า|บริษัท|ประชุม|ลาออก|เงินเดือน/i.test(latestMsg);
  const hasFamily = /แม่|พ่อ|ครอบครัว|พี่|น้อง|ญาติ/i.test(latestMsg);
  const hasFriends = /เพื่อน|กลุ่ม|แก๊ง|เพื่อนสนิท/i.test(latestMsg);

  const hasAnger = /โกรธ|โมโห|หงุดหงิด|เกลียด|ประสาทเสีย|หัวร้อน/i.test(latestMsg);
  const hasSadness = /น้อยใจ|เสียใจ|ร้องไห้|นอยด์|โดดเดี่ยว|เจ็บ/i.test(latestMsg);
  const hasExhaustion = /เหนื่อย|ล้า|หมดไฟ|ท้อ|เบื่อ|เซ็ง|หมดแรง|ขี้เกียจ/i.test(latestMsg);
  const hasAnxiety = /กังวล|กลัว|เครียด|แพนิก|ไม่มั่นใจ|ล่ก|ฟุ้งซ่าน/i.test(latestMsg);

  const cleanSnippet = latestMsg.length > 25 ? `${latestMsg.slice(0, 25)}...` : latestMsg;

  // Stage 1: Empathy & Safe Validation
  if (currentStage === 1) {
    if (hasRelationship && hasSadness) {
      return {
        text: `ฟังแล้วสัมผัสได้ถึงความน้อยใจเลยนะ... เวลาคนที่เราแคร์ทำตัวนิ่งใส่หรือไม่เป็นอย่างที่หวัง มันเจ็บข้างในมากจริงๆ\n\nตอนที่เกิดเรื่องนี้ขึ้น ในใจลึกๆ เธออยากให้เขาทำหรือพูดอะไรกับเธอมากที่สุด?`,
        cbtStage: 2,
        conversationIntent: 'venting',
      };
    }
    if (hasFamily && (hasSadness || hasAnger)) {
      return {
        text: `เรื่องในครอบครัวมักเป็นเรื่องที่ละเอียดอ่อนและกระทบใจเราได้ลึกที่สุดเนอะ...\n\nอะไรคือคำพูดหรือการกระทำในบ้านที่ทำให้เธอรู้สึกอึดอัดใจมากที่สุดในตอนนี้?`,
        cbtStage: 2,
        conversationIntent: 'venting',
      };
    }
    if (hasFriends && hasSadness) {
      return {
        text: `การรู้สึกเหมือนถูกเพื่อนมองข้ามหรือไม่เป็นส่วนหนึ่ง มันชวนให้รู้สึกโดดเดี่ยวและนอยด์จริงๆ นะ...\n\nตอนที่รู้เรื่องนี้ ในหัวมันแวบความคิดอะไรขึ้นมาเป็นอย่างแรก?`,
        cbtStage: 2,
        conversationIntent: 'venting',
      };
    }
    if (hasWork && (hasExhaustion || hasAnger)) {
      return {
        text: `เรื่องงานเวลามีเรื่องให้ปวดหัว มันดูดพลังชีวิตเราไปหมดเลยเนอะ...\n\nอะไรคือสิ่งที่ทำให้เธอรู้สึกเหนื่อยหรือหงุดหงิดกับเรื่องนี้มากที่สุดในตอนนี้?`,
        cbtStage: 2,
        conversationIntent: 'venting',
      };
    }
    if (hasAnxiety) {
      return {
        text: `ความกังวลใจมันทำให้ข้างในรู้สึกกระวนกระวายและคิดวนไม่หยุดเลยเนอะ...\n\nอะไรคือสิ่งเลวร้ายที่สุดที่เธอคิดว่าอาจจะเกิดขึ้นจากเรื่องนี้?`,
        cbtStage: 2,
        conversationIntent: 'venting',
      };
    }
    if (hasExhaustion) {
      return {
        text: `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากแบกอะไรแล้วเนอะ...\n\nความรู้สึกเหนื่อยนี้มันสะสมมาจากเรื่องไหนเป็นพิเศษไหม?`,
        cbtStage: 2,
        conversationIntent: 'venting',
      };
    }

    return {
      text: `รับฟังอยู่นะ... เรื่อง "${cleanSnippet}" คงกวนใจเธอมาสักพักแล้วใช่ไหม\n\nตอนที่เหตุการณ์นี้เกิดขึ้น วินาทีแรกความรู้สึกไหนแวบขึ้นมาในใจมากที่สุด?`,
      cbtStage: 2,
      conversationIntent: 'venting',
    };
  }

  // Stage 2: Separate Fact from Story
  if (currentStage === 2) {
    if (hasAnger || hasSadness) {
      return {
        text: `เข้าใจเลย พอความรู้สึกนั้นเกิดขึ้น สมองเรามักจะเริ่มสร้าง "เรื่องเล่าในหัว" ต่อทันที\n\nตอนนั้นเธอกำลังบอกตัวเองว่ายังไงอยู่บ้าง?`,
        cbtStage: 3,
        conversationIntent: 'exploring',
      };
    }
    return {
      text: `พอได้ฟังแล้วเห็นภาพชัดขึ้นเลย...\n\nถ้าเราลองแยกดู ระหว่าง "สิ่งที่เป็นความจริงที่เกิดขึ้นตรงๆ" กับ "สิ่งที่เรากำลังคิดกังวลไปเอง" เธอคิดว่า 2 อย่างนี้ต่างกันยังไงบ้าง?`,
      cbtStage: 3,
      conversationIntent: 'exploring',
    };
  }

  // Stage 3: Feeling & Somatic Awareness
  if (currentStage === 3) {
    return {
      text: `เวลาที่ความคิดนั้นแวบเข้ามา ลองสังเกตความรู้สึกในร่างกายดูสิ... ตอนนี้ตรงหน้าอก ท้อง หรือไหล่ มีความรู้สึกตึง แน่น หรือหนักตรงไหนเป็นพิเศษไหม?`,
      cbtStage: 4,
      conversationIntent: 'exploring',
    };
  }

  // Stage 4: Hidden Need & Core Fear
  if (currentStage === 4) {
    return {
      text: `ที่เรื่องนี้มันกวนใจเธอมากขนาดนี้ ในใจลึกๆ เธอคิดว่าอะไรคือสิ่งสำคัญที่ใจเธอต้องการได้รับการดูแล หรือกลัวว่าจะเสียไปมากที่สุด?`,
      cbtStage: 5,
      conversationIntent: 'exploring',
    };
  }

  // Stage 5: Habitual CBT Loop
  if (currentStage === 5) {
    return {
      text: `สิ่งที่น่าสนใจคือ... ความคิดนั้นมันมักจะพาให้เราเผลอตอบสนองด้วยความเคยชินเดิมๆ (เช่น เงียบ, ประชด, ไถมือถือ, หรือโทษตัวเอง)\n\nเวลาเจอเรื่องแบบนี้ ปกติแล้วเธอมักจะทำอะไรต่อ แล้วผลลัพธ์ที่ตามมามันทำให้สบายใจขึ้นจริงไหม?`,
      cbtStage: 6,
      conversationIntent: 'exploring',
    };
  }

  // Stage 6: Conscious New Choice
  if (currentStage === 6) {
    return {
      text: `ถ้าเราลองมองดูสถานการณ์นี้จากมุมมองของเพื่อนที่มีสติ และรักตัวเอง...\n\nเธอคิดว่ามีทางเลือกเล็กๆ ไหนที่เราทำได้ โดยไม่ต้องทำร้ายตัวเองหรือเหนื่อยใจแบบเดิมไหม?`,
      cbtStage: 7,
      conversationIntent: 'deciding',
    };
  }

  // Stage 7: Loop Map Integration & Summary
  return {
    text: `ดีมากๆ เลยที่เธอได้หยุดมองเห็นลูปความคิดของตัวเอง... การมีสติไม่ได้แปลว่าต้องหายโกรธทันที แต่คือการรู้ทันว่าใจกำลังเป็นอะไร\n\nตอนนี้อยากบันทึกลูปนี้เก็บไว้ หรืออยากคุยต่อเรื่องไหนอีกไหม?`,
    options: ['บันทึกเป็นลูปความคิด', 'คุยต่ออีกนิด', 'สบายใจขึ้นแล้ว'],
    cbtStage: 7,
    conversationIntent: 'summarizing',
  };
}

/**
 * Stream Local Deterministic AI Response smoothly (No network/secret key required)
 */
export async function streamClientAiResponse(
  history: ChatMessage[],
  currentCheckin: EmotionalCheckinData | undefined,
  currentStage: CbtConversationStage = 1,
  onChunk: (text: string) => void,
  onDone: (response: ClientAiResponse) => void
): Promise<void> {
  const response = generateDynamicCBTResponse(history, currentCheckin, currentStage);

  return new Promise<void>((resolve) => {
    let currentIndex = 0;
    const chunkSize = 4;
    const interval = setInterval(() => {
      if (currentIndex < response.text.length) {
        const nextSlice = response.text.slice(currentIndex, currentIndex + chunkSize);
        onChunk(nextSlice);
        currentIndex += chunkSize;
      } else {
        clearInterval(interval);
        onDone(response);
        resolve();
      }
    }, 12);
  });
}
