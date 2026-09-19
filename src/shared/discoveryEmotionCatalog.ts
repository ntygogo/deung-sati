import type { DiscoveryExerciseId } from './discovery';

export type LocalText = { th: string; en: string };

export interface DiscoveryExercise {
    id: DiscoveryExerciseId;
    title: LocalText;
    description: LocalText;
    steps: LocalText[];
    fields: Array<{
        id: string;
        label: LocalText;
        placeholder: LocalText;
        required: boolean;
    }>;
}

const text = (th: string, en: string): LocalText => ({ th, en });

export const EMOTIONS = [
    { id: 'happy', label: text('มีความสุข', 'Happy') },
    { id: 'calm', label: text('สงบ', 'Calm') },
    { id: 'proud', label: text('ภูมิใจ', 'Proud') },
    { id: 'grateful', label: text('ซาบซึ้ง / ขอบคุณ', 'Grateful') },
    { id: 'sad', label: text('เศร้า / เสียใจ', 'Sad / hurt') },
    { id: 'angry', label: text('โกรธ', 'Angry') },
    { id: 'anxious', label: text('กังวล', 'Anxious') },
    { id: 'tired', label: text('เหนื่อย', 'Tired') },
    { id: 'lonely', label: text('เหงา', 'Lonely') },
    { id: 'confused', label: text('สับสน', 'Confused') },
    { id: 'numb', label: text('ชา / ว่างเปล่า', 'Numb / empty') },
    { id: 'mixed', label: text('หลายความรู้สึกปนกัน', 'Mixed feelings') },
    { id: 'unsure', label: text('ยังหาคำไม่ได้', 'Cannot name it yet') },
] as const;

export const NEEDS = [
    { id: 'rest', label: text('การพัก', 'Rest') },
    { id: 'clarity', label: text('ความชัดเจน', 'Clarity') },
    { id: 'support', label: text('การช่วยเหลือ / รับฟัง', 'Support / being heard') },
    { id: 'space', label: text('พื้นที่ของตัวเอง', 'Personal space') },
    { id: 'connection', label: text('ความสัมพันธ์ / การเชื่อมโยง', 'Connection') },
    { id: 'fairness', label: text('ความเป็นธรรม', 'Fairness') },
    { id: 'autonomy', label: text('การเลือกด้วยตัวเอง', 'Choice') },
    { id: 'meaning', label: text('ความหมาย', 'Meaning') },
    { id: 'celebrate', label: text('การชื่นชม / ฉลองสิ่งดี ๆ', 'Appreciation / celebration') },
    { id: 'unsure', label: text('ยังไม่แน่ใจ', 'Not sure yet') },
] as const;

