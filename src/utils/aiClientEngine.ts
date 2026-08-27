import type { ChatMessage, LoopMapData, EmotionalCheckinData, EmotionalCheckinStep } from '../types';

export interface ClientAiResponse {
  text: string;
  options?: string[];
  checkinData?: EmotionalCheckinData;
  exerciseCard?: {
    title: string;
    description: string;
    steps: string[];
    duration: string;
  };
  safetyMode?: 'normal' | 'explore' | 'protect';
  suggestedLoop?: Partial<LoopMapData>;
}

// Optional Direct Client-Side Gemini API Key
const VITE_GEMINI_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.GEMINI_API_KEY ||
  '';

/**
 * Call Google Gemini API directly from browser with streaming if key is present
 */
async function callDirectGeminiApi(
  history: ChatMessage[],
  apiKey: string,
  onChunk: (text: string) => void,
  onDone: (response: ClientAiResponse) => void
): Promise<boolean> {
  try {
    const formattedContents = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const systemInstruction = `คุณคือ "เพื่อนดึงสติ" (Dueng Sati) จากหนังสือ "ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ" โดย นัตตี้ (NTYGOGO)
บุคลิก: เพื่อนสนิทที่เข้าใจคน ฟังเก่ง อบอุ่น จริงใจ และถามคำถามชวนคิดได้ลึกซึ้ง
ไม่ใช่หมอ ไม่ใช่นักจิตวิทยา และไม่ใช่แบบสอบถาม

[1. ลำดับบทสนทนาหลัก 1–7 (CORE CBT FLOW)]
1. รับฟัง & สร้างพื้นที่ปลอดภัย: สะท้อนสิ่งที่ได้ยินสั้นๆ อย่างอ่อนโยน
2. แยกแยะความจริง vs ความคิด: ชวนสังเกตว่าอะไรคือสิ่งที่เกิดขึ้นตรงๆ vs สิ่งที่ใจเราคิดปรุงแต่ง
3. สำรวจความรู้สึก & ร่างกาย: สังเกตอารมณ์และสภาวะข้างใน
4. มองเห็นความกลัว & ความต้องการที่ซ่อนอยู่: ทำไมเรื่องนี้ถึงกระทบใจเรา
5. เชื่อมโยงลูปความเคยชิน (Habitual Loop): เมื่อรู้สึกแบบนี้ ปกติเราเผลอตอบสนองอย่างไร และผลที่ได้คืออะไร
6. ชวนค้นหาทางเลือกใหม่ (New Conscious Choice): ทางเลือกเล็กๆ ที่เราทำได้จริงด้วยความเมตตาต่อตัวเอง
7. สรุปเป็นแผนผังลูปความคิด (Loop Map) & คืนความนิ่งให้ใจ

[2. GUIDED EMOTIONAL CHECK-IN (โหมดเสริมเมื่อผู้ใช้ติดขัด)]
เงื่อนไข: เมื่อผู้ใช้ตอบ "ไม่รู้", "บอกไม่ถูก", "งง", "ว่างเปล่า", เล่าแต่เหตุการณ์แต่ไม่รู้ความรู้สึก หรือใช้คำกว้างๆ (แย่, ไม่โอเค)
- ขออนุญาตก่อนเสมอ: "เหมือนตอนนี้มันยังบอกไม่ถูกว่าเกิดอะไรขึ้นข้างใน ใช่ไหม... อยากให้เราค่อยๆ ช่วยสำรวจจากความรู้สึกในร่างกายทีละนิดไหม?"
- ถ้าผู้ใช้ตอบตกลง พาทำทีละข้อ: สำรวจร่างกาย ➔ ลักษณะความรู้สึก (หนัก/ตึง/แน่น/ว่างเปล่า) ➔ สิ่งที่เกิดก่อนหน้า ➔ ช่วยหาคำเรียกอารมณ์ ➔ แยกความจริง vs ความคิด ➔ แบบฝึกหัดสั้น 1-3 นาที
- จบโหมด: สรุปไม่เกิน 3 ประโยค แล้วถามว่าจะคุยต่อหรือกลับสู่บทสนทนาเดิม

[3. กฎเหล็ก]
- ตอบสั้น 1-3 ประโยค ภาษาพูดธรรมชาติ 100%
- ห้ามแสดงเลข 1-6 กับผู้ใช้เด็ดขาด
- หากตรวจพบความเสี่ยงทำร้ายตนเอง เข้าสู่ Crisis Safety ทันที`;

    const modelName = 'gemini-3.6-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!res.ok || !res.body) return false;

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.slice(5).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textChunk) {
                accumulatedText += textChunk;
                onChunk(textChunk);
              }
            } catch {
              // Ignore chunk parse error
            }
          }
        }
      }
    }

    if (accumulatedText.trim()) {
      onDone({ text: accumulatedText });
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Direct Gemini API call failed, falling back to Intelligent CBT Engine:', e);
    return false;
  }
}

