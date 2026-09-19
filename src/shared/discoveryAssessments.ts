import type { AssessmentAnswer, AssessmentId, DiscoveryExerciseId, DiscoveryLocale } from './discovery';

export interface LocalText { th: string; en: string }
export const textFor = (text: LocalText, locale: DiscoveryLocale): string => text[locale];
export interface AssessmentDefinition {
  id: AssessmentId;
  version: 1;
  title: LocalText;
  description: LocalText;
  dimensions: Array<{ id: string; title: LocalText; description: LocalText; exerciseId: DiscoveryExerciseId }>;
  items: Array<{ id: string; dimensionId: string; text: LocalText }>;
}

const t = (th: string, en: string): LocalText => ({ th, en });

export const ASSESSMENTS: AssessmentDefinition[] = [
  {
    id: 'self-boundary', version: 1,
    title: t('ช่วงนี้คุณดูแลขอบเขตของตัวเองอย่างไร?', 'How are you caring for your own limits lately?'),
    description: t('สำรวจเวลา พลัง และข้อตกลงกับตัวเอง แล้วเลือกเรื่องเล็ก ๆ ที่อยากลองฝึก', 'Explore your time, energy and agreements with yourself, then choose a small practice.'),
    dimensions: [
      { id: 'notice', title: t('รู้ขีดจำกัด', 'Notice your limits'), description: t('สังเกตพลังและจังหวะที่เริ่มฝืนตัวเอง', 'Notice your capacity and when you start pushing beyond it.'), exerciseId: 'check-capacity' },
      { id: 'choose', title: t('เลือกให้พอกับกำลัง', 'Choose within your capacity'), description: t('ให้กิจกรรมและสิ่งจำเป็นมีพื้นที่พอกับกำลังจริง', 'Make room for activities and needs within your actual capacity.'), exerciseId: 'boundary' },
      { id: 'follow', title: t('ทำตามข้อตกลงกับตัวเอง', 'Follow your own agreements'), description: t('ช่วยให้เริ่ม หยุด และกลับมาตามข้อตกลงได้ง่ายขึ้น', 'Make it easier to begin, stop and return to an agreement.'), exerciseId: 'tiny-step' },
      { id: 'adapt', title: t('ปรับขอบเขตอย่างยืดหยุ่น', 'Adapt your limits'), description: t('ทบทวนข้อตกลงให้เข้ากับสถานการณ์และความต้องการ', 'Review agreements as circumstances and needs change.'), exerciseId: 'kind-self-talk' },
    ],
    items: [
      { id: 'SB01', dimensionId: 'notice', text: t('ฉันสังเกตได้ว่ากิจกรรมที่ทำอยู่เริ่มเกินกำลังของฉัน', 'I noticed when an activity started to exceed my capacity.') },
      { id: 'SB02', dimensionId: 'notice', text: t('ก่อนเพิ่มสิ่งที่ต้องทำ ฉันเช็กเวลาและพลังที่เหลือของตัวเอง', 'Before adding a task, I checked my remaining time and energy.') },
      { id: 'SB03', dimensionId: 'notice', text: t('ฉันแยกได้ว่าตอนนั้นอยากทำต่อ หรือกำลังฝืนตัวเอง', 'I could tell whether I wanted to continue or was pushing myself.') },
      { id: 'SB04', dimensionId: 'choose', text: t('ฉันกำหนดจุดพอให้กิจกรรมที่มักทำเพลินจนเกินกำลัง', 'I set a stopping point for activities I tend to continue beyond my capacity.') },
      { id: 'SB05', dimensionId: 'choose', text: t('ฉันเลือกสิ่งที่จะทำให้พอกับเวลาและพลังที่มีจริง', 'I chose activities that fitted my actual time and energy.') },
      { id: 'SB06', dimensionId: 'choose', text: t('ฉันกันพื้นที่ให้สิ่งจำเป็นของตัวเองในแผนประจำวัน', 'I made room for my own needs in my daily plans.') },
      { id: 'SB07', dimensionId: 'follow', text: t('เมื่อถึงจุดพอที่ตั้งไว้ ฉันหยุดหรือเปลี่ยนกิจกรรมตามข้อตกลง', 'At my chosen stopping point, I stopped or changed activities as agreed with myself.') },
      { id: 'SB08', dimensionId: 'follow', text: t('ฉันจัดสิ่งรอบตัวให้ทำตามขอบเขตได้ง่ายขึ้น', 'I arranged my surroundings to make following my limits easier.') },
      { id: 'SB09', dimensionId: 'follow', text: t('เมื่อเผลอเกินขอบเขต ฉันกลับมาเริ่มทำตามข้อตกลงอีกครั้ง', 'After going beyond a limit, I returned to my agreement.') },
      { id: 'SB10', dimensionId: 'adapt', text: t('เมื่อสถานการณ์เปลี่ยน ฉันทบทวนว่าขอบเขตเดิมยังเหมาะหรือไม่', 'When circumstances changed, I reviewed whether my earlier limit still fitted.') },
      { id: 'SB11', dimensionId: 'adapt', text: t('เมื่อทำไม่ได้ตามข้อตกลง ฉันหาวิธีปรับที่ทำได้จริง', 'When I could not follow an agreement, I looked for a realistic adjustment.') },
      { id: 'SB12', dimensionId: 'adapt', text: t('เวลาทบทวนขอบเขต ฉันนับความต้องการของตัวเองเป็นส่วนหนึ่งของการตัดสินใจ', 'When reviewing my limits, I included my own needs in the decision.') },
    ],
  },
  {
    id: 'emotional-awareness', version: 1,
    title: t('ช่วงนี้คุณเข้าใจอารมณ์ตัวเองอย่างไร?', 'How do you understand your feelings lately?'),
    description: t('สำรวจการสังเกต เรียกชื่อ เข้าใจบริบท และทบทวนการตอบสนอง ทั้งวันที่ยากและวันที่รู้สึกดี', 'Explore noticing, naming, understanding context and reflecting on responses, on good days and difficult days.'),
    dimensions: [
      { id: 'notice', title: t('สังเกตอารมณ์', 'Notice feelings'), description: t('เห็นจังหวะที่ความรู้สึกเปลี่ยน รวมถึงช่วงที่รู้สึกดี', 'Notice changes in feelings, including moments that feel good.'), exerciseId: 'name-emotion' },
      { id: 'name', title: t('เรียกชื่อความรู้สึก', 'Name feelings'), description: t('หาคำใกล้เคียงและรับรู้ว่าหลายความรู้สึกอยู่พร้อมกันได้', 'Find words that fit and allow for more than one feeling at once.'), exerciseId: 'name-emotion' },
      { id: 'context', title: t('เข้าใจบริบท', 'Understand context'), description: t('มองเหตุการณ์ ความคิด และการตีความที่มาพร้อมอารมณ์', 'Look at the events, thoughts and interpretations around a feeling.'), exerciseId: 'facts-story' },
      { id: 'response', title: t('ทบทวนการตอบสนอง', 'Reflect on responses'), description: t('สังเกตแรงอยากทำ สิ่งสำคัญ และผลที่เกิดขึ้นหลังตอบสนอง', 'Notice urges, what matters, and what happens after a response.'), exerciseId: 'tiny-step' },
    ],
    items: [
      { id: 'EA01', dimensionId: 'notice', text: t('ฉันสังเกตได้ว่าอารมณ์เปลี่ยนไป', 'I noticed when my feelings changed.') },
      { id: 'EA02', dimensionId: 'notice', text: t('ฉันหยุดถามตัวเองสั้น ๆ ว่าตอนนี้รู้สึกอะไร', 'I paused to ask what I was feeling.') },
      { id: 'EA03', dimensionId: 'notice', text: t('ฉันสังเกตช่วงเวลาที่รู้สึกดี', 'I noticed moments that felt good.') },
      { id: 'EA04', dimensionId: 'name', text: t('ฉันหาคำที่ใกล้เคียงกับความรู้สึกได้', 'I found a word close to what I felt.') },
      { id: 'EA05', dimensionId: 'name', text: t('ฉันแยกได้ว่ามีความรู้สึกหลายอย่างพร้อมกัน', 'I noticed when I had more than one feeling at once.') },
      { id: 'EA06', dimensionId: 'name', text: t('ฉันบอกได้ว่าความรู้สึกตอนนั้นแรงมากหรือน้อย', 'I could describe how strong my feelings were.') },
      { id: 'EA07', dimensionId: 'context', text: t('ฉันย้อนดูว่าเกิดอะไรขึ้นก่อนอารมณ์เปลี่ยน', 'I looked at what happened before my feelings changed.') },
      { id: 'EA08', dimensionId: 'context', text: t('ฉันแยกสิ่งที่เกิดขึ้นกับสิ่งที่ฉันตีความออกจากกัน', 'I separated what happened from my interpretation.') },
      { id: 'EA09', dimensionId: 'context', text: t('ฉันสังเกตได้ว่าความคิดอะไรเกิดขึ้นพร้อมความรู้สึก', 'I noticed which thoughts came with my feelings.') },
      { id: 'EA10', dimensionId: 'response', text: t('ฉันสังเกตว่าอารมณ์นั้นทำให้อยากทำอะไร', 'I noticed what I felt an urge to do.') },
      { id: 'EA11', dimensionId: 'response', text: t('ฉันลองถามว่าเรื่องนี้เกี่ยวกับสิ่งสำคัญอะไรสำหรับฉัน', 'I asked what might matter to me in the situation.') },
      { id: 'EA12', dimensionId: 'response', text: t('หลังตอบสนองไป ฉันย้อนดูว่าเกิดผลอย่างไร', 'After responding, I looked at what happened next.') },
    ],
  },
];

