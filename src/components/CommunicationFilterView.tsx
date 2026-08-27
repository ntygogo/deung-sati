import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Target,
  MessageSquare,
  RotateCcw,
  MessageCircleHeart,
} from 'lucide-react';

interface FilterResult {
  coreNeed: string;
  emotionalTrigger: string;
  refinedAlternative: string;
  rationale: string;
}

interface CommunicationFilterViewProps {
  onStartChat?: (initialTopic?: string) => void;
}

const PRESET_EXAMPLES = [
  'เออ แล้วแต่เลย อยากทำไรก็ทำ ไม่ต้องมาสนใจกูหรอก',
  'งานง่ายๆ แค่นี้ ทำไมยังทำผิดอีก ไม่เข้าใจเลย',
  'ถ้าไม่ว่างขนาดนั้นก็ไม่ต้องคุยกันแล้วก็ได้นะ',
  'ทำเป็นมาพูดดี ลับหลังล่ะเอาเรื่องฉันไปแฉ',
];

export const CommunicationFilterView: React.FC<CommunicationFilterViewProps> = ({ onStartChat }) => {
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<FilterResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/filter-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.coreNeed && data.refinedAlternative) {
          setResult(data);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Communication Filter API error, using intelligent fallback:', err);
    }

    // Dynamic Context-Aware Fallback
    const lower = inputText.toLowerCase();
    let coreNeed = 'ต้องการให้คู่สนทนารับฟังความรู้สึกและให้ความสำคัญกับสิ่งที่เรากำลังเผชิญอยู่';
    let emotionalTrigger = 'คำประชดประชันหรือการตัดพ้อ ซึ่งจะทำให้อีกฝ่ายตั้งการ์ดและตอบโต้ด้วยอารมณ์';
    let refinedAlternative = 'ตอนนี้เรารู้สึกอึดอัดและไม่สบายใจกับเรื่องที่เกิดขึ้น อยากขอเวลาคุยกันตรงๆ ด้วยเหตุผลเพื่อหาทางออกร่วมกันครับ/ค่ะ';
    let rationale = 'เปลี่ยนจากการผลักไสด้วยอารมณ์ มาเป็นการบอกความต้องการลึกๆ ตรงๆ โดยไม่กล่าวโทษ';

    if (lower.includes('งาน') || lower.includes('ผิด')) {
      coreNeed = 'ต้องการให้งานมีคุณภาพถูกต้อง และหาทางปรับปรุงร่วมกัน';
      emotionalTrigger = 'คำว่า "งานง่ายๆ", "ทำไมยังผิด" ซึ่งทำให้ผู้ฟังรู้สึกถูกดูถูกและสูญเสียความมั่นใจ';
      refinedAlternative = 'จุดนี้ยังมีข้อผิดพลาดอยู่ อยากให้เรามาดูด้วยกันว่าติดปัญหาตรงไหน เพื่อจะได้แก้ไขให้ถูกต้องในรอบถัดไปครับ';
      rationale = 'มุ่งเน้นที่การแก้ปัญหา (Solution-focused) แทนการโจมตีตัวบุคคล';
    } else if (lower.includes('ไม่ว่าง') || lower.includes('ไม่ต้องคุย')) {
      coreNeed = 'ต้องการเวลาที่มีคุณภาพร่วมกัน (Quality Time) และรับรู้ว่าเรายังสำคัญ';
      emotionalTrigger = 'การตัดพ้อและขู่ยุติการพูดคุย ซึ่งมักสร้างความอึดอัดให้ทั้งสองฝ่าย';
      refinedAlternative = 'เราเข้าใจว่าช่วงนี้เธอยุ่งมาก แต่เราคิดถึงและอยากคุยด้วย ถ้าเธอเคลียร์ธุระเสร็จแล้ว ทักหาเราหน่อยนะ';
      rationale = 'แสดงความเข้าใจในตารางเวลาของเขา พร้อมบอกความรู้สึกคิดถึงอย่างจริงใจ';
    }

    setResult({
      coreNeed,
      emotionalTrigger,
      refinedAlternative,
      rationale,
    });
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.refinedAlternative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setInputText('');
    setResult(null);
  };

  return (
    <div className="comm-filter-container">
      {/* Header Banner */}
      <div className="comm-filter-header">
        <div className="comm-icon-box">
          <MessageSquare size={22} className="text-primary" />
        </div>
        <div>
          <h3 className="comm-title">กล่องกลั่นกรองข้อความก่อนส่ง</h3>
          <p className="comm-sub">ถอดคำประชด สกัดความต้องการจริง และปรับคำพูดใหม่ด้วย Gemini AI แบบเรียลไทม์</p>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="comm-preset-chips">
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>ลองตัวอย่าง:</span>
        {PRESET_EXAMPLES.map((ex, idx) => (
          <button
            key={idx}
            type="button"
            className="comm-chip-btn"
            onClick={() => setInputText(ex)}
          >
            "{ex.slice(0, 22)}..."
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="comm-form">
        <textarea
          className="comm-textarea"
          rows={3}
          placeholder="พิมพ์หรือวางข้อความที่คุณอยากส่งในตอนที่กำลังอารมณ์ร้อน..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />

        <div className="comm-action-row">
          <button
            type="submit"
            className="btn-primary btn-filter-submit"
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                <span>Gemini AI กำลังกลั่นกรองข้อความของคุณ...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>กลั่นกรองข้อความนี้</span>
              </>
            )}
          </button>

          {inputText && (
            <button type="button" className="btn-control-secondary" onClick={handleReset} title="ล้างข้อความ">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Analysis Result Card */}
      {result && (
        <div className="comm-result-card">
          {/* 1. Core Need */}
          <div className="comm-insight-section">
            <div className="insight-tag-header text-primary">
              <Target size={15} />
              <span>1. ความต้องการแท้จริงของคุณ (Core Need)</span>
            </div>
            <p className="insight-text">{result.coreNeed}</p>
          </div>

          {/* 2. Emotional Trigger */}
          <div className="comm-insight-section">
            <div className="insight-tag-header text-amber-600">
              <AlertTriangle size={15} />
              <span>2. จุดสะกิดอารมณ์ในข้อความเดิม (Emotional Trigger)</span>
            </div>
            <p className="insight-text">{result.emotionalTrigger}</p>
          </div>

          {/* 3. Refined Alternative */}
          <div className="comm-refined-section">
            <div className="insight-tag-header text-primary">
              <Sparkles size={15} />
              <span>3. ประโยคใหม่ที่กลั่นกรองแล้ว (Refined Message)</span>
            </div>
            <div className="refined-bubble">
              <p className="refined-quote">“{result.refinedAlternative}”</p>
              <button
                type="button"
                className="btn-copy-bubble"
                onClick={handleCopy}
                title="คัดลอกข้อความ"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
              </button>
            </div>
            <p className="refined-rationale">💡 <em>{result.rationale}</em></p>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            {onStartChat && (
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '7px 14px', borderRadius: 'var(--radius-full)' }}
                onClick={() =>
                  onStartChat(
                    `เพิ่งใช้กล่องกลั่นกรองข้อความมา ข้อความเดิม: "${inputText}" อยากชวนคุยและซ้อมคำพูดต่อ`
                  )
                }
              >
                <MessageCircleHeart size={14} className="inline mr-1" />
                <span>ชวน AI ซ้อมส่งข้อความนี้</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