/**
 * Intelligent Context-Aware Semantic Reflection & Guided Check-in Engine
 */
export function generateDynamicCBTResponse(
  history: ChatMessage[],
  currentCheckin?: EmotionalCheckinData
): ClientAiResponse {
  const userMessages = history.filter((m) => m.role === 'user');
  const latestMsg = userMessages[userMessages.length - 1]?.text?.trim() || '';
  const turnCount = userMessages.length;

  // 1. Critical Safety Triage (Highest priority)
  if (/อยากตาย|ไม่อยากอยู่แล้ว|ทำร้ายตัวเอง|กรีดแขน|กินยาตาย|ฆ่าตัวตาย/i.test(latestMsg)) {
    return {
      text: `ความปลอดภัยและความรู้สึกของคุณสำคัญที่สุดในตอนนี้เลยนะ...\nขอให้คุณหยุดพัก หายใจเข้าลึกๆ ช้าๆ ก่อน\n\nหากรู้สึกว่าอารมณ์ท่วมท้นจนรับไม่ไหว ขอให้โทรหาสายด่วนฟรี 1323 (กรมสุขภาพจิต 24 ชม.) หรือโทร 02-107-7977 (สะมาริตันส์) เพื่อให้มีคนรับฟังและดูแลความปลอดภัยคุณทันทีนะครับ 🌿`,
      safetyMode: 'protect',
    };
  }

  // 2. Impulsive Decisions Reality Check
  if (/จะ(ด่า|วีน|ประชด|โพสต์|ประจาน|ตบ|ตี|ลาออก|เลิก|บล็อก|บล็อค)|อยาก(ด่า|วีน|ประชด|เลิก|บล็อก)/i.test(latestMsg)) {
    return {
      text: `เข้าใจเลยว่าตอนนั้นมันโกรธจนอยากระเบิดออกมาเดี๋ยวนี้...\n\nแต่ลองหยุดหายใจลึกๆ 10 วินาที... ถ้าทำไปตอนนี้ ความสะใจอยู่กับเราแป๊บเดียว แล้วผลแย่ที่สุดที่จะตามมาหลังจากนั้น เธอพร้อมรับมือกับมันจริงๆ หรือเปล่า?`,
    };
  }

  // =========================================================================
  // GUIDED EMOTIONAL CHECK-IN STATE MACHINE
  // =========================================================================
  const checkinStep: EmotionalCheckinStep = currentCheckin?.step || 'idle';

  // Topic change detection: If user speaks of a completely unrelated topic (e.g. food, weather, work change)
  const isTopicChange =
    /หิว|กินข้าว|นอนแล้ว|ไปไหน|อากาศ|ทำอะไรอยู่|เปลี่ยนเรื่อง/i.test(latestMsg) &&
    checkinStep !== 'idle' &&
    checkinStep !== 'offered';

  if (isTopicChange) {
    return {
      text: `ได้เลย งั้นเราพักเรื่องนั้นไว้ก่อนนะ... ตอนนี้มีอะไรอยากเล่าหรือคุยเรื่องนี้เพิ่มไหม?`,
      checkinData: { step: 'idle' },
    };
  }

  // A. OFFERED -> User responds to consent
  if (checkinStep === 'offered') {
    if (/ลองดู|เอาสิ|ลอง|ได้|ตกลง|เอา|โอเค|พร้อม/i.test(latestMsg)) {
      return {
        text: `ถ้ายังไม่ต้องตั้งชื่ออารมณ์ ตอนนี้ร่างกายตรงไหนรู้สึกชัดที่สุด?`,
        options: ['หน้าอก', 'คอ', 'ท้อง', 'หัว', 'ทั้งตัว', 'ไม่รู้/ไม่รู้สึกอะไร'],
        checkinData: { step: 'step1_body' },
      };
    }
    if (/ยังไม่อยาก|ไม่เอา|คุยต่อ|แบบเดิม|ข้าม|ไม่อยากทำ/i.test(latestMsg)) {
      return {
        text: `ได้เลย ไม่เป็นไรเลยนะ... งั้นเราคุยกันต่อตามปกติ เธออยากเล่าหรือระบายเรื่องไหนต่อ เล่าได้เลยนะ`,
        checkinData: { step: 'declined' },
      };
    }
  }

  // B. STEP 1: Body Check-in Response
  if (checkinStep === 'step1_body') {
    const isUnknown = /ไม่รู้|ไม่รู้สึก|บอกไม่ถูก|เฉย/i.test(latestMsg);
    const chosenPart = isUnknown ? 'ร่างกาย' : latestMsg;

    if (isUnknown) {
      return {
        text: `ไม่เป็นไรเลย แค่รู้ว่าตอนนี้มันยังบอกไม่ถูกก็ถือว่าเราเริ่มสังเกตเห็นแล้ว\n\nถ้ามองโดยรวมทั้งตัว ตอนนี้มันใกล้กับความรู้สึกแบบไหนมากที่สุด?`,
        options: ['หนัก', 'ตึง', 'แน่น', 'ชา', 'ร้อน', 'สั่น', 'ว่างเปล่า', 'บอกไม่ถูก'],
        checkinData: {
          step: 'step2_texture',
          bodyPart: 'ทั้งตัว',
        },
      };
    }

    return {
      text: `ตรง${chosenPart}นั้น มันใกล้กับแบบไหนมากที่สุด?`,
      options: ['หนัก', 'ตึง', 'แน่น', 'ชา', 'ร้อน', 'สั่น', 'ว่างเปล่า', 'บอกไม่ถูก'],
      checkinData: {
        step: 'step2_texture',
        bodyPart: chosenPart,
      },
    };
  }

  // C. STEP 2: Sensation Texture Response
  if (checkinStep === 'step2_texture') {
    const texture = latestMsg;
    const bodyPart = currentCheckin?.bodyPart || 'ร่างกาย';

    return {
      text: `ก่อนที่จะรู้สึกตรง${bodyPart}แบบนี้ มีอะไรเกิดขึ้น หรือมีความคิดอะไรแวบขึ้นมาบ้างไหม?`,
      options: ['มีคนพูดบางอย่างใส่', 'เรื่องงาน/เรื่องเงิน', 'อยู่คนเดียวแล้วคิดวน', 'จำไม่ได้/ข้ามก่อน'],
      checkinData: {
        step: 'step3_trigger',
        bodyPart,
        texture,
      },
    };
  }

  // D. STEP 3: Trigger Context Response
  if (checkinStep === 'step3_trigger') {
    const triggerEvent = latestMsg;
    const texture = currentCheckin?.texture || 'แน่น';

    // Suggest 3-5 gentle tentative emotion names
    const suggestedEmotions = ['กังวล', 'น้อยใจ', 'ผิดหวัง', 'กลัว', 'สับสน', 'ยังไม่มีคำไหนตรง'];

    return {
      text: `จากที่เล่า มันอาจใกล้กับคำไหนมากที่สุด ไม่ต้องตรงทั้งหมดนะ`,
      options: suggestedEmotions,
      checkinData: {
        step: 'step4_naming',
        bodyPart: currentCheckin?.bodyPart,
        texture,
        triggerEvent,
      },
    };
  }

  // E. STEP 4: Emotional Naming Response -> Fact vs Feeling Breakdown
  if (checkinStep === 'step4_naming') {
    const emotionName = latestMsg;
    const triggerEvent = currentCheckin?.triggerEvent || 'มีเหตุการณ์เข้ามากระทบใจ';
    const bodyPart = currentCheckin?.bodyPart || 'ร่างกาย';
    const texture = currentCheckin?.texture || 'แน่น';

    return {
      text: `ลองแยกสิ่งที่เกิดขึ้นออกมาดูนะ\n\nสิ่งที่เกิดขึ้นจริง:\n${triggerEvent}\n\nความรู้สึกหรือความหมายที่ใจตีความ:\nรู้สึก${emotionName} (มีอาการ${texture}ที่${bodyPart})\n\nความรู้สึกนี้เกิดขึ้นจริงและสำคัญนะ แต่สิ่งที่เรากลัวอาจยังไม่ใช่ข้อเท็จจริงทั้งหมด`,
      options: ['เข้าใจแล้ว', 'เห็นภาพชัดขึ้น', 'ไปต่อ'],
      checkinData: {
        step: 'step5_fact_feeling',
        bodyPart,
        texture,
        triggerEvent,
        emotionName,
        fact: triggerEvent,
        feelingOrStory: `รู้สึก${emotionName}`,
      },
    };
  }

  // F. STEP 5: Fact vs Feeling -> Offer Micro-Exercise
  if (checkinStep === 'step5_fact_feeling') {
    return {
      text: `ตอนนี้อยากลองทำอะไรเล็กๆ เพื่อให้ตัวเองเบาลงหน่อยไหม?`,
      options: ['หายใจและอยู่กับร่างกาย', 'เขียนสิ่งที่รู้สึก', 'มองข้อเท็จจริง', 'ยังไม่พร้อม'],
      checkinData: {
        ...currentCheckin,
        step: 'step6_exercise',
      },
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
        options: ['คุยต่อ', 'กลับสู่บทสนทนาเดิม', 'พักก่อน'],
        checkinData: { step: 'completed' },
      };
    }

    let exerciseCard = {
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
      options: ['คุยต่อ', 'กลับสู่บทสนทนาเดิม', 'พักก่อน'],
      exerciseCard,
      checkinData: { step: 'completed' },
    };
  }

  // =========================================================================
  // TRIGGER DETECTION FOR GUIDED EMOTIONAL CHECK-IN
  // =========================================================================
  const isVagueOrStuck =
    /ไม่รู้(ว่ารู้สึกอะไร|อะ|เลย|อ่ะ|วะ)?$|^งง$|^บอกไม่ถูก$|^ว่างเปล่า$|^เฉยๆ$|^แย่$|^ไม่โอเค$|^แย่มาก$/i.test(latestMsg) ||
    (latestMsg.length < 8 && /ไม่รู้|งง|ตัน|เคว้ง/i.test(latestMsg));

  // If user is stuck or vague and not currently in checkin, offer it!
  if (isVagueOrStuck && checkinStep !== 'declined' && checkinStep !== 'completed') {
    return {
      text: `เหมือนตอนนี้มันยังบอกไม่ถูกว่าเกิดอะไรขึ้นข้างใน ใช่ไหม\n\nอยากให้เราค่อยๆ ช่วยสำรวจจากความรู้สึกในร่างกายทีละนิดไหม?`,
      options: ['ลองดู', 'ยังไม่อยากทำ', 'คุยต่อแบบเดิม'],
      checkinData: { step: 'offered' },
    };
  }

  // =========================================================================
  // STANDARD CBT 1-7 CONVERSATION FLOW
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

  // Turn 1: Empathy & Grounding reflection
  if (turnCount === 1) {
    if (hasRelationship && hasSadness) {
      return {
        text: `ฟังแล้วสัมผัสได้ถึงความน้อยใจเลยนะ... เวลาคนที่เราแคร์ทำตัวนิ่งใส่หรือไม่เป็นอย่างที่หวัง มันเจ็บข้างในมากจริงๆ\n\nตอนที่เกิดเรื่องนี้ขึ้น ในใจลึกๆ คุณอยากให้เขาทำหรือพูดอะไรกับคุณมากที่สุด?`,
      };
    }
    if (hasFamily && (hasSadness || hasAnger)) {
      return {
        text: `เรื่องในครอบครัวมักเป็นเรื่องที่ละเอียดอ่อนและกระทบใจเราได้ลึกที่สุดเนอะ...\n\nอะไรคือคำพูดหรือการกระทำในบ้านที่ทำให้คุณรู้สึกอึดอัดใจมากที่สุดในตอนนี้?`,
      };
    }
    if (hasFriends && hasSadness) {
      return {
        text: `การรู้สึกเหมือนถูกเพื่อนมองข้ามหรือไม่เป็นส่วนหนึ่ง มันชวนให้รู้สึกโดดเดี่ยวและนอยด์จริงๆ นะ...\n\nตอนที่รู้เรื่องนี้ ในหัวมันแวบความคิดอะไรขึ้นมาเป็นอย่างแรก?`,
      };
    }
    if (hasWork && (hasExhaustion || hasAnger)) {
      return {
        text: `เรื่องงานเวลามีเรื่องให้ปวดหัว มันดูดพลังชีวิตเราไปหมดเลยเนอะ...\n\nอะไรคือสิ่งที่ทำให้คุณรู้สึกเหนื่อยหรือหงุดหงิดกับเรื่องนี้มากที่สุดในตอนนี้?`,
      };
    }
    if (hasAnxiety) {
      return {
        text: `ความกังวลใจมันทำให้ข้างในรู้สึกกระวนกระวายและคิดวนไม่หยุดเลยเนอะ...\n\nอะไรคือสิ่งเลวร้ายที่สุดที่คุณกำลังกลัวว่าจะเกิดขึ้นจากเรื่องนี้?`,
      };
    }
    if (hasExhaustion) {
      return {
        text: `เหมือนตอนนี้พลังงานข้างในมันล้าจนไม่อยากแบกอะไรแล้วเนอะ...\n\nความรู้สึกเหนื่อยนี้มันสะสมมาจากเรื่องไหนเป็นพิเศษไหม?`,
      };
    }

    return {
      text: `รับฟังอยู่นะครับ... เรื่อง "${cleanSnippet}" คงกวนใจคุณมาสักพักแล้วใช่ไหม\n\nตอนที่เหตุการณ์นี้เกิดขึ้น ความรู้สึกแรกที่แวบขึ้นมาในใจคืออะไร?`,
    };
  }

  // Turn 2: Separate Fact from Story
  if (turnCount === 2) {
    if (hasAnger || hasSadness) {
      return {
        text: `เข้าใจเลยครับ พอความรู้สึกนั้นเกิดขึ้น สมองเรามักจะเริ่มสร้าง "เรื่องเล่าในหัว" ต่อทันที\n\nตอนนั้นคุณกำลังบอกตัวเองว่ายังไงอยู่บ้าง?`,
      };
    }
    return {
      text: `พอได้ฟังแล้วเห็นภาพชัดขึ้นเลยครับ...\n\nถ้าเราลองแยกดู ระหว่าง "สิ่งที่เป็นความจริงที่เกิดขึ้นตรงๆ" กับ "สิ่งที่เรากำลังคิดกังวลไปเอง" คุณคิดว่า 2 อย่างนี้ต่างกันยังไงบ้าง?`,
    };
  }

  // Turn 3: Identify Habitual Pattern & Hidden Need
  if (turnCount === 3) {
    return {
      text: `สิ่งที่น่าสนใจคือ... ความคิดนั้นมันมักจะพาให้เราเผลอตอบสนองด้วยความเคยชินเดิมๆ (เช่น เงียบ, ประชด, ไถมือถือ, หรือโทษตัวเอง)\n\nเวลาเจอเรื่องแบบนี้ ปกติแล้วคุณมักจะทำอะไรต่อ แล้วผลลัพธ์ที่ตามมามันทำให้สบายใจขึ้นจริงไหม?`,
    };
  }

  // Turn 4: Conscious Choice & Loop Solution
  if (turnCount === 4) {
    return {
      text: `ถ้าเรามองดูสถานการณ์นี้จากมุมมองของเพื่อนที่มีสติ และรักตัวเอง...\n\nคุณคิดว่ามีทางเลือกอื่นที่เราทำได้ โดยที่ไม่ต้องทำร้ายตัวเองหรือเหนื่อยใจแบบเดิมไหม?`,
    };
  }

  // Turn 5+: Mindful Integration & Closure
  return {
    text: `ดีมากๆ เลยที่คุณได้หยุดมองเห็นลูปความคิดของตัวเอง... การมีสติไม่ได้แปลว่าต้องหายโกรธทันที แต่คือการรู้ทันว่าใจกำลังเป็นอะไร\n\nตอนนี้อยากบันทึกลูปนี้เก็บไว้ หรืออยากคุยต่อเรื่องไหนอีกไหม?`,
    options: ['บันทึกเป็นลูปความคิด', 'คุยต่ออีกนิด', 'สบายใจขึ้นแล้ว'],
  };
}

/**
 * Stream AI Response with Guided Check-in Support
 */
export async function streamClientAiResponse(
  history: ChatMessage[],
  currentCheckin: EmotionalCheckinData | undefined,
  onChunk: (text: string) => void,
  onDone: (response: ClientAiResponse) => void
): Promise<void> {
  // If valid API key is available, try direct Gemini API first
  if (VITE_GEMINI_KEY && VITE_GEMINI_KEY.startsWith('AIzaSy')) {
    const geminiSuccess = await callDirectGeminiApi(history, VITE_GEMINI_KEY, onChunk, onDone);
    if (geminiSuccess) return;
  }

  const response = generateDynamicCBTResponse(history, currentCheckin);

  // Stream text smoothly with realistic typewriter effect
  let currentIndex = 0;
  const chunkSize = 3;
  const interval = setInterval(() => {
    if (currentIndex < response.text.length) {
      const nextSlice = response.text.slice(currentIndex, currentIndex + chunkSize);
      onChunk(nextSlice);
      currentIndex += chunkSize;
    } else {
      clearInterval(interval);
      onDone(response);
    }
  }, 16);
}
