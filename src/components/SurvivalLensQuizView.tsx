import React, { useState } from 'react';
import { Sparkles, RotateCcw, BookOpen, Compass, ChevronRight } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: {
    label: string;
    archetype: 'pleaser' | 'independent' | 'perfectionist' | 'avoidant';
  }[];
}

const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'เวลาเกิดความขัดแย้งหรือบรรยากาศเริ่มตึงเครียด ปฏิกิริยาอัตโนมัติแรกของคุณคืออะไร?',
    options: [
      { label: 'รีบยอม ขอโทษ หรือพยายามทำให้อีกฝ่ายอารมณ์ดี เพื่อให้เรื่องจบเร็วที่สุด', archetype: 'pleaser' },
      { label: 'เงียบ ถอยห่าง หรือตัดการติดต่อ เพราะรู้สึกว่าอยู่ตรงนั้นไม่ปลอดภัย', archetype: 'avoidant' },
      { label: 'หงุดหงิดตัวเอง และพยายามหาทางแก้ไขให้สมบูรณ์แบบเพื่อไม่ให้ใครมาว่าได้', archetype: 'perfectionist' },
      { label: 'บอกตัวเองว่า "ช่างมัน เราจัดการคนเดียวได้" และไม่ยอมพึ่งพาใคร', archetype: 'independent' },
    ],
  },
  {
    id: 2,
    text: 'เมื่อมีคนเข้ามาชื่นชมหรือทำดีกับคุณอย่างจริงใจ คุณมักจะรู้สึกอย่างไรข้างใน?',
    options: [
      { label: 'รู้สึกระแวงหรือไม่คุ้นชิน คิดในใจว่า "เดี๋ยวเขาก็คงผิดหวังในตัวเรา"', archetype: 'avoidant' },
      { label: 'รีบปฏิเสธว่า "ไม่หรอก ฟลุกมากกว่า" เพราะกลัวว่าถ้าพลาดรอบหน้าจะหมดค่า', archetype: 'perfectionist' },
      { label: 'รู้สึกว่าต้องรีบทำอะไรตอบแทนเขาให้คุ้มค่า ไม่งั้นจะรู้สึกผิด', archetype: 'pleaser' },
      { label: 'รู้สึกเกรงใจ อึดอัด และอยากรีบถอยกลับมาอยู่ในพื้นที่ส่วนตัวของตัวเอง', archetype: 'independent' },
    ],
  },
  {
    id: 3,
    text: 'ความเชื่อลึกๆ ที่มักจะแวบขึ้นมาเวลาคุณรู้สึกเหนื่อยล้าหรือท้อแท้คืออะไร?',
    options: [
      { label: '“ถ้าเราไม่มีประโยชน์ ก็คงไม่มีใครอยากอยู่กับเรา”', archetype: 'pleaser' },
      { label: '“โลกนี้ไม่มีใครช่วยเราได้จริง สุดท้ายก็ต้องพึ่งตัวเอง”', archetype: 'independent' },
      { label: '“ถ้าทำได้ไม่ดี ก็ไม่ควรเริ่มตั้งแต่แรก”', archetype: 'perfectionist' },
      { label: '“อย่าไปผูกพันกับใครมากเกินไป เดี๋ยววันหนึ่งเขาก็ไป”', archetype: 'avoidant' },
    ],
  },
  {
    id: 4,
    text: 'เวลาที่คุณทำอะไรผิดพลาด หรือผลลัพธ์ไม่เป็นอย่างที่หวัง?',
    options: [
      { label: 'ก่นด่าตัวเองรุนแรง คิดว่า "เราไม่ดีพอ / เราล้มเหลว"', archetype: 'perfectionist' },
      { label: 'กลัวว่าคนอื่นจะไม่รัก หรือคนรอบข้างจะทิ้งเราไป', archetype: 'pleaser' },
      { label: 'เก็บกดความรู้สึกไว้คนเดียว ไม่เล่าให้ใครฟัง และแกล้งทำเหมือนไม่เป็นไร', archetype: 'independent' },
      { label: 'อยากหนีหายไปที่ไกลๆ หรือเลิกทำสิ่งนั้นไปเลย', archetype: 'avoidant' },
    ],
  },
  {
    id: 5,
    text: 'ในวัยเด็ก สิ่งที่คุณเคยต้องทำเพื่อให้รู้สึกปลอดภัยในบ้านคืออะไรมากที่สุด?',
    options: [
      { label: 'คอยดูสีหน้าผู้ใหญ่ ทำตัวเป็นเด็กดี ไม่สร้างปัญหา', archetype: 'pleaser' },
      { label: 'ทำทุกอย่างให้เก่ง มีผลงาน เพื่อให้ได้รับคำชมหรือความสนใจ', archetype: 'perfectionist' },
      { label: 'ดูแลตัวเองตั้งแต่เด็ก ไม่เรียกร้องอะไรจากใคร', archetype: 'independent' },
      { label: 'ทำตัวเงียบๆ หลบอยู่ในห้อง เพื่อไม่ให้ถูกจับผิดหรือตกเป็นเป้า', archetype: 'avoidant' },
    ],
  },
];