/** Original reflection activities, not clinical treatments or validated tests. */
export const DISCOVERY_EXERCISES: DiscoveryExercise[] = [
    {
        id: 'check-capacity',
        title: text('เช็กกำลังก่อนตอบรับ', 'Check your capacity'),
        description: text('ดูเวลาและพลังงานที่มี ก่อนเลือกว่าจะรับอะไรเพิ่ม', 'Look at your time and energy before taking on more.'),
        steps: [
            text('เขียนสิ่งที่ต้องดูแลอยู่แล้ว รวมเวลาพักด้วย', 'List what you already need to care for, including rest.'),
            text('เลือกสิ่งที่พอรับไหว และสิ่งที่ต้องลด เลื่อน หรือขอความช่วยเหลือ', 'Choose what fits, and what needs to be smaller, later, or shared.'),
            text('ร่างคำตอบที่ตรงกับกำลังวันนี้ คุณขอเวลาคิดก่อนได้', 'Draft a response that fits today. You can ask for time to decide.'),
        ],
        fields: [
            { id: 'current_load', label: text('ตอนนี้มีอะไรอยู่ในมือแล้ว?', 'What is already on your plate?'), placeholder: text('เช่น งานสองชิ้น นัดหมาย และเวลาพัก', 'For example, two tasks, an appointment, and rest.'), required: true },
            { id: 'available_capacity', label: text('วันนี้พอรับไหวแค่ไหน?', 'What can fit today?'), placeholder: text('เช่น ช่วยตรวจได้หนึ่งหน้า แต่ยังรับเขียนทั้งหมดไม่ไหว', 'I can review one page, but cannot write the whole piece.'), required: true },
            { id: 'response', label: text('อยากตอบหรือปรับแผนอย่างไร?', 'How would you respond or adjust?'), placeholder: text('ขอดูตารางก่อน แล้วจะตอบพรุ่งนี้', 'Let me check my schedule and reply tomorrow.'), required: false },
        ],
    },
    {
        id: 'boundary',
        title: text('วางขอบเขตเล็ก ๆ', 'Set one small boundary'),
        description: text('เลือกสิ่งที่อยากรักษา แล้ววางขอบเขตที่พอลองได้ในสถานการณ์นี้', 'Name what you want to protect, then choose a boundary you can try here.'),
        steps: [
            text('เลือกเรื่องเล็กที่คุณมีทางเลือกและรู้สึกปลอดภัยพอจะลอง', 'Choose a small situation where you have some choice and feel safe enough to try.'),
            text('ระบุสิ่งที่อยากรักษา เช่น เวลาพัก พลังงาน หรือความเป็นส่วนตัว', 'Name what you want to protect, such as rest, energy, or privacy.'),
            text('เติม “ตอนนี้ฉันจะ… ถ้า… ฉันจะ…” โดยเลือกสิ่งที่คุณควบคุมได้', 'Complete “For now, I will… If… I will…” using actions within your control.'),
        ],
        fields: [
            { id: 'protect', label: text('อยากรักษาพื้นที่เรื่องอะไร?', 'What do you want to protect?'), placeholder: text('เวลาพักหลังเลิกงาน', 'Time to rest after work.'), required: true },
            { id: 'boundary_plan', label: text('ขอบเขตที่อยากลอง', 'A boundary to try'), placeholder: text('คืนนี้หยุดงานสองทุ่ม ถ้ามีงานใหม่ ฉันจะจดไว้พิจารณาพรุ่งนี้', 'I will stop work at eight. If new work arrives, I will note it for tomorrow.'), required: true },
            { id: 'words', label: text('ถ้าต้องบอกใคร อยากพูดว่าอะไร? (ข้ามได้)', 'If you need to tell someone, what could you say? (Optional)'), placeholder: text('ฉันช่วยส่วนนี้ได้ ส่วนที่เหลือขอเป็นวันพรุ่งนี้', 'I can help with this part. I would need until tomorrow for the rest.'), required: false },
        ],
    },
    {
        id: 'tiny-step',
        title: text('เลือกก้าวเล็กที่ทำได้', 'Choose a doable next step'),
        description: text('เลือกก้าวที่พอดีกับเวลาและพลังงานวันนี้ การพักหรือขอความช่วยเหลือก็เป็นทางเลือกได้', 'Choose a step that fits today. Resting or asking for help can count, too.'),
        steps: [
            text('ถามว่าตอนนี้มีอะไรที่คุณพอเลือกได้', 'Ask what you have some choice over right now.'),
            text('เลือกหนึ่งอย่างที่เล็กพอกับเวลาและพลังงานวันนี้', 'Choose one thing small enough for today’s time and energy.'),
            text('ระบุว่าจะเริ่มเมื่อไร และจะลดให้เล็กลงอย่างไรถ้ายังไม่ไหว', 'Name when to begin and how to make it smaller if needed.'),
        ],
        fields: [
            { id: 'action', label: text('ก้าวเล็กที่เลือก', 'Your small step'), placeholder: text('เขียนหัวข้องานหนึ่งบรรทัด', 'Write one line for the task.'), required: true },
            { id: 'cue', label: text('จะเริ่มเมื่อไรหรือหลังอะไร?', 'When, or after what, will you start?'), placeholder: text('หลังเก็บแก้วน้ำ', 'After putting my cup away.'), required: true },
            { id: 'smaller_version', label: text('ถ้ายังไม่ไหว ลดเป็นอะไรได้?', 'If that is too much, what is a smaller version?'), placeholder: text('เปิดไฟล์ไว้ก่อน แล้วพัก', 'Open the file, then take a break.'), required: false },
        ],
    },
    {
        id: 'kind-self-talk',
        title: text('พูดกับตัวเองอย่างตรงและอ่อนโยน', 'Be honest and kind to yourself'),
        description: text('เล่าเรื่องที่เกิดขึ้นโดยไม่ตัดสินตัวเองทั้งคน แล้วเลือกสิ่งที่ทำต่อได้', 'Describe what happened without judging your whole self, then choose what comes next.'),
        steps: [
            text('เขียนประโยคที่คุณกำลังพูดกับตัวเอง', 'Write what you are saying to yourself.'),
            text('เปลี่ยนคำตัดสินตัวตนเป็นสิ่งที่เกิดขึ้นครั้งนี้', 'Replace a judgment about yourself with what happened this time.'),
            text('เติมสิ่งที่คุณต้องการหรือทำต่อได้หนึ่งอย่าง ไม่ต้องฝืนคิดบวก', 'Add one thing you need or can do next. You do not have to force a positive thought.'),
        ],
        fields: [
            { id: 'original_words', label: text('ประโยคเดิมในหัว', 'The original words'), placeholder: text('ฉันทำอะไรก็ไม่ดี', 'I never do anything well.'), required: true },
            { id: 'fairer_words', label: text('ประโยคที่ตรงกับเหตุการณ์และอ่อนโยนขึ้น', 'A fairer, kinder description'), placeholder: text('งานนี้ยังไม่เป็นอย่างที่หวัง ฉันขอแก้หนึ่งจุดก่อน', 'This did not go as I hoped. I can revise one part first.'), required: true },
            { id: 'support', label: text('ตอนนี้ต้องการอะไรเพิ่ม? (ข้ามได้)', 'What else would help right now? (Optional)'), placeholder: text('พักก่อน หรือขอให้ใครช่วยดูหนึ่งจุด', 'A break, or someone to review one part.'), required: false },
        ],
    },
    {
        id: 'grounding',
        title: text('กลับมาอยู่กับสิ่งรอบตัว', 'Notice your surroundings'),
        description: text('ใช้สิ่งที่มองเห็นเป็นจุดเริ่มต้น ข้ามหรือหยุดได้หากไม่เหมาะกับคุณตอนนี้', 'Start with what you can see. Skip or stop if this does not fit you right now.'),
        steps: [
            text('มองหาสิ่งรอบตัวที่รู้สึกเป็นกลาง 3 อย่าง', 'Notice three neutral things around you.'),
            text('เลือกหนึ่งอย่าง แล้วบอกรายละเอียดที่เห็น โดยไม่ต้องหลับตา', 'Pick one and describe what you can see. Keep your eyes open if you like.'),
            text('เลือกสิ่งเล็ก ๆ ที่ช่วยให้ตอนนี้สะดวกขึ้น เช่น เปลี่ยนท่านั่งหรือไปมุมเงียบ', 'Choose a small comfort, such as changing position or finding a quieter spot.'),
        ],
        fields: [
            { id: 'noticed', label: text('ตอนนี้สังเกตเห็นอะไร?', 'What do you notice?'), placeholder: text('แก้วสีขาว ขอบโต๊ะ และแสงที่หน้าต่าง', 'A white cup, the edge of a table, and light at the window.'), required: true },
            { id: 'detail', label: text('รายละเอียดของหนึ่งสิ่ง', 'A detail of one thing'), placeholder: text('แก้วมีหูจับโค้งและเงาอยู่ด้านหนึ่ง', 'The cup has a curved handle and a shadow on one side.'), required: false },
            { id: 'comfort', label: text('อยากปรับอะไรให้สะดวกขึ้น?', 'What could feel a little more comfortable?'), placeholder: text('เลื่อนเก้าอี้ หรืออยู่ตรงนี้ต่ออีกสักครู่', 'Move my chair, or stay here a little longer.'), required: false },
        ],
    },
    {
        id: 'facts-story',
        title: text('แยกสิ่งที่เกิดกับสิ่งที่คิด', 'Facts and interpretations'),
        description: text('วางสิ่งที่รู้กับสิ่งที่ยังไม่รู้แยกกัน โดยไม่ปัดความรู้สึกทิ้ง', 'Separate what is known from what is unknown, while making room for your feelings.'),
        steps: [
            text('เขียนสิ่งที่เห็นหรือได้ยินโดยตรงหนึ่งประโยค', 'Write one sentence about what you directly saw or heard.'),
            text('เขียนสิ่งที่คุณตีความไว้อีกช่อง ยังไม่ต้องตัดสินว่าถูกหรือผิด', 'Write your interpretation separately. You do not have to decide whether it is right or wrong yet.'),
            text('ระบุสิ่งที่ยังไม่รู้ และถ้าอยากรู้จะตรวจสอบอย่างไร', 'Name what is still unknown and how you could check it, if you want to.'),
        ],
        fields: [
            { id: 'observed', label: text('สิ่งที่เห็นหรือได้ยินโดยตรง', 'What you directly saw or heard'), placeholder: text('ฉันส่งข้อความตอนเช้า ตอนนี้ยังไม่มีคำตอบ', 'I sent a message this morning and have not received a reply.'), required: true },
            { id: 'interpretation', label: text('สิ่งที่ฉันตีความ', 'My interpretation'), placeholder: text('ฉันคิดว่าเขาอาจไม่อยากคุยกับฉัน', 'I am thinking they may not want to talk to me.'), required: true },
            { id: 'unknown', label: text('สิ่งที่ยังไม่รู้ / วิธีตรวจสอบ', 'What is unknown / how to check'), placeholder: text('ยังไม่รู้ว่าเขาเห็นข้อความหรือยัง อาจถามเมื่อสะดวก', 'I do not know whether they have seen it. I could ask when it is convenient.'), required: false },
        ],
    },
    {
        id: 'savor',
        title: text('เก็บช่วงเวลาที่ดี', 'Notice a good moment'),
        description: text('เก็บสิ่งที่มีความหมายไว้ จะจำไว้เฉย ๆ ก็ได้ ไม่ต้องฝืนรู้สึกขอบคุณ', 'Keep a meaningful moment. Simply remembering is enough; gratitude is not required.'),
        steps: [
            text('เลือกช่วงเวลาที่รู้สึกดี แม้จะเล็กมาก', 'Choose a moment that felt good, however small.'),
            text('ถามว่าอะไรในช่วงนั้นมีความหมายกับคุณ', 'Ask what mattered to you about that moment.'),
            text('เลือกว่าจะเก็บไว้เฉย ๆ หรือเปิดโอกาสให้สิ่งคล้ายกันเกิดอีก', 'Choose whether to simply remember it or make room for something similar.'),
        ],
        fields: [
            { id: 'moment', label: text('ช่วงเวลาที่อยากเก็บไว้', 'A moment to keep'), placeholder: text('ได้คุยกับเพื่อนโดยไม่ต้องรีบ', 'Talking with a friend without rushing.'), required: true },
            { id: 'what_mattered', label: text('อะไรมีความหมายกับคุณ?', 'What mattered to you?'), placeholder: text('ได้รู้สึกว่าเราเป็นตัวเองได้', 'Feeling that I could be myself.'), required: true },
            { id: 'repeat_opportunity', label: text('อยากเก็บไว้หรือทำอะไรต่อ? (ข้ามได้)', 'Remember it or do something next? (Optional)'), placeholder: text('เก็บความทรงจำนี้ไว้ หรือชวนคุยกันอีกวัน', 'Keep the memory, or make time to talk another day.'), required: false },
        ],
    },
    {
        id: 'name-emotion',
        title: text('หาคำให้ความรู้สึก', 'Find words for a feeling'),
        description: text('ลองหาคำใกล้เคียง จะมีหลายคำหรือยังไม่แน่ใจก็ได้', 'Try words that come close. Several words, or uncertainty, are welcome.'),
        steps: [
            text('นึกถึงเรื่องหนึ่งที่เกิดขึ้น จะเป็นเรื่องดี เรื่องยาก หรือปนกันก็ได้', 'Think of one moment: pleasant, difficult, or mixed.'),
            text('ลองเลือกหรือเขียนคำที่ใกล้เคียงกับความรู้สึก ไม่ต้องตรงทันที', 'Try words close to what you feel. They do not need to fit perfectly yet.'),
            text('เขียนสิ่งที่ทำให้คำนี้ใกล้เคียง หรือบอกว่ายังหาคำไม่ได้ แล้วเลือกว่าจะพักหรือสำรวจต่อ', 'Write what makes that word fit, or say you cannot name it yet. Choose whether to pause or explore further.'),
        ],
        fields: [
            { id: 'moment', label: text('กำลังนึกถึงช่วงเวลาไหน?', 'Which moment are you thinking of?'), placeholder: text('หลังได้คำชม หรือหลังมีความเห็นไม่ตรงกัน', 'After receiving praise, or after a disagreement.'), required: true },
            { id: 'feeling_words', label: text('คำที่ใกล้เคียง หรือสิ่งที่ยังไม่แน่ใจ', 'Words that fit, or what is still unclear'), placeholder: text('ภูมิใจปนกังวล / ยังหาคำไม่ได้', 'Proud and worried / I cannot name it yet.'), required: true },
            { id: 'why_it_fits', label: text('อะไรทำให้คำนี้ใกล้เคียง? (ข้ามได้)', 'What makes those words fit? (Optional)'), placeholder: text('ดีใจที่ทำได้ แต่ยังไม่รู้ว่าต่อไปจะเป็นอย่างไร', 'Glad I did it, but unsure about what happens next.'), required: false },
        ],
    },
];

export const getDiscoveryExercise = (id: DiscoveryExerciseId): DiscoveryExercise | undefined =>
    DISCOVERY_EXERCISES.find(exercise => exercise.id === id);
