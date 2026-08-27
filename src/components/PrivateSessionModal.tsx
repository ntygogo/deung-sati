import React from 'react';
import { Shield, Check, X } from 'lucide-react';

interface PrivateSessionModalProps {
  isPrivate: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const PrivateSessionModal: React.FC<PrivateSessionModalProps> = ({
  isPrivate,
  onToggle,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">
            <Shield size={20} color={isPrivate ? 'var(--primary)' : 'var(--text-muted)'} />
            <span>โหมดคุยแบบไม่บันทึก (Private Session)</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <p className="modal-text">
          เมื่อเปิดโหมดนี้:
        </p>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, padding: 0 }}>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Check size={16} color="var(--choice-text)" style={{ flexShrink: 0, marginTop: 3 }} />
            <span>ข้อความทั้งหมดจะอยู่เฉพาะในหน่วยความจำชั่วคราวขณะคุย</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Check size={16} color="var(--choice-text)" style={{ flexShrink: 0, marginTop: 3 }} />
            <span>เมื่อปิดหน้าจอหรือจบบทสนทนา ข้อความจะถูกลบออกทันที</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Check size={16} color="var(--choice-text)" style={{ flexShrink: 0, marginTop: 3 }} />
            <span>คุณยังคงเลือกกด "บันทึกเฉพาะ Loop Map" ที่ค้นพบได้ตามต้องการ</span>
          </li>
        </ul>

        <button
          className={isPrivate ? 'btn-secondary' : 'btn-primary-small'}
          onClick={() => {
            onToggle();
            onClose();
          }}
          style={{ marginTop: 12 }}
        >
          {isPrivate ? 'ปิดโหมด Private (บันทึกปกติ)' : '🔒 เปิดใช้งานโหมด Private ทันที'}
        </button>
      </div>
    </div>
  );
};
