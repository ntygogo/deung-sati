import React from 'react';
import { X, Glasses } from 'lucide-react';
import { EmpathyLensView } from './EmpathyLensView';

interface EmpathyLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (initialTopic?: string) => void;
}

export const EmpathyLensModal: React.FC<EmpathyLensModalProps> = ({
  isOpen,
  onClose,
  onStartChat,
}) => {
  if (!isOpen) return null;

  return (
    <div className="jar-modal-overlay" onClick={onClose}>
      <div
        className="jar-modal-card empathy-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="jar-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sim-modal-badge-icon" style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#d97706' }}>
              <Glasses size={20} />
            </div>
            <div>
              <h3 className="jar-modal-title">🪞 แว่นส่องใจอีกฝ่าย (Empathy Lens)</h3>
              <p className="jar-modal-sub">ถอดรหัสจิตวิทยาคนอื่น ➔ เพื่อจัดการใจและสื่อสารอย่างฉลาด</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="empathy-modal-content">
          <EmpathyLensView
            onStartChat={(topic) => {
              onClose();
              if (onStartChat) onStartChat(topic);
            }}
          />
        </div>
      </div>
    </div>
  );
};
