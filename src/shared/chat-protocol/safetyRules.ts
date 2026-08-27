/**
 * Crisis Safety Rules & Thai Emergency Hotlines
 * Priority 0 (Absolute Gate): Must execute before all conversational flows.
 */

export const THAI_CRISIS_HOTLINES = [
  {
    org: 'สายด่วนสุขภาพจิต (กรมสุขภาพจิต)',
    phone: '1323',
    desc: 'ปรึกษาภาวะเครียด สิ้นหวัง วิตกกังวล',
    availability: 'โทรฟรี 24 ชั่วโมง',
  },
  {
    org: 'สมาคมสะมาริตันส์แห่งประเทศไทย',
    phone: '02-107-7977',
    desc: 'พื้นที่รับฟังด้วยใจ เพื่อป้องกันการทำร้ายตนเอง',
    availability: '12:00 - 22:00 น.',
  },
  {
    org: 'ศูนย์อุบัติเหตุและการแพทย์ฉุกเฉิน',
    phone: '1669',
    desc: 'เจ็บป่วยฉุกเฉิน ทำร้ายร่างกาย และกู้ชีพ',
    availability: '24 ชั่วโมง',
  },
  {
    org: 'ศูนย์รับแจ้งเหตุด่วนเหตุร้าย (ตำรวจ)',
    phone: '191',
    desc: 'ภัยคุกคามเฉพาะหน้า และเหตุฉุกเฉิน',
    availability: '24 ชั่วโมง',
  },
  {
    org: 'ศูนย์ช่วยเหลือสังคม (พม.)',
    phone: '1300',
    desc: 'วิกฤตความรุนแรงในครอบครัว และความปลอดภัย',
    availability: '24 ชั่วโมง',
  },
];

const CRISIS_KEYWORDS_REGEX =
  /(อยากตาย|ไม่อยากอยู่แล้ว|ทำร้ายตัวเอง|กรีดแขน|กินยาตาย|ฆ่าตัวตาย|กินยาหมดแผง|กินยาให้ตาย|กินยาเกินขนาด|จะกระโดด|ลาโลก|ผูกคอ|แทงตัวเอง|จบชีวิต|ไม่อยากมีชีวิต|ไม่อยากตื่น|อยากหลับไปตลอด|อยากหายไปตลอดกาล|อยากฆ่าตัวตาย)/i;

/**
 * Fast-path check if user message contains immediate self-harm / crisis signs
 */
export function isCrisisMessage(text: string): boolean {
  return CRISIS_KEYWORDS_REGEX.test(text);
}
