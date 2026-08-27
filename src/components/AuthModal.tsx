import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        const result = login(email, password);
        if (result.success) {
          setSuccessMsg('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับกลับมาค่ะ! 🌿✨');
          setTimeout(() => {
            setIsLoading(false);
            if (onSuccess) onSuccess();
            onClose();
          }, 800);
        } else {
          setIsLoading(false);
          setErrorMsg(result.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        }
      } else {
        const result = register(name, email, password);
        if (result.success) {
          setSuccessMsg('สมัครสมาชิกสำเร็จแล้ว! ข้อมูลของคุณจะถูกซิงค์อย่างปลอดภัย 🎉');
          setTimeout(() => {
            setIsLoading(false);
            if (onSuccess) onSuccess();
            onClose();
          }, 900);
        } else {
          setIsLoading(false);
          setErrorMsg(result.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        }
      }
    }, 400);
  };

  return (
    <div className="jar-modal-overlay" onClick={onClose}>
      <div className="jar-modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="jar-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="auth-modal-badge-icon">
              <span>🔐</span>
            </div>
            <div>
              <h3 className="jar-modal-title">
                {mode === 'login' ? 'เข้าสู่ระบบ ดึงสติ' : 'สมัครสมาชิกใหม่'}
              </h3>
              <p className="jar-modal-sub">
                {mode === 'login'
                  ? 'เข้าสู่ระบบเพื่อกู้คืนสิทธิ์ Plus และประวัติของคุณ'
                  : 'บันทึกประวัติสภาพใจและรักษาสิทธิ์ข้ามอุปกรณ์'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-row">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
          >
            เข้าสู่ระบบ (Sign In)
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
          >
            สมัครสมาชิกใหม่ (Sign Up)
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="auth-alert-box error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert-box success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-input-group">
              <label className="auth-label">ชื่อของคุณ / ชื่อเล่น</label>
              <div className="auth-input-wrapper">
                <UserIcon size={16} className="auth-field-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="เช่น นัตตี้, น้ำตาล, เมย์..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">อีเมล (Email)</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-field-icon" />
              <input
                type="email"
                className="auth-input"
                placeholder="youremail@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="auth-label">รหัสผ่าน (Password)</label>
              {mode === 'login' && (
                <span className="auth-forgot-hint">จำรหัสผ่านไม่ได้? สอบถามทาง LINE</span>
              )}
            </div>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder={mode === 'register' ? 'อย่างน้อย 6 ตัวอักษร' : 'กรอกรหัสผ่านของคุณ'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="แสดงรหัสผ่าน"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>กำลังประมวลผล...</span>
            ) : mode === 'login' ? (
              <>
                <Sparkles size={16} />
                <span>เข้าสู่ระบบ ✨</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>สร้างบัญชี &amp; บันทึกข้อมูลถาวร ✨</span>
              </>
            )}
          </button>
        </form>

        {/* Privacy Note & Guest Mode */}
        <div className="auth-footer-notes">
          <div className="auth-privacy-guarantee">
            <ShieldCheck size={14} className="text-primary" />
            <span>ข้อมูลส่วนตัวและการระบายความรู้สึกของคุณจะถูกเก็บเป็นความลับ 100%</span>
          </div>

          <button
            type="button"
            className="btn-continue-guest"
            onClick={onClose}
          >
            ใช้งานต่อในโหมดทดลองใช้ (ไม่ล็อกอิน) →
          </button>
        </div>
      </div>
    </div>
  );
};