const ARCHETYPE_RESULTS = {
  pleaser: {
    title: '🛡️ เลนส์สายเอาใจเพื่อให้อยู่รอด (The People Pleaser)',
    tag: 'เกราะ: คอยดูสีหน้า & เอาใจคนอื่น',
    origin: 'เกิดจากการที่ในอดีต คุณเคยรู้สึกว่า "ถ้าเราทำตัวดีพอ จะไม่มีใครทะเลาะกัน และไม่มีใครทิ้งเราไป"',
    strength: 'คุณเป็นคนที่เห็นอกเห็นใจคนอื่นสูงมาก ละเอียดอ่อน และเข้าใจความรู้สึกคนรอบข้างได้ไว',
    shadow: 'มักลืมถามความต้องการของตัวเอง ไม่กล้าปฏิเสธ และยอมให้คนอื่นล้ำเส้นจนตัวเองหมดพลัง',
    bookQuote: '“การเป็นคนดี ไม่ได้แปลว่าต้องเปิดประตูให้ทุกคน... การเดินถอยออกมา ไม่ได้ทำให้คุณกลายเป็นคนใจร้าย” (บทที่ 7)',
    healingStep: 'ลองฝึกพูดปฏิเสธเรื่องเล็กๆ 1 เรื่องในสัปดาห์นี้โดยไม่ต้องอธิบายยาว และสังเกตว่าโลกไม่ได้พังลงอย่างที่กลัว',
  },
  independent: {
    title: '🧱 เลนส์ป้อมปราการแบกคนเดียว (The Hyper-Independent)',
    tag: 'เกราะ: พึ่งตัวเอง 100% ไม่ขอใคร',
    origin: 'เกิดจากในอดีต คุณเคยขอความช่วยเหลือแล้วไม่มีใครมา หรือต้องเติบโตมาด้วยการดูแลตัวเองตามลำพัง',
    strength: 'คุณเป็นคนเข้มแข็ง มีวินัย เอาตัวรอดเก่ง และเป็นที่พึ่งพาให้คนอื่นได้เสมอ',
    shadow: 'เหนื่อยล้าสะสม ไม่กล้าแสดงความอ่อนแอ และรู้สึกโดดเดี่ยวแม้จะอยู่ท่ามกลางผู้คน',
    bookQuote: '“คุณไม่จำเป็นต้องแบกทุกอย่างไว้คนเดียว... การอนุญาตให้ใครสักคนยื่นมือเข้ามา ไม่ได้แปลว่าคุณอ่อนแอ”',
    healingStep: 'ลองขอความช่วยเหลือเล็กๆ 1 อย่างจากคนที่คุณไว้ใจ เช่น ให้ช่วยยกของ หรือเล่าความเหนื่อยให้ฟัง 5 นาที',
  },
  perfectionist: {
    title: '⚔️ เลนส์เกราะผลงานสมบูรณ์แบบ (The Perfectionist Shield)',
    tag: 'เกราะ: ต้องไร้ที่ติ ห้ามพลาด',
    origin: 'เกิดจากการที่ในอดีต คุณได้รับความรักหรือการยอมรับเฉพาะเวลาที่คุณทำสำเร็จหรือทำได้ดี',
    strength: 'มีความรับผิดชอบสูง มุ่งมั่น ทำงานประณีต และพัฒนาตัวเองอยู่เสมอ',
    shadow: 'เอาผลงานมาตัดสินคุณค่าความเป็นมนุษย์ เครียดง่าย และกลัวความผิดพลาดจนผัดวันประกันพรุ่ง',
    bookQuote: '“ผลงานมีหน้าที่บอกว่าเราควรพัฒนาตรงไหน... ไม่ใช่บอกว่าเราเป็นมนุษย์ที่มีคุณค่าหรือไม่” (บทที่ 6)',
    healingStep: 'อนุญาตให้ตัวเองทำงานแบบ "Good Enough (ดีพอแล้ว)" 1 ชิ้น โดยไม่ต้องแก้ซ้ำรอบที่ 10 แล้วสังเกตว่าผลลัพธ์ก็ยังผ่านไปได้ด้วยดี',
  },
  avoidant: {
    title: '🧊 เลนส์หมอกควันหลบเลี่ยง (The Detached Avoidant)',
    tag: 'เกราะ: ถอยหนีก่อนจะเจ็บ',
    origin: 'เกิดจากในอดีต ความใกล้ชิดหรือความผูกพันเคยนำมาซึ่งความเจ็บปวด การถูกตัดสิน หรือความอึดอัด',
    strength: 'รักสงบ มองโลกตามความเป็นจริงได้ดี และไม่ตกเป็นเหยื่อของการใช้อารมณ์ครอบงำได้ง่าย',
    shadow: 'เมื่อเจอความสัมพันธ์ที่ดีหรือความรู้สึกปลอดภัย กลับรู้สึกอึดอัดและอยากถอยหนีเพราะไม่คุ้นเคย',
    bookQuote: '“เราไม่ได้เลือกจากสิ่งที่ดีที่สุด แต่เราเลือกจากสิ่งที่คุ้นที่สุด... ความปลอดภัยไม่ได้น่าเบื่อ เราเพียงแค่ยังไม่คุ้นกับมัน” (บทที่ 2)',
    healingStep: 'เมื่อเจอคนที่อ่อนโยนและสม่ำเสมอ อย่าเพิ่งรีบถอย ให้เวลาตัวเองได้สัมผัสความสงบนั้นทีละ 5 นาที',
  },
};