export function getAssessment(id: AssessmentId): AssessmentDefinition {
  const definition = ASSESSMENTS.find(item => item.id === id);
  if (!definition) throw new Error('Unknown assessment');
  return definition;
}

export const ANSWER_OPTIONS: Array<{ value: Exclude<AssessmentAnswer, null>; label: LocalText }> = [
  { value: 0, label: t('ไม่เคย', 'Never') },
  { value: 1, label: t('บางครั้ง', 'Sometimes') },
  { value: 2, label: t('บ่อยครั้ง', 'Often') },
  { value: 3, label: t('เกือบทุกครั้ง', 'Almost every time') },
  { value: 'na', label: t('ไม่มีสถานการณ์นี้', 'No such situation') },
  { value: 'unsure', label: t('จำไม่ได้ / ไม่แน่ใจ', 'Cannot recall / unsure') },
  { value: 'skip', label: t('ข้ามข้อนี้', 'Skip this question') },
];

export function answerLabel(answer: AssessmentAnswer | undefined, locale: DiscoveryLocale): string {
  const option = ANSWER_OPTIONS.find(item => item.value === answer);
  return option ? textFor(option.label, locale) : textFor(t('ยังไม่ได้ตอบ', 'Not answered'), locale);
}

const isNumericAnswer = (answer: unknown): answer is 0 | 1 | 2 | 3 =>
  typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer <= 3;

