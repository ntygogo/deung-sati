export interface LoopEvidence {
  fact: string[];
  feeling: string[];
  body_sensation: string[];
  story: string[];
  fear_or_need: string[];
  action: string[];
  result: string[];
  new_choice: string[];
  unanswered_dimensions: Array<
    'fact' | 'feeling' | 'body_sensation' | 'story' | 'fear_or_need' | 'action' | 'result' | 'new_choice'
  >;
  last_question_dimension: string | null;
  turn_count: number;
}

export function createInitialLoopEvidence(): LoopEvidence {
  return {
    fact: [],
    feeling: [],
    body_sensation: [],
    story: [],
    fear_or_need: [],
    action: [],
    result: [],
    new_choice: [],
    unanswered_dimensions: [
      'fact',
      'feeling',
      'body_sensation',
      'story',
      'fear_or_need',
      'action',
      'result',
      'new_choice',
    ],
    last_question_dimension: null,
    turn_count: 0,
  };
}

const ALL_DIMENSIONS: Array<'fact' | 'feeling' | 'body_sensation' | 'story' | 'fear_or_need' | 'action' | 'result' | 'new_choice'> = [
  'fact',
  'feeling',
  'body_sensation',
  'story',
  'fear_or_need',
  'action',
  'result',
  'new_choice',
];

/**
 * Robust extraction of conversational evidence across all loop dimensions.
 */
