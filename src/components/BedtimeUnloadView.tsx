import React, { useState } from 'react';
import { soundEngine } from '../services/soundEngine';
import { Moon, Lock, Sparkles, Volume2, Clock, CheckCircle2, RotateCcw, Plus, Trash2 } from 'lucide-react';

export const BedtimeUnloadView: React.FC = () => {
  const [worries, setWorries] = useState<string[]>([
    'งานที่ต้องส่งพรุ่งนี้เช้า',
  ]);
  const [newWorryInput, setNewWorryInput] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [bgSound, setBgSound] = useState<string>('nature-rain');
  const [timerMinutes, setTimerMinutes] = useState<number>(30);

  const handleAddWorry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorryInput.trim()) return;
    setWorries((prev) => [...prev, newWorryInput.trim()]);
    setNewWorryInput('');
  };

  const handleRemoveWorry = (index: number) => {
    setWorries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLockBox = () => {
    setIsLocked(true);
    // Start relaxing sound
    soundEngine.stopAll();
    soundEngine.toggleTrack(bgSound);
    soundEngine.setSleepTimer(timerMinutes);
  };

  const handleReset = () => {
    soundEngine.stopAll();
    setIsLocked(false);
  };

  return (
    <div className="bedtime-container">
      {/* Header */}
      <div className="bedtime-header-card">
        <div className="bedtime-icon-wrapper">
          <Moon size={24} className="text-primary" />
        </div>
        <div>
          <h3 className="bedtime-title">โหมดทิ้งเรื่องค้างคาก่อนนอน (Bedtime Unload)</h3>
          <p className="bedtime-sub">ฝากเรื่องของวันพรุ่งนี้ไว้ในกล่องนี้ แล้วปล่อยให้สมองได้พักผ่อนอย่างแท้จริง</p>
        </div>
      </div>

      {!isLocked ? (
        <div className="bedtime-form-card">
          <span className="bedtime-section-label">
            📝 เรื่องที่ยังค้างคาในหัว หรือกังวลเกี่ยวกับวันพรุ่งนี้:
          </span>

          {/* List of unloads */}
          <div className="worry-items-list">
            {worries.map((worry, idx) => (
              <div key={idx} className="worry-item">
                <span className="worry-item-dot">•</span>
                <span className="worry-item-text">{worry}</span>
                <button
                  type="button"
                  className="btn-remove-worry"
                  onClick={() => handleRemoveWorry(idx)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add input */}
          <form onSubmit={handleAddWorry} className="add-worry-row">
            <input
              type="text"
              className="add-worry-input"
              placeholder="พิมพ์เรื่องที่ยังกังวลอยู่..."
              value={newWorryInput}
              onChange={(e) => setNewWorryInput(e.target.value)}
            />
            <button
              type="submit"
              className="btn-add-worry"
              disabled={!newWorryInput.trim()}
            >
              <Plus size={16} />
              <span>เพิ่ม</span>
            </button>
          </form>

          {/* Sound & Sleep Timer Config */}
          <div className="bedtime-audio-config">
            <div className="audio-sound-select">
              <Volume2 size={15} className="text-secondary" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>เสียงกล่อมนอน:</span>
              <select
                className="bedtime-select"
                value={bgSound}
                onChange={(e) => setBgSound(e.target.value)}
              >
                <option value="nature-rain">🌧️ สายฝนกระทบกระจก</option>
                <option value="freq-432">✨ คลื่น 432 Hz Miracle</option>
                <option value="nature-ocean">🌊 คลื่นทะเลซัดสาด</option>
                <option value="tibetan-bowl">🧘 ขันธิเบตสมาธิ</option>
              </select>
            </div>

            <div className="audio-timer-select">
              <Clock size={15} className="text-secondary" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>เวลาปิด:</span>
              {[15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`timer-chip ${timerMinutes === m ? 'active' : ''}`}
                  onClick={() => setTimerMinutes(m)}
                >
                  {m}น.
                </button>
              ))}
            </div>
          </div>

          {/* Lock Action Button */}
          <button
            type="button"
            className="btn-primary btn-lock-bedtime"
            onClick={handleLockBox}
          >
            <Lock size={16} />
            <span>ล็อกกล่องความกังวล & เริ่มพักผ่อน</span>
          </button>
        </div>
      ) : (
        <div className="bedtime-locked-card">
          <div className="locked-icon-wrapper">
            <CheckCircle2 size={44} className="text-primary" />
          </div>
          <h3 className="locked-title">ทุกเรื่องถูกฝากไว้ในกล่องนี้แล้ว</h3>
          <p className="locked-message">
            หน้าที่ของวันนี้เสร็จสิ้นแล้ว...<br />
            <strong>คุณไม่ต้องแก้ปัญหาอะไรในเวลา 5 ทุ่มนี้อีกต่อไป</strong><br />
            ปล่อยให้วันพรุ่งนี้เป็นคนดูแลตัวมันเองนะ
          </p>

          <div className="playing-status-badge">
            <Sparkles size={14} className="text-primary animate-spin" />
            <span>กำลังเปิดเสียงกล่อมนอน • ตั้งเวลาปิด {timerMinutes} นาที</span>
          </div>

          <button type="button" className="btn-secondary" onClick={handleReset} style={{ marginTop: 16 }}>
            <RotateCcw size={14} />
            <span>ปลดล็อกกล่อง / แก้ไขรายการ</span>
          </button>
        </div>
      )}
    </div>
  );
};
