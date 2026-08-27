import React, { useState } from 'react';
import {
  Glasses,
  Sparkles,
  Heart,
  Briefcase,
  Users,
  Home,
  Zap,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  MessageCircleHeart,
} from 'lucide-react';

interface EmpathyPerspective {
  title: string;
  explanation: string;
  psychologicalReason: string;
}

interface SmartScript {
  label: string;
  scriptText: string;
  whyItWorks: string;
}

export interface EmpathyLensResult {
  relationshipType: string;
  otherPerspectives: EmpathyPerspective[];
  mirrorToSelf: {
    triggeredCoreEmotion: string;
    underlyingNeed: string;
    cautionTrap: string;
  };
  smartScripts: SmartScript[];
  deungSatiAdvice: string;
}

interface EmpathyLensViewProps {
  onStartChat?: (initialTopic?: string) => void;
}

const RELATIONSHIP_TYPES = [
  { label: 'แฟน / คนรัก', value: 'แฟน / คนรัก', icon: <Heart size={14} /> },
  { label: 'หัวหน้า / ที่ทำงาน', value: 'หัวหน้า / ที่ทำงาน', icon: <Briefcase size={14} /> },
  { label: 'เพื่อน / คนรู้จัก', value: 'เพื่อน / คนรู้จัก', icon: <Users size={14} /> },
  { label: 'ครอบครัว', value: 'ครอบครัว', icon: <Home size={14} /> },
  { label: 'คู่กรณี / คนไม่ชอบหน้า', value: 'คู่กรณี / คนไม่ชอบหน้า', icon: <Zap size={14} /> },
];

const PRESET_SITUATIONS = [
  {
    rel: 'แฟน / คนรัก',
    text: 'แฟนอ่านไม่ตอบ 3 ชม. แล้วตอบกลับมาแค่คำว่า "อืม"',
    reaction: 'อยากพิมพ์ด่าประชดให้รู้ว่าเราไม่พอใจมาก',
  },
  {
    rel: 'หัวหน้า / ที่ทำงาน',
    text: 'หัวหน้าสั่งงานด่วนตอนใกล้เลิกงาน แล้วพูดจาแซะว่าทำงานช้า',
    reaction: 'อยากสวนกลับแรงๆ แล้วยื่นใบลาออกเดี๋ยวนี้',
  },
  {
    rel: 'เพื่อน / คนรู้จัก',
    text: 'เพื่อนทำเป็นพูดดีต่อหน้า แต่พอลับหลังเอาเรื่องส่วนตัวเราไปนินทา',
    reaction: 'อยากโพสต์ประจานให้คนอื่นรู้ธาตุแท้ของมัน',
  },
  {
    rel: 'ครอบครัว',
    text: 'พ่อแม่พูดเปรียบเทียบเรากับลูกคนอื่น แล้วบ่นว่าไม่ได้ดั่งใจ',
    reaction: 'อยากกระแทกประตูห้องแล้วตัดขาดไม่คุยด้วยอีก',
  },
];

