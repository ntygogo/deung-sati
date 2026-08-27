import React, { useState } from 'react';
import type { LoopMapData } from '../types';
import { X, Check } from 'lucide-react';

interface LoopEditorModalProps {
  loop: LoopMapData;
  onSave: (updatedLoop: LoopMapData) => void;
  onClose: () => void;
}

export const LoopEditorModal: React.FC<LoopEditorModalProps> = ({ loop, onSave, onClose }) => {
  const [eventText, setEventText] = useState(loop.event?.value || '');
  const [feelingText, setFeelingText] = useState(loop.feeling?.value || '');
  const [interpretationText, setInterpretationText] = useState(loop.interpretation?.value || '');
  const [needFearText, setNeedFearText] = useState(loop.needFear?.value || '');
  const [habitualResponseText, setHabitualResponseText] = useState(loop.habitualResponse?.value || '');
  const [habitualResultText, setHabitualResultText] = useState(loop.habitualResult?.value || '');
  const [newChoiceText, setNewChoiceText] = useState(loop.newChoice?.value || '');

  const handleSave = () => {
    const updated: LoopMapData = {
      ...loop,
      event: { value: eventText.trim() || null, sourceType: 'user_explicit' },
      feeling: { value: feelingText.trim() || null, sourceType: 'user_explicit' },
      interpretation: { value: interpretationText.trim() || null, sourceType: 'user_explicit' },
      needFear: { value: needFearText.trim() || null, sourceType: 'user_explicit' },
      habitualResponse: { value: habitualResponseText.trim() || null, sourceType: 'user_explicit' },
      habitualResult: { value: habitualResultText.trim() || null, sourceType: 'user_explicit' },
      newChoice: { value: newChoiceText.trim() || null, sourceType: 'user_explicit' },
      userConfirmed: true,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">
            <span>ปรับแต่งลูปความคิด</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          คุณเป็นเจ้าของความจริงนี้เสมอ แก้ไขคำให้ตรงกับความรู้สึกของคุณที่สุด
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--fact-text)' }}>
              1. เกิดอะไรขึ้นจริง (ข้อเท็จจริง)
            </label>
            <textarea
              className="chat-input"
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              rows={2}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              2. ข้างในเกิดอะไรขึ้น (ความรู้สึก & กาย)
            </label>
            <input
              type="text"
              className="chat-input"
              value={feelingText}
              onChange={(e) => setFeelingText(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--story-text)' }}>
              3. ใจเล่าอะไรต่อ (สิ่งที่สมองแต่ง)
            </label>
            <textarea
              className="chat-input"
              value={interpretationText}
              onChange={(e) => setInterpretationText(e.target.value)}
              rows={2}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              4. ความกลัวหรือความต้องการลึกๆ
            </label>
            <input
              type="text"
              className="chat-input"
              value={needFearText}
              onChange={(e) => setNeedFearText(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              5. แล้วฉันมักทำอะไร (ปฏิกิริยาเดิม)
            </label>
            <input
              type="text"
              className="chat-input"
              value={habitualResponseText}
              onChange={(e) => setHabitualResponseText(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              6. ผลคือ (ผลลัพธ์เดิมที่ตามมา)
            </label>
            <input
              type="text"
              className="chat-input"
              value={habitualResultText}
              onChange={(e) => setHabitualResultText(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--choice-text)' }}>
              7. ทางเลือกใหม่ที่มีสติ (จุดที่เริ่มเลือกได้)
            </label>
            <textarea
              className="chat-input"
              value={newChoiceText}
              onChange={(e) => setNewChoiceText(e.target.value)}
              rows={2}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn-secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn-primary-small" onClick={handleSave}>
            <Check size={16} />
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  );
};
