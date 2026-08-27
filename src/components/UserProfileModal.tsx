import React, { useState } from 'react';
import {
  X,
  Crown,
  LogOut,
  Download,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscribe?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenSubscribe,
}) => {
  const { currentUser, isPlus, logout } = useAuth();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleExportData = () => {
    try {
      const backupData = {
        user: {
          name: currentUser.name,
          email: currentUser.email,
          tier: currentUser.tier,
          exportedAt: new Date().toISOString(),
        },
        gratitudeEntries: JSON.parse(localStorage.getItem('deung_sati_gratitude_entries') || '[]'),
        chatHistory: JSON.parse(localStorage.getItem('deung_sati_chat_history') || '[]'),
        savedLoops: JSON.parse(localStorage.getItem('deung_sati_saved_loops') || '[]'),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `deung_sati_backup_${currentUser.email}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.warn('Failed to export data', e);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getTierLabel = () => {
    if (!isPlus) return 'สมาชิกทั่วไป (Free Tier)';
    if (currentUser.tier === 'lifetime') return 'ดึงสติ Plus (ตลอดชีพ VIP ⭐)';
    if (currentUser.tier === 'yearly') return 'ดึงสติ Plus (รายปี)';
    if (currentUser.tier === 'monthly') return 'ดึงสติ Plus (รายเดือน)';
    return 'ดึงสติ Plus';
  };

  return (
    <div className="jar-modal-overlay" onClick={onClose}>
      <div className="jar-modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="jar-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="profile-badge-icon">
              <span>👤</span>
            </div>
            <div>
              <h3 className="jar-modal-title">ข้อมูลบัญชีผู้ใช้</h3>
              <p className="jar-modal-sub">จัดการข้อมูลและสถานะสมาชิกของคุณ</p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="profile-main-card">
          <div className="profile-avatar-circle">
            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
          </div>

          <div className="profile-info-column">
            <h4 className="profile-display-name">{currentUser.name}</h4>
            <span className="profile-email-text">{currentUser.email}</span>

            <div className="profile-tier-badge-row">
              {isPlus ? (
                <span className="tier-pill plus">
                  <Crown size={13} className="text-amber-500" />
                  <span>{getTierLabel()}</span>
                </span>
              ) : (
                <span className="tier-pill free">
                  <span>🌱 {getTierLabel()}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Status & Upgrade CTA */}
        {!isPlus && onOpenSubscribe && (
          <div className="profile-upgrade-banner">
            <div className="upgrade-banner-text">
              <strong>👑 อัปเกรดเป็น ดึงสติ Plus</strong>
              <small>ปลดล็อกแชทไม่จำกัด &amp; ตัวจำลองผลลัพธ์ล่วงหน้า</small>
            </div>
            <button
              type="button"
              className="btn-profile-upgrade"
              onClick={() => {
                onClose();
                onOpenSubscribe();
              }}
            >
              <Sparkles size={14} />
              <span>สมัคร Plus</span>
            </button>
          </div>
        )}

        {/* Member Details */}
        <div className="profile-details-list">
          <div className="profile-detail-row">
            <div className="detail-label-group">
              <Calendar size={14} className="text-muted" />
              <span>วันที่ลงทะเบียน</span>
            </div>
            <span className="detail-value">
              {new Date(currentUser.createdAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="profile-detail-row">
            <div className="detail-label-group">
              <ShieldCheck size={14} className="text-primary" />
              <span>ความปลอดภัยของข้อมูล</span>
            </div>
            <span className="detail-value text-emerald-600 font-semibold">ผูกกับอีเมลนี้แล้ว</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions-section">
          <button
            type="button"
            className="btn-profile-action export"
            onClick={handleExportData}
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>ดาวน์โหลดสำรองข้อมูลเรียบร้อย!</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>สำรองข้อมูลทั้งหมด (Export Backup JSON)</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-profile-action logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>ออกจากระบบ (Log Out)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
