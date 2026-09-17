/**
 * Strict Consent Rules for Guided Emotional Check-in
 *
 * RULE: Ambiguous answers MUST NEVER be treated as consent.
 */

export type ConsentEvaluation = 'affirmative' | 'declined' | 'ambiguous';

// Explicit affirmative confirmation keywords
const AFFIRMATIVE_REGEX =
  /^(\s*(ลองดู|ลองหนึ่งคำถาม|เอาสิ|ลอง|ได้|ตกลง|เอา|โอเค|พร้อม|ช่วยหน่อย|ลองก็ได้|เอาเลย|ลองหน่อย)\s*)$/i;

// Explicit decline keywords
const DECLINE_REGEX =
  /(ยังไม่อยาก|ไม่เอา|คุยต่อ|แบบเดิม|ข้าม|ไม่อยากทำ|ฟังเราต่อ|พักก่อน|ไม่ทำ|ไม่พร้อม|ยังไม่ทำ)/i;

// Ambiguous / hesitant keywords (MUST NOT be treated as consent)
const AMBIGUOUS_REGEX =
  /(ไม่รู้|งง|ไม่แน่ใจ|แล้วแต่|อะไรก็ได้|ไม่รู้เลย|ไม่รู้จะ|ไม่ค่อยแน่ใจ|สับสน|เคว้ง|ตัน)/i;

/**
 * Strictly evaluate user response during Check-in consent phase
 */
export function evaluateCheckinConsent(text: string): ConsentEvaluation {
  const clean = text.trim();
  if (!clean) return 'ambiguous';

  // 1. Explicit affirmative
  if (AFFIRMATIVE_REGEX.test(clean)) {
    return 'affirmative';
  }

  // 2. Explicit decline
  if (DECLINE_REGEX.test(clean)) {
    return 'declined';
  }

  // 3. Ambiguous / hesitant
  if (AMBIGUOUS_REGEX.test(clean)) {
    return 'ambiguous';
  }

  // Default for unrecognized text during consent is ambiguous (safe fallback)
  return 'ambiguous';
}