export const SurvivalLensQuizView: React.FC<{ onStartChat?: (topic?: string) => void }> = ({ onStartChat }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [resultArchetype, setResultArchetype] = useState<'pleaser' | 'independent' | 'perfectionist' | 'avoidant' | null>(null);

  const handleSelectOption = (archetype: 'pleaser' | 'independent' | 'perfectionist' | 'avoidant') => {
    const nextAnswers = { ...answers, [currentStep]: archetype };
    setAnswers(nextAnswers);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate most frequent archetype
      const counts: Record<string, number> = { pleaser: 0, independent: 0, perfectionist: 0, avoidant: 0 };
      Object.values(nextAnswers).forEach((arch) => {
        if (arch) counts[arch] = (counts[arch] || 0) + 1;
      });

      let topArch: 'pleaser' | 'independent' | 'perfectionist' | 'avoidant' = 'pleaser';
      let maxCount = -1;
      (Object.keys(counts) as Array<'pleaser' | 'independent' | 'perfectionist' | 'avoidant'>).forEach((k) => {
        if (counts[k] > maxCount) {
          maxCount = counts[k];
          topArch = k;
        }
      });

      setResultArchetype(topArch);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setResultArchetype(null);
  };

  const currentQ = QUIZ_QUESTIONS[currentStep];

  return (
    <div className="survival-quiz-container">
      {/* Header */}
      <div className="survival-quiz-header">
        <div className="survival-icon-box">
          <Compass size={22} className="text-amber-600" />
        </div>
        <div>
          <h3 className="survival-title">แบบสำรวจ: เลนส์เอาตัวรอดที่คุณใส่โดยไม่รู้ตัว</h3>
          <p className="survival-sub">ค้นหาชุดเกราะในวัยเด็กที่คุณเคยใช้เอาตัวรอด และเรียนรู้วิธีปลดเกราะอย่างอ่อนโยน</p>
        </div>
      </div>

      {!resultArchetype ? (
        <div className="quiz-question-card">
          {/* Progress bar */}
          <div className="quiz-progress-bar">
            <div
              className="quiz-progress-fill"
              style={{ width: `${((currentStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
            />
          </div>

          <div className="quiz-step-label">
            <span>คำถามที่ {currentStep + 1} จาก {QUIZ_QUESTIONS.length}</span>
          </div>

          <h4 className="quiz-question-text">{currentQ.text}</h4>

          <div className="quiz-options-list">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className="quiz-option-btn"
                onClick={() => handleSelectOption(opt.archetype)}
              >
                <span className="quiz-option-letter">{String.fromCharCode(65 + idx)}</span>
                <span className="quiz-option-desc">{opt.label}</span>
                <ChevronRight size={16} className="quiz-option-arrow" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Result Screen */
        <div className="quiz-result-wrapper">
          {(() => {
            const res = ARCHETYPE_RESULTS[resultArchetype];
            return (
              <div className="archetype-result-card">
                <div className="archetype-badge-row">
                  <span className="archetype-badge">{res.tag}</span>
                  <button type="button" className="btn-retake-quiz" onClick={handleReset}>
                    <RotateCcw size={13} />
                    <span>ทำแบบทดสอบใหม่</span>
                  </button>
                </div>

                <h3 className="archetype-result-title">{res.title}</h3>

                {/* 1. Origin */}
                <div className="archetype-section">
                  <h5 className="archetype-sec-heading text-amber-700">🌱 ที่มาของเกราะนี้ในวัยเด็ก:</h5>
                  <p className="archetype-sec-text">{res.origin}</p>
                </div>

                {/* 2. Strength & Shadow */}
                <div className="archetype-grid-duo">
                  <div className="archetype-box strength">
                    <h5 className="archetype-box-title text-emerald-700">✨ พลังจุดเด่นของคุณ:</h5>
                    <p className="archetype-box-text">{res.strength}</p>
                  </div>
                  <div className="archetype-box shadow">
                    <h5 className="archetype-box-title text-rose-700">⚠️ จุดที่ทำให้คุณเหนื่อยล้า:</h5>
                    <p className="archetype-box-text">{res.shadow}</p>
                  </div>
                </div>

                {/* 3. Golden Book Quote */}
                <div className="archetype-quote-banner">
                  <BookOpen size={18} className="text-amber-600 flex-shrink-0" />
                  <p className="archetype-quote-text">{res.bookQuote}</p>
                </div>

                {/* 4. Actionable Step */}
                <div className="archetype-action-step">
                  <h5 className="archetype-action-title text-primary">🌿 ก้าวทดลองเล็กๆ สัปดาห์นี้:</h5>
                  <p className="archetype-action-text">{res.healingStep}</p>
                </div>

                {/* Chat CTA */}
                {onStartChat && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ borderRadius: 'var(--radius-full)', padding: '8px 16px', fontSize: '0.84rem' }}
                      onClick={() =>
                        onStartChat(
                          `เพิ่งทำแบบสำรวจเลนส์เอาตัวรอดมา ผลลัพธ์คือ "${res.title}" อยากชวนคุยเพื่อทำความเข้าใจและปลดล็อกเกราะนี้`
                        )
                      }
                    >
                      <Sparkles size={14} className="inline mr-1" />
                      <span>ชวน AI คุยต่อเรื่องเลนส์นี้</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
