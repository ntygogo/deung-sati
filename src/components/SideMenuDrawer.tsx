import React from 'react';
import {
  X,
  User,
  Shield,
  Globe,
  Crown,
  Download,
  BookOpen,
  MessageCircle,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenSubscribe: () => void;
  isPrivateSession: boolean;
  onTogglePrivateSession: () => void;
}

export const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenProfile,
  onOpenSubscribe,
  isPrivateSession,
  onTogglePrivateSession,
}) => {
  const { currentUser, isLoggedIn, isPlus, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  if (!isOpen) return null;

  const handleExportBackup = () => {
    try {
      const dataStr = localStorage.getItem('deung_sati_loops_v1') || '[]';
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deung_sati_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Backup failed:', e);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-brand">
            <span className="brand-dot" />
            <span className="drawer-title">เมนู & การตั้งค่า</span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
          {/* 1. Account / Profile Card */}
          <div className="drawer-section drawer-account-section">
            {isLoggedIn && currentUser ? (
              <div className="drawer-user-card" onClick={() => { onClose(); onOpenProfile(); }}>
                <div className="drawer-avatar">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="drawer-user-info">
                  <div className="drawer-user-name-row">
                    <span className="drawer-user-name">{currentUser.name}</span>
                    {isPlus && <span className="drawer-tier-badge">⭐ Plus</span>}
                  </div>
                  <span className="drawer-user-email">{currentUser.email}</span>
                </div>
                <ChevronRight size={18} className="drawer-arrow" />
              </div>
            ) : (
              <div className="drawer-guest-card">
                <div className="drawer-guest-text">
                  <span className="drawer-guest-title">เข้าสู่ระบบเพื่อบันทึกข้อมูล</span>
                  <span className="drawer-guest-desc">ซิงค์ประวัติลูปและความคืบหน้าได้ทุกอุปกรณ์</span>
                </div>
                <button
                  type="button"
                  className="drawer-login-btn"
                  onClick={() => { onClose(); onOpenAuth(); }}
                >
                  <User size={16} />
                  <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Privacy & Preferences */}
          <div className="drawer-section">
            <span className="drawer-section-title">ความเป็นส่วนตัวและการแสดงผล</span>

            {/* Private Mode Switch */}
            <div className="drawer-item" onClick={onTogglePrivateSession}>
              <div className="drawer-item-icon">
                <Shield size={18} color={isPrivateSession ? '#059669' : 'var(--text-secondary)'} />
              </div>
              <div className="drawer-item-info">
                <span className="drawer-item-label">โหมดส่วนตัว (Private Mode)</span>
                <span className="drawer-item-sub">
                  {isPrivateSession ? 'กำลังเปิดใช้งาน (ไม่บันทึกลงเครื่อง)' : 'ปิดอยู่ (บันทึกลูปลงเครื่อง)'}
                </span>
              </div>
              <div className={`drawer-switch ${isPrivateSession ? 'active' : ''}`}>
                <div className="drawer-switch-thumb" />
              </div>
            </div>

            {/* Language Selector */}
            <div className="drawer-item-lang">
              <div className="drawer-item-lang-left">
                <Globe size={18} color="var(--text-secondary)" />
                <span className="drawer-item-label">{t('lang')}</span>
              </div>
              <div className="drawer-lang-pills">
                <button
                  type="button"
                  className={`drawer-lang-pill ${language === 'th' ? 'active' : ''}`}
                  onClick={() => setLanguage('th')}
                >
                  🇹🇭 ไทย
                </button>
                <button
                  type="button"
                  className={`drawer-lang-pill ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>

          {/* 3. Plus Membership */}
          <div className="drawer-section">
            <span className="drawer-section-title">สิทธิพิเศษ</span>
            <div
              className={`drawer-plus-card ${isPlus ? 'is-plus' : ''}`}
              onClick={() => { onClose(); onOpenSubscribe(); }}
            >
              <div className="drawer-plus-icon">
                <Crown size={20} />
              </div>
              <div className="drawer-plus-info">
                <span className="drawer-plus-title">
                  {isPlus ? 'สมาชิก ดึงสติ Plus ⭐' : 'อัปเกรดเป็น ดึงสติ Plus'}
                </span>
                <span className="drawer-plus-desc">
                  {isPlus
                    ? 'คุณปลดล็อกทุกฟีเจอร์เรียบร้อยแล้ว'
                    : 'คุยแชทลึกซึ้งไม่จำกัด & วิเคราะห์ลูปขั้นสูง'}
                </span>
              </div>
              <ChevronRight size={18} className="drawer-arrow" />
            </div>
          </div>

          {/* 4. Data & Backup */}
          <div className="drawer-section">
            <span className="drawer-section-title">ข้อมูลและสำรอง</span>
            <button
              type="button"
              className="drawer-action-row"
              onClick={handleExportBackup}
            >
              <Download size={17} />
              <span>ส่งออกข้อมูลลูปทั้งหมด (JSON)</span>
            </button>
          </div>

          {/* 5. Book & Creator Info */}
          <div className="drawer-section drawer-about-section">
            <span className="drawer-section-title">เกี่ยวกับผู้เขียน & หนังสือ</span>
            <div className="drawer-about-box">
              <div className="drawer-about-header">
                <BookOpen size={16} color="var(--primary)" />
                <span className="drawer-about-book-title">ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ</span>
              </div>
              <span className="drawer-about-author">โดย นัตตี้ (NTYGOGO)</span>
              <p className="drawer-about-desc">
                แอปพลิเคชันนี้สร้างขึ้นเพื่อเป็นเครื่องมือช่วยดึงสติ แยกแยะความจริงกับความคิด และคืนความนิ่งให้ใจในชีวิตประจำวัน
              </p>
              <a
                href="https://lin.ee/snQhce5"
                target="_blank"
                rel="noreferrer"
                className="drawer-line-btn"
              >
                <MessageCircle size={15} />
                <span>ติดต่อ / ติดตามทาง LINE (@ntygogo)</span>
              </a>
            </div>
          </div>

          {/* 6. Logout if logged in */}
          {isLoggedIn && (
            <div className="drawer-section">
              <button
                type="button"
                className="drawer-logout-btn"
                onClick={() => { logout(); onClose(); }}
              >
                <LogOut size={16} />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <div className="drawer-footer-badge">
            <Sparkles size={12} />
            <span>ดึงสติ v1.2.0 • ปลอดภัยและเป็นส่วนตัว 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