export interface AssessmentScore {
  total: number | null;
  max: 36;
  answeredCount: number;
  dimensions: Array<{ id: string; score: number | null; max: 9; answeredCount: number }>;
}

/** Frequencies only. Missing responses are never replaced with zero or extrapolated. */
export function calculateAssessment(definition: AssessmentDefinition, answers: Record<string, AssessmentAnswer>): AssessmentScore {
  const values = definition.items.map(item => answers[item.id]).filter(isNumericAnswer);
  return {
    total: values.length === 12 ? values.reduce<number>((sum, value) => sum + value, 0) : null,
    max: 36, answeredCount: values.length,
    dimensions: definition.dimensions.map(dimension => {
      const dimensionValues = definition.items.filter(item => item.dimensionId === dimension.id).map(item => answers[item.id]).filter(isNumericAnswer);
      return { id: dimension.id, score: dimensionValues.length === 3 ? dimensionValues.reduce<number>((sum, value) => sum + value, 0) : null, max: 9, answeredCount: dimensionValues.length };
    }),
  };
}

export interface AssessmentInterpretation {
  kind: 'incomplete' | 'all-zero' | 'all-max' | 'equal' | 'notice-follow' | 'lower-frequency';
  title: LocalText;
  description: LocalText;
  suggestedDimensionIds: string[];
}

