import React, { useState } from 'react';
import {
  X,
  Crown,
  Check,
  Sparkles,
  CreditCard,
  QrCode,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  Copy,
  ExternalLink,
  Building2,
  Users,
  FileText,
  BarChart3,
  Award,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
  isAlreadyPlus?: boolean;
  onOpenAuth?: () => void;
}

type PlanCategory = 'individual' | 'corporate';
type BillingPlan = 'monthly' | 'yearly';
type PaymentMethod = 'promptpay' | 'card' | 'line';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onUpgradeSuccess,
  isAlreadyPlus = false,
  onOpenAuth,
}) => {
  const { currentUser, upgradePlus } = useAuth();
  const [planCategory, setPlanCategory] = useState<PlanCategory>('individual');
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('yearly');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('promptpay');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showQrStep, setShowQrStep] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('0271872775');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleSimulatePayment = () => {
    if (selectedMethod === 'line') {
      window.open('https://lin.ee/snQhce5', '_blank');
      return;
    }

    if (selectedMethod === 'promptpay' && !showQrStep) {
      setShowQrStep(true);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      upgradePlus(selectedPlan);
      onUpgradeSuccess();
      setShowQrStep(false);
    }, 1500);
  };

  const amount = selectedPlan === 'yearly' ? '1,190' : '149';
  const periodText = selectedPlan === 'yearly' ? 'ต่อปี (เฉลี่ย ฿99/เดือน)' : 'ต่อเดือน';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="subscription-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="btn-modal-close"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="sub-header-hero">
          <div className="sub-crown-badge">
            <Crown size={22} className="text-amber-500" />
          </div>
          <div className="sub-hero-tag">
            <Sparkles size={13} />
            <span>DEUNG SATI PLUS &amp; ENTERPRISE</span>
          </div>
          <h2 className="sub-modal-title">
            {planCategory === 'corporate' ? 'ดึงสติ สำหรับองค์กร (Enterprise)' : 'ดึงสติ พลัส (Plus)'}
          </h2>
          <p className="sub-modal-sub">
            {planCategory === 'corporate'
              ? 'โซลูชันดูแลสุขภาพใจพนักงาน ลดความเหนื่อยล้า (Burnout) และสร้างวัฒนธรรมการสื่อสารที่ปลอดภัยในองค์กร'
              : 'พื้นที่ดูแลใจไร้ขีดจำกัด ถอดรหัสลูปใจ ชี้ให้เห็นความจริง & คลื่นเสียงผ่อนคลายพรีเมียม'}
          </p>
        </div>

        {/* Category Switcher Tabs: Individual vs Corporate */}
        <div className="sub-category-tabs">
          <button
            type="button"
            className={`sub-cat-tab-btn ${planCategory === 'individual' ? 'active' : ''}`}
            onClick={() => setPlanCategory('individual')}
          >
            <Users size={16} />
            <span>บุคคลทั่วไป (Personal)</span>
          </button>
          <button
            type="button"
            className={`sub-cat-tab-btn ${planCategory === 'corporate' ? 'active' : ''}`}
            onClick={() => setPlanCategory('corporate')}
          >
            <Building2 size={16} />
            <span>องค์กร &amp; HR (Corporate)</span>
          </button>
        </div>

        {isAlreadyPlus && planCategory === 'individual' ? (
          <div className="sub-already-plus-box">
            <div className="already-plus-icon">👑✨</div>
            <h3>คุณเป็นสมาชิก ดึงสติ พลัส เรียบร้อยแล้ว!</h3>
            <p>ขอบคุณที่ร่วมเป็นส่วนหนึ่งในการสนับสนุนการพัฒนาแอปดึงสตินะครับ 🌿</p>
            <button type="button" className="btn-primary" onClick={onClose} style={{ marginTop: 12 }}>
              กลับสู่แอป
            </button>
          </div>
        ) : showQrStep && planCategory === 'individual' ? (
          /* PromptPay QR Code Step */
          <div className="promptpay-step-container">
            <div className="promptpay-qr-box">
              <div className="promptpay-header-tag">
                <QrCode size={16} />
                <span>สแกน QR Code เพื่อโอนเข้าบัญชี</span>
              </div>

              {/* Nutty's Official Thai QR Payment Image */}
              <div className="qr-image-wrapper">
                <img
                  src="/images/nutty_promptpay_qr.jpg"
                  alt="พร้อมเพย์ กสิกรไทย ภักษร พรพบรักแท้"
                  className="qr-img-nutty"
                />
              </div>

              <div className="qr-price-badge">
                <span>ยอดชำระ ({selectedPlan === 'yearly' ? 'รายปี' : 'รายเดือน'}):</span>
                <strong>฿{amount} บาท</strong>
              </div>

              {/* Bank Account Info Box */}
              <div className="bank-info-card">
                <div className="bank-logo-row">
                  <span className="kbank-badge">ธนาคารกสิกรไทย (KBANK)</span>
                  <button
                    type="button"
                    className="btn-copy-account"
                    onClick={handleCopyAccount}
                  >
                    {copiedAccount ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedAccount ? 'คัดลอกแล้ว!' : 'คัดลอกเลขบัญชี'}</span>
                  </button>
                </div>
                <div className="bank-details-row">
                  <span className="bank-account-num">027-1-87277-5</span>
                  <span className="bank-account-name">ชื่อบัญชี: น.ส. ภักษร พรพบรักแท้</span>
                </div>
              </div>
            </div>

            <div className="promptpay-actions-column">
              <a
                href="https://lin.ee/snQhce5"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-send-slip-line"
              >
                <MessageCircle size={16} />
                <span>ส่งสลิปแจ้งโอนผ่าน LINE (@ntygogo)</span>
                <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </a>

              <div className="promptpay-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowQrStep(false)}
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  className="btn-confirm-pay"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'กำลังยืนยัน...' : 'ฉันโอนเงินเรียบร้อยแล้ว ✨'}
                </button>
              </div>
            </div>
          </div>
        ) : planCategory === 'corporate' ? (
          /* ================================================================
             🏢 CORPORATE / ENTERPRISE PACKAGE CONTENT
             ================================================================ */
          <div className="sub-content-body">
            {/* Corporate Tier Banner */}
            <div className="corp-hero-card">
              <div className="corp-badge-row">
                <span className="corp-tag-badge">🏢 FOR TEAMS &amp; HR WELLNESS</span>
                <span className="corp-tax-badge">🧾 หักภาษีได้ 200%</span>
              </div>
              <h3 className="corp-card-title">แพ็กเกจยกระดับสุขภาพใจและประสิทธิภาพทีม</h3>
              <p className="corp-card-desc">
                สำหรับบริษัท สตาร์ตอัป และองค์กรที่ต้องการให้พนักงานมีสติ ลดความขัดแย้ง และทำงานร่วมกันอย่างมีความสุข
              </p>
              <div className="corp-price-estimate">
                <span>ราคาเริ่มต้นเพียง</span>
                <strong>฿99 - ฿129</strong>
                <span>/ พนักงาน / เดือน (ตามขนาดทีม)</span>
              </div>
            </div>

            {/* Corporate Specific Benefits */}
            <div className="sub-benefits-list">
              <h4 className="benefits-heading">🏢 สิทธิประโยชน์สำหรับองค์กร &amp; ทีม:</h4>
              <div className="benefit-item">
                <div className="benefit-check-icon"><Check size={13} /></div>
                <span><strong>Deung Sati Plus Full Access</strong> สำหรับพนักงานทุกคน (แชท AI ไม่จำกัด, ฝึกสติ, เสียงบำบัด)</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-check-icon"><BarChart3 size={13} /></div>
                <span><strong>HR Team Wellness Report (Anonymous)</strong> — รายงานดัชนีความเครียดและสภาพอากาศอารมณ์ทีมรายเดือน (ตามหลัก PDPA 100%)</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-check-icon"><Award size={13} /></div>
                <span><strong>In-House Workshop โดยคุณนัตตี้ (NTYGOGO)</strong> — สิทธิ์จองเวิร์กช็อปถอดรหัสลูปสื่อสารและ Mindful Leadership 3.5 ชม.</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-check-icon"><FileText size={13} /></div>
                <span><strong>ออกใบเสนอราคา &amp; ใบกำกับภาษีเต็มรูปแบบ</strong> — ยื่นหักค่าใช้จ่ายอบรมพัฒนาบุคลากรได้</span>
              </div>
            </div>

            {/* Corporate Action Button */}
            <a
              href="https://lin.ee/snQhce5"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-corporate-cta"
            >
              <MessageCircle size={18} />
              <span>ขอใบเสนอราคา &amp; ปรึกษาแพ็กเกจองค์กร (ทัก LINE นัตตี้)</span>
              <ExternalLink size={16} style={{ marginLeft: 'auto' }} />
            </a>

            <div className="sub-guarantee-row">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>ปรับแต่งแพ็กเกจได้ตามขนาดทีม (10 - 500+ คน) • ออกใบกำกับภาษีถูกต้อง</span>
            </div>
          </div>
        ) : (
          /* ================================================================
             👤 INDIVIDUAL / PERSONAL PLAN CONTENT
             ================================================================ */
          <div className="sub-content-body">
            {/* User Account Association Status */}
            {currentUser ? (
              <div className="sub-user-account-badge">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>อัปเกรดสิทธิ์ผูกกับบัญชี: <strong>{currentUser.email}</strong></span>
              </div>
            ) : onOpenAuth ? (
              <div className="sub-user-guest-warning" onClick={() => { onClose(); onOpenAuth(); }}>
                <span>💡 ยังไม่ได้ล็อกอิน? <u>เข้าสู่ระบบ/สมัครสมาชิก</u> เพื่อผูกสิทธิ์ถาวร</span>
              </div>
            ) : null}

            {/* Plan Selector Toggle */}
            <div className="sub-plans-grid">
              <div
                className={`sub-plan-card ${selectedPlan === 'yearly' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('yearly')}
              >
                <div className="plan-discount-ribbon">ประหยัด 33% 🌟</div>
                <div className="plan-radio-row">
                  <div className={`plan-radio-circle ${selectedPlan === 'yearly' ? 'selected' : ''}`} />
                  <span className="plan-name">รายปี (แนะนำ)</span>
                </div>
                <div className="plan-price-row">
                  <span className="plan-price-val">฿1,190</span>
                  <span className="plan-period">/ปี</span>
                </div>
                <span className="plan-saving-note">เฉลี่ยเพียง ฿99/เดือน</span>
              </div>

              <div
                className={`sub-plan-card ${selectedPlan === 'monthly' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="plan-radio-row">
                  <div className={`plan-radio-circle ${selectedPlan === 'monthly' ? 'selected' : ''}`} />
                  <span className="plan-name">รายเดือน</span>
                </div>
                <div className="plan-price-row">
                  <span className="plan-price-val">฿149</span>
                  <span className="plan-period">/เดือน</span>
                </div>
                <span className="plan-saving-note">ยกเลิกได้ตลอดเวลา</span>
              </div>
            </div>

            {/* Premium Benefits List */}
            <div className="sub-benefits-list">
              <h4 className="benefits-heading">สิ่งที่คุณจะได้รับจากแพ็กเกจ พลัส:</h4>
              <div className="benefit-item">
                <div className="benefit-check-icon"><Check size={13} /></div>
                <span><strong>แชทดึงสติ &amp; แยกแยะความจริงไม่อั้น 24 ชม.</strong> — ระบายและถอดรหัสลูปใจได้ทุกเวลา</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-check-icon"><Check size={13} /></div>
                <span><strong>สังเคราะห์ลูปพฤติกรรม 5 ลูป ไม่จำกัด</strong> — ค้นหาปมที่ทำซ้ำและเห็นทางเลือกใหม่</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-check-icon"><Check size={13} /></div>
                <span><strong>ปลดล็อกคลื่นเสียงบำบัด &amp; ซาวด์กล่อมนอนพรีเมียม</strong> — ขันทิเบต, 432Hz, ฝนแม่สลอง</span>
              </div>
              <div className="benefit-item">
                <div className="benefit-check-icon"><Check size={13} /></div>
                <span><strong>สิทธิ์จองเวิร์กช็อป Deung Sati Lab</strong> &amp; Retreat ดอยแม่สลองรอบ Early Bird</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="payment-methods-box">
              <label className="payment-methods-label">เลือกช่องทางชำระเงิน:</label>
              <div className="payment-chips-row">
                <button
                  type="button"
                  className={`payment-chip-btn ${selectedMethod === 'promptpay' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('promptpay')}
                >
                  <QrCode size={15} />
                  <span>PromptPay QR</span>
                </button>

                <button
                  type="button"
                  className={`payment-chip-btn ${selectedMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('card')}
                >
                  <CreditCard size={15} />
                  <span>บัตรเครดิต/เดบิต</span>
                </button>

                <button
                  type="button"
                  className={`payment-chip-btn ${selectedMethod === 'line' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('line')}
                >
                  <MessageCircle size={15} />
                  <span>สมัครผ่าน LINE</span>
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="button"
              className="btn-subscribe-cta"
              onClick={handleSimulatePayment}
              disabled={isProcessing}
            >
              <Sparkles size={18} />
              <span>
                {selectedMethod === 'line'
                  ? 'ทักแชต LINE @ntygogo เพื่อสมัครสมาชิก'
                  : `สมัครสมาชิก ฿${amount} ${periodText}`}
              </span>
              <ChevronRight size={18} style={{ marginLeft: 'auto' }} />
            </button>

            {/* Trust & Guarantee Footnote */}
            <div className="sub-guarantee-row">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>ความปลอดภัยมาตรฐานสากล • กดยกเลิกได้ตลอดเวลา ไม่มีข้อผูกมัด</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
