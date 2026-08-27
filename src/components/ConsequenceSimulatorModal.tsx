import React from 'react';
import { X } from 'lucide-react';
import { ConsequenceSimulatorView } from './ConsequenceSimulatorView';

interface ConsequenceSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (initialTopic?: string) => void;
}

export const ConsequenceSimulatorModal: React.FC<ConsequenceSimulatorModalProps> = ({
  isOpen,
  onClose,
  onStartChat,
}) => {
  if (!isOpen) return null;

  return (
    <div className="jar-modal-overlay" onClick={onClose}>
      <div
        className="jar-modal-card sim-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="jar-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sim-modal-badge-icon">
              <span>🪞😈</span>
            </div>
            <div>
              <h3 className="jar-modal-title">กระจกจำลองผลลัพธ์ (Worst-Case)</h3>
              <p className="jar-modal-sub">ฉายภาพ 10 นาที / 10 วัน / 10 เดือน ก่อนตัดสินใจชั่ววูบ</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* The Full Simulator View */}
        <div className="sim-modal-content">
          <ConsequenceSimulatorView
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