export function interpretAssessment(definition: AssessmentDefinition, answers: Record<string, AssessmentAnswer>): AssessmentInterpretation {
  const result = calculateAssessment(definition, answers);
  if (result.total === null) return { kind: 'incomplete', title: t('เลือกเรื่องที่อยากลองได้ แม้ตอบไม่ครบ', 'You can choose a practice without a full score'), description: t('ยังมีคำตอบที่ไม่ได้ใช้คำนวณ จึงไม่ประมาณคะแนนรวม ด้านที่ตอบเป็นตัวเลขครบจะแสดงคะแนนให้ดู และคุณเลือกเรื่องฝึกเองได้', 'Some responses are unscored, so there is no estimated total. Fully answered areas still show their scores, and you can choose any practice.'), suggestedDimensionIds: [] };
  if (result.total === 0) return { kind: 'all-zero', title: t('ครั้งนี้คุณเลือก “ไม่เคย” ทุกข้อ', 'You selected “Never” for every question'), description: t('ลองดูว่าคำถามตรงกับชีวิตช่วงนี้หรือไม่ ถ้าตรง เลือกหนึ่งพฤติกรรมที่มีพื้นที่ให้ลอง คะแนนนี้ไม่ได้บอกคุณค่าหรือความสามารถทั้งหมดของคุณ', 'Check whether these questions fit your recent life. If they do, choose one behavior you have room to try. This score does not describe your worth or all your abilities.'), suggestedDimensionIds: [] };
  if (result.total === 36) return { kind: 'all-max', title: t('คุณรายงานว่าได้ทำพฤติกรรมเหล่านี้เกือบทุกครั้ง', 'You reported these behaviors almost every time'), description: t('ลองดูว่าสิ่งที่ทำช่วยชีวิตจริงอย่างไร และเลือกเรื่องที่อยากรักษาไว้ คะแนนเต็มไม่ได้แปลว่าเหมาะกับทุกสถานการณ์หรือไม่มีเรื่องให้เรียนรู้ต่อ', 'Consider how these behaviors help in real life and what you want to maintain. A full score does not mean they fit every situation or that there is nothing left to learn.'), suggestedDimensionIds: [] };
  const scores = result.dimensions.map(item => item.score!);
  const minimum = Math.min(...scores);
  const lowest = result.dimensions.filter(item => item.score === minimum).map(item => item.id);
  if (lowest.length === result.dimensions.length) return { kind: 'equal', title: t('ทั้งสี่ด้านมีคะแนนเท่ากันในครั้งนี้', 'All four areas have the same score this time'), description: t('คำตอบไม่ได้ชี้ว่าด้านหนึ่งมีคะแนนน้อยกว่าด้านอื่น เลือกเรื่องที่สำคัญกับชีวิตตอนนี้เป็นจุดเริ่มได้', 'Your answers do not single out one area as lower than the others. Start with the area that matters to your life now.'), suggestedDimensionIds: [] };
  const notice = result.dimensions.find(item => item.id === 'notice');
  const follow = result.dimensions.find(item => item.id === 'follow');
  if (definition.id === 'self-boundary' && notice?.score != null && follow?.score != null && notice.score > follow.score && lowest.includes('follow')) {
    return { kind: 'notice-follow', title: t('รู้ขีดจำกัดแล้ว กำลังฝึกทำตาม', 'Noticing your limits and practicing how to follow them'), description: t('จากคำตอบ คุณรายงานพฤติกรรมด้านรู้ขีดจำกัดบ่อยกว่าด้านทำตามข้อตกลง ลองช่วยให้การลงมือง่ายขึ้น แล้วดูข้อจำกัดในชีวิตจริง คุณเลือกฝึกด้านอื่นได้เช่นกัน', 'Your answers report noticing limits more often than following your agreements. Try making one action easier, while considering real-life constraints. You can choose a different area too.'), suggestedDimensionIds: lowest };
  }
  return { kind: 'lower-frequency', title: t('มีเรื่องให้เลือกลองจากคำตอบครั้งนี้', 'Choose a starting point from these answers'), description: t('ด้านที่มีคะแนนน้อยที่สุดคือพฤติกรรมที่คุณรายงานว่าทำน้อยกว่าเมื่อรวมคำตอบในชุดนี้ ถ้าคะแนนเสมอกัน เราแสดงทุกด้านที่เสมอ คุณเลือกเรื่องอื่นที่สำคัญกว่าได้', 'The lowest-scoring areas contain behaviors you reported less often when these answers are added up. Ties are shown together. You can choose another area that matters more to you.'), suggestedDimensionIds: lowest };
}
