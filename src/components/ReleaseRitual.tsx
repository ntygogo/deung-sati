import React, { useState } from 'react';
import { Wind, Send, Sparkles, RotateCcw, Heart } from 'lucide-react';

export const ReleaseRitual: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [isReleasing, setIsReleasing] = useState<boolean>(false);
  const [isReleased, setIsReleased] = useState<boolean>(false);

  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isReleasing) return;

    setIsReleasing(true);
    setTimeout(() => {
      setIsReleasing(false);
      setIsReleased(true);
    }, 2400);
  };

  const handleReset = () => {
    setInputText('');
    setIsReleased(false);
  };

  return (
    <div className="release-ritual-container">
      {!isReleased ? (
        <div className="release-card">
          <div className="release-header">
            <div className="release-icon-circle">
              <Wind size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="release-title">กล่องปล่อยวาง (Let It Go)</h3>
              <p className="release-subtitle">พิมพ์เรื่องที่กำลังวนเวียนหรือหนักใจ แล้วส่งมันออกไป</p>
            </div>
          </div>

          <form onSubmit={handleRelease} className="release-form">
            <div className={`release-textarea-wrapper ${isReleasing ? 'dissolving' : ''}`}>
              <textarea
                className="release-textarea"
                rows={4}
                placeholder="เรื่องที่ยังคาใจ... ความกลัว... หรือคำพูดที่ยังกวนใจอยู่ตอนนี้..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isReleasing}
              />
              {isReleasing && (
                <div className="particle-sparkles-overlay">
                  <span className="sparkle s1">✨</span>
                  <span className="sparkle s2">💫</span>
                  <span className="sparkle s3">⭐</span>
                  <span className="sparkle s4">✨</span>
                  <span className="sparkle s5">💫</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`btn-primary btn-release-action ${isReleasing ? 'releasing' : ''}`}
              disabled={!inputText.trim() || isReleasing}
            >
              {isReleasing ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>กำลังสลายความกังวล...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>ปล่อยวางเรื่องนี้</span>
                </>
              )}
            </button>
          </form>

          <p className="release-reassurance">
            🔒 ข้อความนี้จะไม่ถูกบันทึกลงระบบใดๆ ทั้งสิ้น จะถูกทำลายทิ้งทันทีที่คุณกดปล่อยวาง
          </p>
        </div>
      ) : (
        <div className="release-success-card">
          <div className="success-icon-circle">
            <Heart size={36} className="text-primary" />
          </div>
          <h3 className="success-title">เรื่องนี้ถูกวางลงแล้ว</h3>
          <p className="success-message">
            คุณได้ปลดปล่อยความคิดนั้นออกจากหัวแล้ว...<br />
            สูดหายใจลึกๆ 1 ครั้ง ความกังวลนั้นเป็นเพียงเงาชั่วคราว<br />
            <strong>คุณกำลังปลอดภัยและมีพื้นที่ว่างในใจกลับคืนมาแล้ว</strong>
          </p>

          <button className="btn-secondary" onClick={handleReset} style={{ marginTop: 20 }}>
            <RotateCcw size={16} />
            <span>วางเรื่องอื่นต่อ</span>
          </button>
        </div>
      )}
    </div>
  );
};