export function extractEvidenceFromText(
  userText: string,
  currentState: LoopEvidence
): Partial<LoopEvidence> {
  const text = userText.trim();
  const updates: Partial<LoopEvidence> = {};

  const facts = [...currentState.fact];
  const feelings = [...currentState.feeling];
  const bodySensations = [...currentState.body_sensation];
  const stories = [...currentState.story];
  const fearOrNeeds = [...currentState.fear_or_need];
  const actions = [...currentState.action];
  const results = [...currentState.result];
  const newChoices = [...currentState.new_choice];

  // 1. Fact Extraction (External events, other people's words/actions)
  if (
    /บอกว่า|พูดว่า|ว่าฉัน|ตำหนิ|ด่า|วิจารณ์|งาน.*(ไม่ดี|ไม่ผ่าน)|ให้งาน|สั่งงาน|โยนงาน|ไม่ตอบแชต|ไม่ให้ดูโทรศัพท์|ตัดสาย|บอกเลิก/i.test(
      text
    )
  ) {
    let factFound = '';
    if (/ไม่ดีพอ|ไม่ผ่าน/i.test(text)) {
      factFound = 'ถูกบอกว่างานไม่ดีพอ';
    } else if (/ให้งาน|บอกให้งาน|โยนงาน|สั่งงาน/i.test(text)) {
      factFound = 'หัวหน้ามอบหมาย/สั่งงานเพิ่ม';
    } else if (/พูดต่อหน้า|งานง่ายแค่นี้/i.test(text)) {
      factFound = 'ถูกตำหนิต่อหน้าคนอื่นเรื่องงาน';
    } else if (/ไม่ตอบแชต/i.test(text)) {
      factFound = 'อีกฝ่ายยังไม่ตอบข้อความแชต';
    } else if (/ไม่ยอมให้เช็กโทรศัพท์|ไม่ให้ดู/i.test(text)) {
      factFound = 'แฟนไม่ยอมให้ดูโทรศัพท์';
    } else {
      factFound = text;
    }

    if (factFound && !facts.includes(factFound)) {
      facts.push(factFound);
    }
  }

  // 2. Story / Interpretation Extraction (The user's internal belief about self or other - NOT when user describes external work criticism)
  if (
    (/รู้สึกว่า.*(ตัวเอง|ฉัน|เรา)|คิดว่า.*(ตัวเอง|ฉัน|เรา)|ตัวเอง(ไม่เก่ง|ไม่ดี|ไม่มีค่า|ไร้ค่า)|ฉัน(ไม่เก่ง|ไม่ดี|ไม่มีค่า|ไร้ค่า)|(เขา|เค้า)(เอาเปรียบ|ไม่รัก|เห็นแก่ตัว|มองว่าเราปฏิเสธไม่ได้)/i.test(
      text
    ) &&
    !/งาน.*(ฉัน|ผม).*ไม่ดี/i.test(text))
  ) {
    let storyFound = '';
    if (/ไม่เก่ง|ไม่ดีพอ|ไร้ความสามารถ|ไม่มีค่า/i.test(text)) {
      storyFound = 'คิดว่าตัวเองไม่เก่ง / ไม่ดีพอ';
    } else if (/เอาเปรียบ|จ้องจะแกล้ง/i.test(text)) {
      storyFound = 'เขาเอาเปรียบเรา';
    } else if (/ปฏิเสธไม่ได้|ของตาย/i.test(text)) {
      storyFound = 'เขาเห็นเราเป็นคนที่ปฏิเสธไม่ได้';
    } else if (/ไม่รัก|หมดรัก/i.test(text)) {
      storyFound = 'เขาคงหมดรักฉันแล้ว';
    } else if (/เห็นแก่ตัว/i.test(text)) {
      storyFound = 'เขามีความลับและเห็นแก่ตัว';
    } else {
      storyFound = text;
    }

    if (storyFound && !stories.includes(storyFound)) {
      stories.push(storyFound);
    }
  }

  // 3. Feeling Extraction
  const feelingPatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /โกรธ|โมโห|ฉุน|เคือง/i, label: 'โกรธ' },
    { regex: /อาย|หน้าแตก|ขายหน้า/i, label: 'อาย' },
    { regex: /กลัว|ระแวง|หวั่น/i, label: 'กลัว' },
    { regex: /น้อยใจ|เสียใจ|เศร้า|เจ็บ/i, label: 'น้อยใจ/เสียใจ' },
    { regex: /อึดอัด|เครียด|กดดัน/i, label: 'อึดอัด/เครียด' },
    { regex: /เหนื่อย|ท้อ|หมดแรง|หมดไฟ/i, label: 'เหนื่อย/หมดไฟ' },
    { regex: /รู้สึกไม่มีค่า|ไร้ค่า|แย่มาก/i, label: 'รู้สึกแย่/ไม่มีค่า' },
  ];

  for (const { regex, label } of feelingPatterns) {
    if (regex.test(text) && !feelings.includes(label)) {
      feelings.push(label);
    }
  }

  // 4. Body Sensation Extraction
  const bodyPatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /ตึงหัว|ปวดหัว|มึนหัว/i, label: 'ตึงหัว' },
    { regex: /ตึงหลัง|ปวดหลัง|เมื่อยคอ|ตึงบ่า|บ่า/i, label: 'ตึงบ่า/หลัง' },
    { regex: /แน่นหน้าอก|เจ็บหน้าอก|จุกอก|หน้าอก/i, label: 'แน่นหน้าอก' },
    { regex: /ใจสั่น|ใจเต้นเร็ว|ใจเต้นแรง/i, label: 'ใจสั่น' },
    { regex: /หายใจไม่ออก|หายใจติดขัด/i, label: 'หายใจติดขัด' },
    { regex: /เกร็ง|กำหมัด/i, label: 'เกร็งกล้ามเนื้อ' },
  ];

  for (const { regex, label } of bodyPatterns) {
    if (regex.test(text) && !bodySensations.includes(label)) {
      bodySensations.push(label);
    }
  }

  // 5. Action / Habitual Response Extraction
  if (/เงียบ|ยอม|ก้มหน้า|นั่งคิดวน|ด่ากลับ|ต่อว่า|ดองงาน|ร้องไห้|หนี|ปิดโทรศัพท์/i.test(text)) {
    let act = '';
    if (/ก้มหน้าเงียบ|คิดวน/i.test(text)) act = 'ก้มหน้าเงียบและนั่งคิดวนคนเดียว';
    else if (/ยอมรับงาน|ไม่กล้าปฏิเสธ|ยอมทำ/i.test(text)) act = 'ยอมรับงานมาทำเงียบๆ ไม่กล้าปฏิเสธ';
    else if (/เงียบ/i.test(text)) act = 'เลือกที่จะเงียบ';
    else if (/ด่ากลับ|ต่อว่า/i.test(text)) act = 'ต่อว่า/ตอบโต้ด้วยอารมณ์';
    else act = text;

    if (act && !actions.includes(act)) {
      actions.push(act);
    }
  }

  // 6. Result Extraction
  if (/งานค้าง|หมดไฟ|งานล้น|เหนื่อยคนเดียว|เครียดสะสม|ทะเลาะกัน|ด่าตัวเอง/i.test(text)) {
    let res = '';
    if (/งานค้าง|หมดไฟ/i.test(text)) res = 'งานค้างสะสมและรู้สึกหมดไฟ';
    else if (/งานล้น|เหนื่อยคนเดียว/i.test(text)) res = 'งานล้นมือและแบกความเครียดไว้คนเดียว';
    else if (/ด่าตัวเอง|เจ็บใจ/i.test(text)) res = 'กลับมาตำหนิตัวเองที่บ้าน';
    else res = text;

    if (res && !results.includes(res)) {
      results.push(res);
    }
  }

  // 7. Fear / Need Extraction
  if (/กลัว.*(ด่า|เกลียด|ไล่ออก|ปฏิเสธ|มองไม่ดี)|อยากให้.*(ยอมรับ|เข้าใจ|แฟร์)|ต้องการ/i.test(text)) {
    let fearNeed = '';
    if (/กลัว.*(ปฏิเสธ|เกลียด|มองไม่ดี)/i.test(text)) fearNeed = 'กลัวการถูกมองว่าไม่ให้ความร่วมมือหรือไม่สู้งาน';
    else fearNeed = text;

    if (fearNeed && !fearOrNeeds.includes(fearNeed)) {
      fearOrNeeds.push(fearNeed);
    }
  }

  // 8. New Choice Extraction
  if (/ลอง.*(ลิสต์|คุย|ถาม|ปฏิเสธ|นัด|บอก|ปรับ)/i.test(text)) {
    let choice = '';
    if (/ลิสต์.*ติ|ถาม.*ปรับ|นัดคุย/i.test(text)) choice = 'ลิสต์ข้อคิดเห็นที่ได้รับ แล้วนัดคุยถามจุดที่ต้องปรับให้ชัดเจน';
    else if (/จัดลำดับความสำคัญ/i.test(text)) choice = 'ขอคุยเรื่องการจัดลำดับความสำคัญของงาน';
    else choice = text;

    if (choice && !newChoices.includes(choice)) {
      newChoices.push(choice);
    }
  }

  // Compile updates
  updates.fact = facts;
  updates.feeling = feelings;
  updates.body_sensation = bodySensations;
  updates.story = stories;
  updates.fear_or_need = fearOrNeeds;
  updates.action = actions;
  updates.result = results;
  updates.new_choice = newChoices;

  updates.unanswered_dimensions = ALL_DIMENSIONS.filter((dim) => {
    switch (dim) {
      case 'fact': return facts.length === 0;
      case 'feeling': return feelings.length === 0;
      case 'body_sensation': return bodySensations.length === 0;
      case 'story': return stories.length === 0;
      case 'fear_or_need': return fearOrNeeds.length === 0;
      case 'action': return actions.length === 0;
      case 'result': return results.length === 0;
      case 'new_choice': return newChoices.length === 0;
    }
  });

  return updates;
}