export const EmpathyLensView: React.FC<EmpathyLensViewProps> = ({ onStartChat }) => {
  const [selectedRel, setSelectedRel] = useState<string>('แฟน / คนรัก');
  const [situationInput, setSituationInput] = useState<string>('');
  const [reactionInput, setReactionInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EmpathyLensResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situationInput.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/simulate-empathy-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipType: selectedRel,
          situation: situationInput.trim(),
          userReaction: reactionInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.otherPerspectives && data.smartScripts) {
          setResult(data);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Empathy Lens fetch error, using local fallback:', err);
    }

    // Client-side fallback
    setResult({
      relationshipType: selectedRel,
      otherPerspectives: [
        {
          title: 'ภาวะแบตเตอรี่พลังงานหมดเกลี้ยง (Cognitive & Social Overload)',
          explanation: 'อีกฝ่ายอาจกำลังเผชิญกับความเครียดหรือภาระเฉพาะหน้าจนไม่มีพลังงานเหลือพอจะสื่อสารอย่างอ่อนโยน การกระทำของเขาอาจเกิดจากความเหนื่อยล้า ไม่ได้เจตนาทำร้ายเรา',
          psychologicalReason: 'Cognitive Depletion (สมองล้าเกินกว่าจะประคองอารมณ์)',
        },
        {
          title: 'สไตล์การหลบเลี่ยงความกดดัน (Avoidant Coping)',
          explanation: 'เมื่อเขารู้สึกว่ากำลังถูกคาดหวังหรือกังวลว่าจะเกิดการทะเลาะ สัญชาตญาณจะสั่งให้เขาเงียบหรือถอยห่างเพื่อความปลอดภัย',
          psychologicalReason: 'Emotional Withdrawal (การถอยร่นเพื่อตั้งหลัก)',
        },
        {
          title: 'มุมมองและการให้คุณค่าที่ต่างกัน (Perspective Gap)',
          explanation: 'สิ่งที่เรารู้สึกว่าสำคัญมาก เขาอาจจะมองเป็นเรื่องเล็กเพราะใช้ชีวิตด้วยกรอบความคิดคนละแบบ',
          psychologicalReason: 'Perceptual Bias (การมองโลกจากประสบการณ์ตนเอง)',
        },
      ],
      mirrorToSelf: {
        triggeredCoreEmotion: 'ความน้อยใจและความโกรธที่รู้สึกว่าตัวเองไม่ได้รับความสำคัญหรือความเคารพ',
        underlyingNeed: 'ต้องการการยอมรับ (Validation) และการสื่อสารที่ชัดเจนจริงใจ',
        cautionTrap: 'การตอบโต้ด้วยอารมณ์ประชดหรือการด่าทอจะทำให้เขาตั้งการ์ดทันที และทำให้เราเสียความได้เปรียบ',
      },
      smartScripts: [
        {
          label: '🟢 ทางเลือกที่ 1: แบบนิ่งสงบและให้เกียรติ (Calm & Dignified)',
          scriptText: 'เราเข้าใจในมุมคุณนะ แต่เรื่องนี้เราอยากขอเวลาคุยกันด้วยเหตุผลเมื่อทั้งคู่พร้อม',
          whyItWorks: 'ตัดการปะทะด้วยอารมณ์ และดึงสถานการณ์กลับสู่จุดที่มีวุฒิภาวะ',
        },
        {
          label: '🟡 ทางเลือกที่ 2: แบบสื่อสารความรู้สึกอย่างสันติ (NVC Script)',
          scriptText: 'พอเจอแบบนี้เรายอมรับว่ารู้สึกอึดอัดมาก ครั้งหน้าช่วยบอกกันตรงๆ ได้ไหม เราพร้อมรับฟัง',
          whyItWorks: 'พูดความจริงจากใจโดยไม่กล่าวหา ทำให้อีกฝ่ายเปิดใจรับฟังได้ง่ายขึ้น',
        },
        {
          label: '🟣 ทางเลือกที่ 3: แบบตั้งขอบเขตชัดเจน (Firm Boundary)',
          scriptText: 'ถ้ายังไม่พร้อมคุยดีๆ เราขออนุญาตไปพักผ่อนก่อน แล้วค่อยคุยกันใหม่นะ',
          whyItWorks: 'ปกป้องพื้นที่ความสงบของเรา และไม่เต้นตามเกมอารมณ์ของอีกฝ่าย',
        },
      ],
      deungSatiAdvice: 'วางมือถือลง สูดลมหายใจเข้าลึกๆ 3 ครั้ง การนิ่งไว้ก่อน 1 ชั่วโมงจะทำให้คุณถือไพ่เหนือกว่าเสมอครับ',
    });
    setIsLoading(false);
  };

  const handleCopyScript = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleReset = () => {
    setSituationInput('');
    setReactionInput('');
    setResult(null);
  };

  return (
    <div className="empathy-lens-container">
      {!result ? (
        <form onSubmit={handleAnalyze} className="empathy-form-box">
          {/* Header Title */}
          <div className="empathy-form-header">
            <div className="empathy-header-icon">
              <Glasses size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="empathy-title">🪞 แว่นส่องใจอีกฝ่าย (Empathy Lens)</h3>
              <p className="empathy-sub">
                ถอดรหัสจิตวิทยาว่าทำไมเขาถึงทำแบบนั้น ➔ เพื่อให้เราตั้งรับและจัดการใจเราได้อย่างฉลาด
              </p>
            </div>
          </div>

          {/* 1. Relationship Type Selector */}
          <div className="empathy-input-group">
            <label className="empathy-label">1. เลือกความสัมพันธ์:</label>
            <div className="empathy-rel-pills">
              {RELATIONSHIP_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`empathy-rel-pill ${selectedRel === item.value ? 'active' : ''}`}
                  onClick={() => setSelectedRel(item.value)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="empathy-input-group">
            <label className="empathy-label">หรือเลือกสถานการณ์ตัวอย่าง:</label>
            <div className="empathy-presets-row">
              {PRESET_SITUATIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="empathy-preset-chip"
                  onClick={() => {
                    setSelectedRel(preset.rel);
                    setSituationInput(preset.text);
                    setReactionInput(preset.reaction);
                  }}
                >
                  {preset.text}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Situation Textarea */}
          <div className="empathy-input-group">
            <label className="empathy-label" htmlFor="situation-text">
              2. สิ่งที่เขาทำหรือพูด ที่ทำให้คุณรู้สึกแย่ / ค้างคาใจ:
            </label>
            <textarea
              id="situation-text"
              className="empathy-textarea"
              rows={3}
              placeholder="เช่น แฟนอ่านไม่ตอบ 3 ชม. แล้วตอบห้วนๆ ว่า 'อืม' / หัวหน้าสั่งงานแทรกแล้วพูดจาแซะ..."
              value={situationInput}
              onChange={(e) => setSituationInput(e.target.value)}
              required
            />
          </div>

          {/* 3. User Reaction (Optional) */}
          <div className="empathy-input-group">
            <label className="empathy-label" htmlFor="reaction-text">
              3. สิ่งที่คุณอยากทำ หรือกำลังรู้สึกอยู่ในหัวตอนนี้ (ไม่บังคับ):
            </label>
            <input
              id="reaction-text"
              type="text"
              className="empathy-input"
              placeholder="เช่น อยากพิมพ์ด่าประชดให้หน้าหงาย / อยากบล็อกหนีไปเลย..."
              value={reactionInput}
              onChange={(e) => setReactionInput(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-empathy-submit"
            disabled={!situationInput.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Sparkles size={18} className="animate-spin" />
                <span>AI กำลังถอดรหัสจิตวิทยาและกลั่นกรองคำพูด...</span>
              </>
            ) : (
              <>
                <Glasses size={18} />
                <span>🔍 ส่องใจอีกฝ่าย & หาทางออกที่ฉลาด</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Results View */
        <div className="empathy-results-wrapper">
          {/* Header Summary */}
          <div className="empathy-results-header">
            <div className="empathy-rel-tag">
              <span>ความสัมพันธ์: {result.relationshipType}</span>
            </div>
            <h3 className="empathy-result-title">🪞 ผลการถอดรหัสจิตวิทยา & กระจกสะท้อนใจ</h3>
          </div>

          {/* Section 1: 🔍 3 Psychological Perspectives of the Other Person */}
          <div className="empathy-section-card">
            <div className="empathy-section-title">
              <span style={{ fontSize: '1.2rem' }}>🔍</span>
              <h4>1. ถอดรหัสใจอีกฝ่าย (3 ความเป็นไปได้ทางจิตวิทยา):</h4>
            </div>
            <p className="empathy-section-sub">
              ทำความเข้าใจเพื่อ "ไม่นำพฤติกรรมเขามาทำร้ายใจเรา" (Don't Take It Personally)
            </p>

            <div className="empathy-perspectives-grid">
              {result.otherPerspectives.map((p, idx) => (
                <div key={idx} className="empathy-p-card">
                  <div className="empathy-p-badge">มุมมองที่ {idx + 1}</div>
                  <h5 className="empathy-p-title">{p.title}</h5>
                  <p className="empathy-p-desc">{p.explanation}</p>
                  <span className="empathy-p-mech">🔬 กลไก: {p.psychologicalReason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: 🪞 Mirror to Self (Core Emotion & Trap) */}
          <div className="empathy-section-card highlight-mirror">
            <div className="empathy-section-title">
              <span style={{ fontSize: '1.2rem' }}>🪞</span>
              <h4>2. ส่องกระจกกลับมาที่ใจเรา (Self-Reflection):</h4>
            </div>

            <div className="empathy-mirror-grid">
              <div className="mirror-box emotion">
                <span className="mirror-box-label">💔 อารมณ์ลึกๆ ที่ถูกสะกิด:</span>
                <p className="mirror-box-val">{result.mirrorToSelf.triggeredCoreEmotion}</p>
              </div>

              <div className="mirror-box need">
                <span className="mirror-box-label">🌱 ความต้องการที่แท้จริง:</span>
                <p className="mirror-box-val">{result.mirrorToSelf.underlyingNeed}</p>
              </div>

              <div className="mirror-box caution">
                <span className="mirror-box-label">
                  <AlertCircle size={14} className="inline mr-1 text-red-500" />
                  หลุมพรางอารมณ์ที่ห้ามทำ:
                </span>
                <p className="mirror-box-val text-red-700">{result.mirrorToSelf.cautionTrap}</p>
              </div>
            </div>
          </div>

          {/* Section 3: 🛡️ 3 Smart Ready-to-Copy Scripts */}
          <div className="empathy-section-card">
            <div className="empathy-section-title">
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <h4>3. คำพูดสื่อสารอย่างฉลาดและถือไพ่เหนือกว่า (Smart Scripts):</h4>
            </div>
            <p className="empathy-section-sub">
              ประโยคตัวอย่างที่ผ่านการกลั่นกรองจิตวิทยาแล้ว สามารถคัดลอกไปปรับใช้ได้ทันที
            </p>

            <div className="empathy-scripts-list">
              {result.smartScripts.map((s, idx) => (
                <div key={idx} className="empathy-script-item">
                  <div className="script-top-row">
                    <span className="script-label">{s.label}</span>
                    <button
                      type="button"
                      className="btn-copy-script"
                      onClick={() => handleCopyScript(s.scriptText, idx)}
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-emerald-600 font-bold">คัดลอกแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>คัดลอกข้อความ</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="script-content-box">
                    <p className="script-text">“{s.scriptText}”</p>
                  </div>

                  <p className="script-why">💡 <em>{s.whyItWorks}</em></p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: 🌿 Deung Sati Anchor & Next Action */}
          <div className="empathy-advice-box">
            <div className="advice-left">
              <ShieldCheck size={20} className="text-emerald-600" />
              <p className="advice-text">{result.deungSatiAdvice}</p>
            </div>
          </div>

          {/* Actions Bottom Bar */}
          <div className="empathy-bottom-actions">
            <button type="button" className="btn-empathy-back" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>ถอดรหัสสถานการณ์ใหม่</span>
            </button>

            {onStartChat && (
              <button
                type="button"
                className="btn-empathy-chat"
                onClick={() =>
                  onStartChat(
                    `เพิ่งใช้แว่นส่องใจอีกฝ่ายมา เรื่อง: "${situationInput}" อยากชวนคุยและซ้อมคำพูดต่อ`
                  )
                }
              >
                <MessageCircleHeart size={16} />
                <span>ชวน AI คุยต่อเพื่อซ้อมคำพูด</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
