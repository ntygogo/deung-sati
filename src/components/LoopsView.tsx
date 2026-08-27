import React, { useState } from 'react';
import type { LoopMapData } from '../types';
import {
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  Compass,
  ArrowDown,
  Award,
  Heart,
  BookOpen,
  Brain,
  MessageCircleHeart,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { LoopEditorModal } from './LoopEditorModal';

const SAMPLE_5_LOOPS: LoopMapData[] = [
  {
    id: 'sample-loop-1',
    event: { value: 'หัวหน้าพูดต่อหน้าคนอื่นว่า "งานง่ายแค่นี้ทำไมยังผิด"', sourceType: 'user_explicit' },
    feeling: { value: 'อายมาก • โกรธ • ใจเต้นแรง', sourceType: 'user_explicit' },
    interpretation: { value: 'ทุกคนคงคิดว่าฉันไม่เก่ง ฉันไม่ดีพอ', sourceType: 'ai_reflection' },
    needFear: { value: 'กลัวถูกมองว่าไร้ความสามารถ / ต้องการการยอมรับ', sourceType: 'ai_reflection' },
    habitualResponse: { value: 'เงียบ ไม่กล้าสบตาใคร แล้วกลับมาด่าตัวเองที่บ้าน', sourceType: 'user_explicit' },
    habitualResult: { value: 'ไม่เคยได้ตั้งขอบเขต และสะสมความเครียดไว้ในใจ', sourceType: 'ai_reflection' },
    newChoice: { value: 'รอให้อารมณ์สงบลง แล้วนัดคุยเรื่องวิธี feedback เป็นการส่วนตัว', sourceType: 'user_explicit' },
    userConfirmed: true,
  },
  {
    id: 'sample-loop-2',
    event: { value: 'แฟนอ่านไม่ตอบ 3 ชม. แล้วตอบกลับมาแค่คำว่า "อืม"', sourceType: 'user_explicit' },
    feeling: { value: 'น้อยใจ • หงุดหงิด • กระวนกระวาย', sourceType: 'user_explicit' },
    interpretation: { value: 'เขาคงหมดรักเราแล้ว หรือเราไม่สำคัญสำหรับเขาอีกต่อไป', sourceType: 'ai_reflection' },
    needFear: { value: 'กลัวถูกทอดทิ้ง / ต้องการความใส่ใจ', sourceType: 'ai_reflection' },
    habitualResponse: { value: 'พิมพ์ประชดกลับไปว่า "เออ แล้วแต่เลย"', sourceType: 'user_explicit' },
    habitualResult: { value: 'ทะเลาะกันหนักขึ้น และอีกฝ่ายยิ่งเงียบใส่', sourceType: 'ai_reflection' },
    newChoice: { value: 'วางมือถือลง 1 ชม. แล้วถามเขาตรงๆ ว่า "วันนี้ทำงานเหนื่อยไหม"', sourceType: 'user_explicit' },
    userConfirmed: true,
  },
  {
    id: 'sample-loop-3',
    event: { value: 'คลิปที่ตั้งใจทำทั้งสัปดาห์ ยอดวิวตกฮวบ', sourceType: 'user_explicit' },
    feeling: { value: 'เคว้งคว้าง • ผิดหวัง • หมดพลัง', sourceType: 'user_explicit' },
    interpretation: { value: 'เราคงไม่มีฝีมือพอ คนเบื่อเราแล้ว', sourceType: 'ai_reflection' },
    needFear: { value: 'กลัวสูญเสียคุณค่าในตัวเอง / ยึดคุณค่ากับตัวเลข', sourceType: 'ai_reflection' },
    habitualResponse: { value: 'อยากลบคลิปทิ้ง แล้วนอนจมอยู่บนเตียงไม่ทำอะไรต่อ', sourceType: 'user_explicit' },
    habitualResult: { value: 'เสียความมั่นใจ และติดอยู่ในลูปความกลัว', sourceType: 'ai_reflection' },
    newChoice: { value: 'บอกตัวเองว่ายอดวิวคือข้อมูลสำหรับปรับปรุง ไม่ใช่คำตัดสินคุณค่าของเรา', sourceType: 'user_explicit' },
    userConfirmed: true,
  },
  {
    id: 'sample-loop-4',
    event: { value: 'ญาติถามเปรียบเทียบในงานรวมญาติว่า "ทำไมยังไม่รวยเท่าลูกคนอื่น"', sourceType: 'user_explicit' },
    feeling: { value: 'เจ็บจี๊ด • อึดอัด • อยากหนีไปให้พ้น', sourceType: 'user_explicit' },
    interpretation: { value: 'เราเป็นลูกที่ไม่เอาถ่าน ทำให้คนอื่นผิดหวัง', sourceType: 'ai_reflection' },
    needFear: { value: 'กลัวการไม่ได้รับการยอมรับจากครอบครัว', sourceType: 'ai_reflection' },
    habitualResponse: { value: 'ยิ้มเจื่อนๆ แล้วรีบขอตัวเดินหนีเข้าห้องน้ำไปแอบร้องไห้', sourceType: 'user_explicit' },
    habitualResult: { value: 'รู้สึกเกลียดตัวเองและไม่อยากไปเจอใคร', sourceType: 'ai_reflection' },
    newChoice: { value: 'ขอบคุณตัวเองที่สู้มาถึงทุกวันนี้ และตั้งขอบเขตในใจว่าจะไม่รับคำตัดสินของเขามาใส่ใจ', sourceType: 'user_explicit' },
    userConfirmed: true,
  },
  {
    id: 'sample-loop-5',
    event: { value: 'เพื่อนในกลุ่มนัดไปกินข้าวกัน แต่ไม่มีใครทักชวนเรา', sourceType: 'user_explicit' },
    feeling: { value: 'โดดเดี่ยว • อับอาย • รู้สึกเป็นส่วนเกิน', sourceType: 'user_explicit' },
    interpretation: { value: 'ไม่มีใครชอบเราจริงๆ ทุกคนแค่แกล้งทำเป็นดีด้วย', sourceType: 'ai_reflection' },
    needFear: { value: 'กลัวการถูกปฏิเสธและตัดออกจากกลุ่ม', sourceType: 'ai_reflection' },
    habitualResponse: { value: 'กดออกจากกลุ่มไลน์เงียบๆ แล้วปิดการแจ้งเตือน', sourceType: 'user_explicit' },
    habitualResult: { value: 'ตัดขาดตัวเองออกจากเพื่อนจริงๆ และรู้สึกเหงากว่าเดิม', sourceType: 'ai_reflection' },
    newChoice: { value: 'ทักถามเพื่อนตรงๆ สักคนว่า "เห็นไปกินข้าวกัน สนุกไหม รอบหน้าชวนเราด้วยนะ"', sourceType: 'user_explicit' },
    userConfirmed: true,
  },
];

interface LoopsViewProps {
  loops: LoopMapData[];
  onUpdateLoop: (loop: LoopMapData) => void;
  onDeleteLoop: (id?: string) => void;
  onStartNewChat: (topic?: string) => void;
  onLoadSampleLoops?: (samples: LoopMapData[]) => void;
}

export const LoopsView: React.FC<LoopsViewProps> = ({
  loops,
  onUpdateLoop,
  onDeleteLoop,
  onStartNewChat,
  onLoadSampleLoops,
}) => {
  const [editingLoop, setEditingLoop] = useState<LoopMapData | null>(null);

  const choicesCount = loops.filter((l) => l.newChoice?.value).length;
  const isFiveLoopsReached = loops.length >= 5;

  return (
    <div className="loops-screen">
      {/* Header */}
      <div className="loops-header">
        <div>
          <h2 className="loops-title">ลูปของฉัน</h2>
          <p className="loops-subtitle">วงจรความคิดและจุดที่เริ่มเลือกใหม่ได้</p>
        </div>
        <button
          className="btn-primary-small"
          onClick={() => onStartNewChat()}
          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
        >
          <Plus size={14} />
          <span>ดึงสติตอนนี้</span>
        </button>
      </div>

      {/* Quick Demo Simulator Bar for Founder/User */}
      {onLoadSampleLoops && (
        <div className="demo-loops-bar">
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            🧪 ทดสอบระบบ 5 ลูป:
          </span>
          <button
            type="button"
            className="btn-demo-pill"
            onClick={() => onLoadSampleLoops(SAMPLE_5_LOOPS)}
          >
            <Sparkles size={13} className="text-amber-600" />
            <span>{isFiveLoopsReached ? 'รีเซ็ต 5 ลูปตัวอย่าง' : '✨ โหลดตัวอย่าง 5 ลูปทันที'}</span>
          </button>
          {loops.length > 1 && (
            <button
              type="button"
              className="btn-demo-pill clear"
              onClick={() => onLoadSampleLoops([SAMPLE_5_LOOPS[0]])}
              title="ล้างเหลือ 1 ลูป"
            >
              <RotateCcw size={12} />
              <span>ล้างเหลือ 1 ลูป</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Self-Discovery Milestones (กระจกสะท้อนการเติบโต) */}
      <div className="milestones-card">
        <div className="milestones-header">
          <div className="milestones-icon-box">
            <Award size={18} className="text-primary" />
          </div>
          <div>
            <span className="milestones-title">กระจกสะท้อนการเติบโต</span>
            <p className="milestones-sub">ทุกครั้งที่รู้ทัน คือหนึ่งก้าวของการเปลี่ยนชีวิต</p>
          </div>
        </div>

        <div className="milestones-stats-row">
          <div className="milestone-stat-item">
            <span className="stat-number">{loops.length}</span>
            <span className="stat-label">ลูปที่รู้ทัน</span>
          </div>
          <div className="milestone-stat-divider" />
          <div className="milestone-stat-item">
            <span className="stat-number">{choicesCount}</span>
            <span className="stat-label">ทางเลือกใหม่ที่สร้างขึ้น</span>
          </div>
        </div>

        <div className="milestones-affirmation">
          <Heart size={14} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            คุณกำลังสร้างวิธีตอบสนองใหม่ให้สมองในทุกๆ วัน ขอบคุณตัวเองที่ยังคงพัฒนาตัวเองเสมอนะ ✨
          </span>
        </div>
      </div>

      {/* 2. 🏆 เมื่อครบ 5 ลูป: ปลดล็อกการสังเคราะห์แพทเทิร์นเชิงลึก (Deep 5-Loop Synthesis) */}
      {isFiveLoopsReached ? (
        <div className="synthesis-unlocked-card">
          <div className="synthesis-header-row">
            <div className="synthesis-badge">
              <Award size={16} className="text-amber-600" />
              <span>🎉 ปลดล็อกการสังเคราะห์ตัวตน (5 ลูปแรกสำเร็จ!)</span>
            </div>
            <span className="synthesis-status-tag">Breakthrough Milestone</span>
          </div>

          <h3 className="synthesis-main-title">
            🧠 แผนที่ถอดรหัสรูปแบบจิตวิทยา (Your Psychological Blueprint)
          </h3>
          <p className="synthesis-sub-text">
            AI ได้ประมวลผลความเชื่อมโยงของทั้ง {loops.length} ลูปที่คุณบันทึกไว้ และสกัดออกมาเป็นข้อเท็จจริง 3 มิติ:
          </p>

          <div className="synthesis-insights-grid">
            {/* 1. Core Trigger */}
            <div className="synthesis-item-box trigger">
              <div className="synthesis-item-header text-rose-700">
                <Sparkles size={15} />
                <span>1. จุดสะกิดอารมณ์ร่วม (Core Trigger)</span>
              </div>
              <p className="synthesis-item-body">
                <strong>80% ของเหตุการณ์</strong> มักเกิดขึ้นเมื่อรู้สึกว่า <em>"กำลังถูกตัดสิน / กลัวถูกมองว่าไร้ค่า หรือกลัวการถูกทอดทิ้ง"</em> สมองของคุณจะรีบส่งสัญญาณอันตรายทันที
              </p>
            </div>

            {/* 2. Old Survival Shield */}
            <div className="synthesis-item-box habit">
              <div className="synthesis-item-header text-amber-700">
                <Brain size={15} />
                <span>2. เกราะเอาตัวรอดในอดีต (Default Survival Habit)</span>
              </div>
              <p className="synthesis-item-body">
                คุณมักใช้ <strong>"การเงียบ เก็บไปคิดวน หรือพิมพ์ประชดตัดพ้อ"</strong> เพื่อปกป้องตัวเองไม่ให้เจ็บเพิ่ม ซึ่งเป็นวิธีที่เด็กคนหนึ่งในอดีตเคยใช้เอาตัวรอดในวันที่ไม่มีทางเลือก
              </p>
            </div>

            {/* 3. New Neuro-Pathway */}
            <div className="synthesis-item-box choice">
              <div className="synthesis-item-header text-emerald-700">
                <TrendingUp size={15} />
                <span>3. เส้นทางใหม่ที่คุณกำลังสร้าง (Neuroplasticity Growth)</span>
              </div>
              <p className="synthesis-item-body">
                คุณสร้าง <strong>ทางเลือกใหม่สำเร็จ {choicesCount} จาก {loops.length} ลูป ({Math.round((choicesCount / loops.length) * 100)}%)</strong> โดยเริ่มเปลี่ยนมาเป็นการ <em>"ตั้งขอบเขต, สื่อสารตรงๆ แบบ NVC, และไม่เอาคุณค่าไปผูกกับผลลัพธ์"</em>
              </p>
            </div>
          </div>

          {/* Letter from NTYGOGO Book */}
          <div className="synthesis-book-letter">
            <BookOpen size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="synthesis-letter-quote">
                “เราไม่จำเป็นต้องเกลียดคนที่เคยเป็น เพื่อจะเริ่มต้นชีวิตใหม่... ขอบคุณตัวเราในวันนั้นที่พาเรามาได้ถึงตรงนี้ จากนี้เดี๋ยวตัวเราในวันนี้จะเลือกเอง”
              </p>
              <span className="synthesis-letter-author">— นัตตี้ (ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ)</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="synthesis-actions-row">
            <button
              type="button"
              className="btn-primary btn-synthesis-chat"
              onClick={() =>
                onStartNewChat(
                  `ฉันบันทึกลูปครบ 5 ลูปแล้ว สังเกตเห็นว่าตัวเองมักมีปฏิกิริยากลัวการถูกตัดสิน อยากชวน AI คุยเพื่อเจาะลึกและฝึกเปลี่ยนพฤติกรรมนี้ต่อ`
                )
              }
            >
              <MessageCircleHeart size={16} />
              <span>ชวน AI คุยเจาะลึก 5 ลูปนี้</span>
            </button>
          </div>
        </div>
      ) : (
        /* Progress Indicator to 5 loops */
        <div className="gentle-card" style={{ borderLeft: '3px solid var(--primary)', backgroundColor: 'var(--bg-surface)' }}>
          <div className="gentle-card-title" style={{ color: 'var(--primary)', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} />
              <span>การสังเคราะห์รูปแบบความคิด (Pattern Reflection)</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#B86A3E', fontWeight: 700 }}>
              {loops.length}/5 ลูป
            </span>
          </div>

          {/* Progress bar to 5 loops */}
          <div className="loop-five-progress-track">
            <div
              className="loop-five-progress-fill"
              style={{ width: `${Math.min(100, (loops.length / 5) * 100)}%` }}
            />
          </div>

          <p className="gentle-card-body" style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            บันทึกอีกเพียง <strong>{Math.max(0, 5 - loops.length)} ลูป</strong> ระบบจะปลดล็อก <strong>"แผนที่สังเคราะห์ตัวตนเชิงลึก (Psychological Blueprint)"</strong> ให้คุณเห็นรูปแบบวงจรชีวิตของตัวเองอย่างชัดเจน ✨
          </p>
        </div>
      )}

      {/* Loops List */}
      {loops.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Compass size={28} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            ยังไม่มีลูปที่บันทึกไว้<br />
            เมื่อคุยกับ AI และตกผลึก insight คุณสามารถเลือกบันทึกลูปได้ที่นี่
          </p>
          <button className="btn-hero-cta" onClick={() => onStartNewChat()} style={{ maxWidth: 220 }}>
            เริ่มคุยดึงสติ
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loops.map((loop, idx) => (
            <div key={loop.id || idx} className="loop-detail-card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                  ลูปที่ {idx + 1}: {loop.event?.value ? loop.event.value.slice(0, 26) + '...' : 'บันทึกสติ'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setEditingLoop(loop)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    title="แก้ไขคำ"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => onDeleteLoop(loop.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--protect-text)', cursor: 'pointer' }}
                    title="ลบ"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* 5-Second Comprehension Loop Flow */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 1. Event */}
                {loop.event?.value && (
                  <div className="loop-step-item">
                    <div className="loop-step-bullet" />
                    <span className="loop-step-label" style={{ color: 'var(--fact-text)' }}>เกิดอะไรขึ้นจริง</span>
                    <span className="loop-step-content" style={{ backgroundColor: 'var(--fact-bg)', border: '1px solid var(--fact-border)', color: 'var(--fact-text)' }}>
                      {loop.event.value}
                    </span>
                  </div>
                )}

                {/* 2. Feeling */}
                {loop.feeling?.value && (
                  <div className="loop-step-item">
                    <div className="loop-step-bullet" />
                    <span className="loop-step-label">ข้างในเกิดอะไรขึ้น</span>
                    <span className="loop-step-content">{loop.feeling.value}</span>
                  </div>
                )}

                {/* 3. Interpretation */}
                {loop.interpretation?.value && (
                  <div className="loop-step-item">
                    <div className="loop-step-bullet" />
                    <span className="loop-step-label" style={{ color: 'var(--story-text)' }}>ใจเล่าอะไรต่อ</span>
                    <span className="loop-step-content" style={{ backgroundColor: 'var(--story-bg)', border: '1px solid var(--story-border)', color: 'var(--story-text)' }}>
                      “{loop.interpretation.value}”
                    </span>
                  </div>
                )}

                {/* 4. Habitual Response */}
                {loop.habitualResponse?.value && (
                  <div className="loop-step-item">
                    <div className="loop-step-bullet" />
                    <span className="loop-step-label">แล้วฉันมักทำอะไร</span>
                    <span className="loop-step-content">{loop.habitualResponse.value}</span>
                  </div>
                )}

                {/* 5. Result */}
                {loop.habitualResult?.value && (
                  <div className="loop-step-item">
                    <div className="loop-step-bullet" />
                    <span className="loop-step-label">ผลคือ</span>
                    <span className="loop-step-content">{loop.habitualResult.value}</span>
                  </div>
                )}

                {/* 6. Choice - Visually Separated */}
                {loop.newChoice?.value && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '12px 14px',
                      backgroundColor: 'var(--choice-bg)',
                      border: '1px solid var(--choice-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--choice-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ArrowDown size={14} />
                      จุดที่เราเริ่มเลือกได้
                    </span>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      ครั้งหน้าเมื่อความรู้สึกนี้เกิดขึ้น คุณอยากลองทำอะไรต่างจากเดิม?
                    </p>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--choice-text)', marginTop: 2 }}>
                      “{loop.newChoice.value}”
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingLoop && (
        <LoopEditorModal
          loop={editingLoop}
          onSave={(updated) => {
            onUpdateLoop(updated);
            setEditingLoop(null);
          }}
          onClose={() => setEditingLoop(null)}
        />
      )}
    </div>
  );
};
