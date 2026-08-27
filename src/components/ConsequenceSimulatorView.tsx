import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  Clock,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Flame,
  MessageCircleHeart,
} from 'lucide-react';

interface SimulationResult {
  tenMinutes: string;
  tenDays: string;
  tenMonthsWorstCase: string;
  realityCheckQuestion: string;
  smartAlternative: string;
  actionableStep: string;
}

interface ConsequenceSimulatorViewProps {
  onStartChat?: (initialTopic?: string) => void;
}

const PRESET_DECISIONS = [
  'อยากพิมพ์ด่าหัวหน้าแล้วลาออกเดี๋ยวนี้เลย',
  'อยากบอกเลิกแฟนตอนที่กำลังโกรธและน้อยใจ',
  'อยากประชดด้วยการเงียบหายไป ไม่อ่านไม่ตอบ',
  'อยากโพสต์ประจานลงโซเชียลให้คนอื่นรู้',
  'อยากแอบหยิบเงินคนอื่นมาใช้ก่อน',
];

export const ConsequenceSimulatorView: React.FC<ConsequenceSimulatorViewProps> = ({ onStartChat }) => {
  const [actionInput, setActionInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionInput.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/simulate-consequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tenMinutes && data.tenMonthsWorstCase) {
          setResult(data);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Simulator API fetch error, applying intelligent fallback:', err);
    }

    // Client-side intelligent context fallback if API fails
    const lower = actionInput.toLowerCase();
    let tenMinutes = 'ได้ทำตามใจชั่ววูบ รู้สึกโล่งหรือสะใจในเสี้ยวนาทีแรกที่ได้ทำสิ่งที่อยากทำ';
    let tenDays = 'เริ่มเผชิญกับผลพวงที่ไม่ได้วางแผนไว้ ความยุ่งยากและความเครียดเริ่มตามมาทีละเรื่อง';
    let tenMonthsWorstCase = 'ผลกระทบสะสมจนกลายเป็นปัญหาเรื้อรัง และต้องเสียเวลาหรือพลังงานชีวิตมหาศาลเพื่อตามแก้สิ่งที่ทำลงไป';
    let realityCheckQuestion = 'การทำสิ่งนี้ตอนนี้ เป็นสิ่งที่ตัวคุณในอนาคตจะขอบคุณ หรือจะนั่งเสียใจ?';
    let smartAlternative = 'ใช้กฎพักใจ 24 ชั่วโมง (24-Hour Rule) อย่าเพิ่งลงมือทำตอนนี้ รอให้อารมณ์ลดลงแล้วค่อยตัดสินใจด้วยสมองส่วนเหตุผล';
    let actionableStep = 'วางมือลง ดื่มน้ำเย็น 1 แก้ว สูดลมหายใจเข้าลึกๆ แล้วลองมองสถานการณ์เหมือนเราเป็นคนนอกที่กำลังให้คำแนะนำเพื่อน';

    if (lower.includes('ขโมย') || lower.includes('เงิน') || lower.includes('ลัก') || lower.includes('แอบเอา')) {
      tenMinutes = 'ได้เงินมาไว้ในมือ รู้สึกโล่งใจชั่ววูบที่ปัญหาเงินเฉพาะหน้าคลี่คลาย แต่ใจจะเริ่มเต้นแรงด้วยความระแวงและกลัวคนรู้';
      tenDays = 'แม่หรือคนในบ้านเริ่มสังเกตเห็นว่าเงินหาย บรรยากาศในบ้านตึงเครียด มีการตั้งข้อสงสัย ความรู้สึกผิดเริ่มกัดกินใจทุกครั้งที่มองหน้าแม่';
      tenMonthsWorstCase = 'ความจริงเปิดเผย สูญเสียความไว้วางใจจากครอบครัวอย่างสิ้นเชิง กลายเป็นตราบาปในใจ และเสียสายสัมพันธ์ที่เงินเท่าไหร่ก็ซื้อคืนไม่ได้';
      realityCheckQuestion = 'เงินจำนวนนี้ แลกกับความไว้ใจ รอยยิ้ม และน้ำตาของแม่... มันคุ้มค่ากับราคาชีวิตที่คุณต้องจ่ายจริงๆ ไหม?';
      smartAlternative = 'บอกแม่ตรงๆ ถึงความจำเป็นที่ต้องใช้เงิน หรือขอคำปรึกษาเรื่องภาระค่าใช้จ่าย แม้จะโดนบ่นแต่ยังรักษาความจริงใจและความไว้ใจไว้ได้';
      actionableStep = 'วางมือจากสิ่งนั้น เดินออกจากห้อง สูดหายใจเข้าลึกๆ 3 ครั้ง แล้วเขียนสิ่งที่จำเป็นต้องใช้เงินลงในกระดาษเพื่อหาทางออกที่ถูกต้อง';
    } else if (lower.includes('ลาออก') || lower.includes('หัวหน้า') || lower.includes('งาน')) {
      tenMinutes = 'สะใจมากที่ได้ตอกหน้าและประกาศว่าจะไม่ทนอีกต่อไป';
      tenDays = 'ต้องเผชิญความกังวลเรื่องเงินเก็บ ขาดรายได้ประจำกะทันหัน และต้องวิ่งหางานใหม่อย่างกดดัน';
      tenMonthsWorstCase = 'เงินสำรองหมด ต้องยอมรับงานที่ไม่ชอบ เสียเครดิตและ Connection ในสายงานเดิม';
      realityCheckQuestion = 'คุณพร้อมรับมือกับความเครียดเรื่องเงินและชีวิตที่ไร้แผนสำรอง จริงๆ หรือแค่อยากให้เขาเห็นว่าคุณมีคุณค่า?';
      smartAlternative = 'ร่างแผนสำรอง (Exit Strategy) ให้พร้อมก่อน ส่งใบสมัครและได้งานใหม่ที่ดียืนยันเรียบร้อย แล้วค่อยยื่นใบลาออกอย่างมืออาชีพและสง่างาม';
      actionableStep = 'จดข้อเรียกร้องหรือปัญหาที่เจอไว้เป็นข้อๆ พัก 1 คืน แล้วนัดคุยเรื่องขอบเขตงานหรือเริ่มส่ง Resume หาที่ใหม่แบบลับๆ';
    } else if (lower.includes('เลิก') || lower.includes('แฟน') || lower.includes('บล็อก')) {
      tenMinutes = 'รู้สึกเหมือนได้เอาคืน ได้ทำให้เขารู้สึกผิดและตระหนักว่าเขากำลังจะเสียเราไป';
      tenDays = 'เกิดความเหงา ความเศร้า และความเสียดาย ยิ่งถ้าเขาปล่อยให้เลิกจริง เราจะกลายเป็นคนที่เจ็บปวดและอยากง้อแต่เสียฟอร์ม';
      tenMonthsWorstCase = 'สูญเสียคนที่รักและความทรงจำดีๆ ที่สร้างร่วมกันมา เพียงเพราะอารมณ์ชั่ววูบในคืนเดียว';
      realityCheckQuestion = 'คุณต้องการจะเลิกกันจริงๆ หรือลึกๆ แค่ต้องการให้เขาหันมาสนใจและแคร์ความรู้สึกคุณมากกว่านี้?';
      smartAlternative = 'แยกความโกรธออกจากความต้องการ บอกเขาตรงๆ ว่า "ตอนนี้เราโกรธมาก ขอเวลาสงบสติอารมณ์สัก 1 ชั่วโมง แล้วค่อยมาคุยกันดีๆ นะ"';
      actionableStep = 'อย่าเพิ่งพิมพ์ข้อความตัดพ้อ ไปอาบน้ำหรือฟังเพลงผ่อนคลายให้หัวใจเต้นช้าลงก่อน';
    } else if (lower.includes('โพสต์') || lower.includes('ประจาน') || lower.includes('โซเชียล')) {
      tenMinutes = 'มีคนเข้ามากดไลก์ คอมเมนต์เข้าข้าง รู้สึกเหมือนมีพวก';
      tenDays = 'เรื่องบานปลาย มีคนแคปหน้าจอไปส่งต่อ กลายเป็นดราม่าที่ควบคุมไม่ได้ และอาจถูกฟ้องร้องหรือเสียภาพลักษณ์';
      tenMonthsWorstCase = 'ดิจิทัลฟุตพริ้นต์ (Digital Footprint) ติดตัว เสียความน่าเชื่อถือในหน้าที่การงานและสายตาคนรอบข้าง';
      realityCheckQuestion = 'การประจาน 1 โพสต์ แลกกับภาพลักษณ์และความสงบสุขในชีวิตของคุณ คุ้มค่ากันจริงหรือ?';
      smartAlternative = 'เคลียร์กันตัวต่อตัว หรือบันทึกหลักฐานไว้เป็นส่วนตัว ไม่ดึงสายตาคนนอกที่ไม่ได้ช่วยแก้ปัญหาเข้ามาในชีวิต';
      actionableStep = 'พิมพ์ระบายในแอพนี้หรือในกระดาษ แล้วกดลบหรือฉีกทิ้ง';
    }

    setResult({
      tenMinutes,
      tenDays,
      tenMonthsWorstCase,
      realityCheckQuestion,
      smartAlternative,
      actionableStep,
    });
    setIsLoading(false);
  };

  const handleReset = () => {
    setActionInput('');
    setResult(null);
  };

  const handleGoToChat = () => {
    if (!onStartChat || !actionInput) return;
    const topicMessage = `เรื่องที่กำลังอยากทำ: "${actionInput}" (เพิ่งเช็ค Worst Case มา อยากชวนคุยหาทางออกต่อ)`;
    onStartChat(topicMessage);
  };

  return (
    <div className="sim-container">
      {/* Header */}
      <div className="sim-header">
        <div className="sim-icon-box">
          <Scale size={24} className="text-primary" />
        </div>
        <div>
          <h3 className="sim-title">กระจกจำลองผลลัพธ์ (Worst-Case Simulator)</h3>
          <p className="sim-sub">ฉายภาพผลลัพธ์ล่วงหน้าใน 10 นาที / 10 วัน / 10 เดือน ด้วย AI ดึงสติ</p>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="sim-preset-chips">
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>สิ่งที่มักเผลอทำตอนอารมณ์ร้อน:</span>
        {PRESET_DECISIONS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            className="sim-chip-btn"
            onClick={() => setActionInput(preset)}
          >
            "{preset.slice(0, 24)}..."
          </button>
        ))}
      </div>

      {/* Form Input */}
      <form onSubmit={handleSimulate} className="sim-form">
        <textarea
          className="sim-textarea"
          rows={3}
          placeholder="พิมพ์สิ่งที่คุณกำลังอยากทำ หรือกำลังจะตัดสินใจทำตอนนี้..."
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          disabled={isLoading}
        />

        <div className="sim-action-row">
          <button
            type="submit"
            className="btn-primary btn-sim-submit"
            disabled={!actionInput.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                <span>AI กำลังจำลองผลลัพธ์และ Worst Case...</span>
              </>
            ) : (
              <>
                <Flame size={16} />
                <span>จำลองผลลัพธ์ & เช็คความเสี่ยง</span>
              </>
            )}
          </button>

          {actionInput && (
            <button type="button" className="btn-control-secondary" onClick={handleReset} title="ล้างข้อความ">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Simulation Results Breakdown */}
      {result && (
        <div className="sim-result-card">
          <h4 className="sim-result-heading">ไทม์ไลน์จำลองผลลัพธ์ (กฎ 10-10-10)</h4>

          {/* Timeline Step 1: 10 Minutes */}
          <div className="timeline-node">
            <div className="timeline-badge ten-mins">
              <Clock size={14} />
              <span>1. ใน 10 นาทีแรก</span>
            </div>
            <div className="timeline-content">
              <span className="timeline-title">ความรู้สึกระยะสั้น:</span>
              <p className="timeline-desc">{result.tenMinutes}</p>
            </div>
          </div>

          {/* Timeline Step 2: 10 Days */}
          <div className="timeline-node">
            <div className="timeline-badge ten-days">
              <Calendar size={14} />
              <span>2. ใน 10 วันข้างหน้า</span>
            </div>
            <div className="timeline-content">
              <span className="timeline-title">ผลกระทบที่เริ่มตามมา:</span>
              <p className="timeline-desc">{result.tenDays}</p>
            </div>
          </div>

          {/* Timeline Step 3: 10 Months (Worst Case) */}
          <div className="timeline-node worst-case">
            <div className="timeline-badge ten-months">
              <AlertTriangle size={14} />
              <span>3. ใน 10 เดือนข้างหน้า (Worst Case)</span>
            </div>
            <div className="timeline-content worst-case-bg">
              <span className="timeline-title text-danger">ราคาแพงที่สุดที่อาจต้องจ่าย:</span>
              <p className="timeline-desc text-danger-dark">{result.tenMonthsWorstCase}</p>
            </div>
          </div>

          {/* Reality Check Question */}
          <div className="sim-reality-question-card">
            <span className="reality-q-tag">⚖️ คำถามกระตุกสติ:</span>
            <p className="reality-q-text">“{result.realityCheckQuestion}”</p>
          </div>

          {/* Smart Alternative */}
          <div className="sim-smart-alt-card">
            <div className="smart-alt-header">
              <ShieldCheck size={18} className="text-primary" />
              <span className="smart-alt-title">ทางออกที่ฉลาดและเซฟตัวเองกว่า (Smart Choice)</span>
            </div>
            <p className="smart-alt-desc">{result.smartAlternative}</p>
            <div className="smart-alt-step">
              <strong>💡 สิ่งที่ควรทำตอนนี้:</strong> {result.actionableStep}
            </div>

            {/* Seamless Transition to Chat */}
            {onStartChat && (
              <button
                type="button"
                className="btn-primary btn-chat-from-sim"
                onClick={handleGoToChat}
              >
                <MessageCircleHeart size={18} />
                <span>กลับไปดึงสติต่อในเรื่องนี้ (คุยกับ AI)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
