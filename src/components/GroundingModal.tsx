import React from 'react';
import { X, Wind, Sparkles } from 'lucide-react';
import { BreathingPacer } from './BreathingPacer';

interface GroundingModalProps {
  onClose: () => void;
  onOpenFullExercises?: () => void;
}

export const GroundingModal: React.FC<GroundingModalProps> = ({ onClose, onOpenFullExercises }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content grounding-modal-enhanced" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wind size={20} className="text-primary" />
            <span>พักใจกับลมหายใจด่วน</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Integrated Breathing Pacer */}
        <BreathingPacer />

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
          {onOpenFullExercises && (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                onClose();
                onOpenFullExercises();
              }}
            >
              <Sparkles size={14} />
              <span>เปิดศูนย์ความสงบเต็มรูปแบบ</span>
            </button>
          )}
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '0.86rem' }}>
            กลับสู่การสนทนา
          </button>
        </div>
      </div>
    </div>
  );
};
