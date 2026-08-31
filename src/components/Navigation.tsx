import React, { useEffect, useState } from 'react';
import { bookConfig } from '../config/bookConfig';

export type DrawerMenuItemId =
  | 'account'
  | 'membership_status'
  | 'book_info'
  | 'buy_book'
  | 'about_author'
  | 'membership'
  | 'plans'
  | 'manage_membership'
  | 'services'
  | 'workshops'
  | 'other_services'
  | 'settings'
  | 'language'
  | 'notifications'
  | 'sound'
  | 'vibration'
  | 'privacy'
  | 'private_mode'
  | 'manage_data'
  | 'clear_history'
  | 'delete_account'
  | 'support'
  | 'how_to_use'
  | 'contact_us'
  | 'safety_info';

/* -------------------------------------------------------------------------- */
/* 1. Emergency Icon Button (Header)                                         */
/* -------------------------------------------------------------------------- */
export const EmergencyIconButton: React.FC<{
  onClick: () => void;
  title?: string;
}> = ({ onClick, title = 'ฉุกเฉิน - หยุดก่อน' }) => {
  return (
    <button
      type="button"
      className="sirenHeaderIconBtn"
      onClick={onClick}
      title={title}
      aria-label="Emergency siren pause"
    >
      <div className="miniSirenBeacon">
        <div className="miniRotatingSweep" />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 12a5 5 0 0 1 10 0v5H7v-5Z" />
          <path d="M5 17h14v3H5v-3Z" />
          <path d="M12 3v3" />
          <path d="M5 6l2 2" />
          <path d="M19 6l-2 2" />
          <circle cx="12" cy="13" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>
      <span className="sirenBtnText">ฉุกเฉิน</span>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Hamburger Button (Header)                                               */
/* -------------------------------------------------------------------------- */
export const HamburgerButton: React.FC<{
  onClick: () => void;
  title?: string;
}> = ({ onClick, title = 'เปิดเมนู' }) => {
  return (
    <button
      type="button"
      className="hamburgerIconBtn"
      onClick={onClick}
      title={title}
      aria-label="Open navigation menu"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4B342C"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Reusable App Header                                                     */
/* -------------------------------------------------------------------------- */
export const AppHeader: React.FC<{
  title: string;
  brandText?: string;
  showBack?: boolean;
  onBack?: () => void;
  onEmergency: () => void;
  onOpenMenu: () => void;
}> = ({
  title,
  brandText = 'Deung Sati 🌱',
  showBack = false,
  onBack,
  onEmergency,
  onOpenMenu,
}) => {
  return (
    <header className="appHeader">
      <div className="headerLeft">
        {showBack && onBack ? (
          <button
            type="button"
            className="headerBackBtn"
            onClick={onBack}
            aria-label="Go back"
          >
            ←
          </button>
        ) : (
          <span className="headerBrand">{brandText}</span>
        )}
      </div>

      <h2 className="headerTitle">{title}</h2>

      <div className="headerRightActions">
        <EmergencyIconButton onClick={onEmergency} />
        <HamburgerButton onClick={onOpenMenu} />
      </div>
    </header>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Drawer Subcomponents                                                    */
/* -------------------------------------------------------------------------- */
export const DrawerSection: React.FC<{
  title: string;
  icon?: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => {
  return (
    <div className="drawerSection">
      <div className="drawerSectionHeader">
        {icon && <span className="drawerSectionIcon">{icon}</span>}
        <h4>{title}</h4>
      </div>
      <div className="drawerSectionItems">{children}</div>
    </div>
  );
};

export const DrawerItem: React.FC<{
  id: DrawerMenuItemId;
  label: string;
  icon?: string;
  badge?: string;
  subtitle?: string;
  onClick?: (id: DrawerMenuItemId) => void;
  actionSlot?: React.ReactNode;
}> = ({ id, label, icon, badge, subtitle, onClick, actionSlot }) => {
  return (
    <div
      className="drawerItemRow"
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick && onClick(id);
        }
      }}
    >
      <div className="drawerItemMain">
        {icon && <span className="drawerItemIcon">{icon}</span>}
        <div className="drawerItemLabels">
          <span className="drawerItemTitle">{label}</span>
          {subtitle && <small className="drawerItemSubtitle">{subtitle}</small>}
        </div>
      </div>

      <div className="drawerItemEnd">
        {badge && <span className="drawerSubtleBadge">{badge}</span>}
        {actionSlot}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. Reusable App Drawer                                                     */
/* -------------------------------------------------------------------------- */
export const AppDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onEmergency?: () => void;
  onSelectRoute?: (routeId: DrawerMenuItemId) => void;
}> = ({ isOpen, onClose, onEmergency, onSelectRoute }) => {
  const [activeLang, setActiveLang] = useState<'th' | 'en'>('th');
  const [soundActive, setSoundActive] = useState(true);
  const [vibrationActive, setVibrationActive] = useState(true);
  const [notifActive, setNotifActive] = useState(true);

  // Close on ESC key on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemClick = (id: DrawerMenuItemId) => {
    if (onSelectRoute) {
      onSelectRoute(id);
    }
  };

  return (
    <div
      className={`appDrawerBackdrop ${isOpen ? 'drawerBackdropOpen' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`appDrawerPanel ${isOpen ? 'drawerPanelOpen' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Application menu drawer"
      >
        {/* Drawer Top Header */}
        <div className="drawerHeader">
          <div className="drawerBrandInfo">
            <img
              src="/images/nibbana_baby_sage.jpg"
              alt="Nibbana Baby"
              className="drawerBabyAvatar"
            />
            <div>
              <h3>Deung Sati</h3>
              <small>เพื่อนดึงสติ • นิพพานเบบี้</small>
            </div>
          </div>
          <button
            type="button"
            className="drawerCloseBtn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Quick Emergency Banner in Drawer */}
        {onEmergency && (
          <button
            type="button"
            className="drawerEmergencyBanner"
            onClick={() => {
              onClose();
              onEmergency();
            }}
          >
            <div className="miniSirenBeacon">
              <div className="miniRay" />
              <span>🚨</span>
            </div>
            <div className="drawerEmergencyCopy">
              <b>หยุดฉุกเฉิน</b>
              <small>อารมณ์กำลังแรง? พักหายใจ & ขันธิเบต</small>
            </div>
            <span>→</span>
          </button>
        )}

        {/* Scrollable Drawer Body with Future-Ready Sections */}
        <div className="drawerBody scrollArea">
          {/* Section 1: Account */}
          <DrawerSection title="บัญชีของฉัน" icon="👤">
            <DrawerItem
              id="membership_status"
              label="สถานะสมาชิก"
              subtitle="Free Plan (ฝึกสติทั่วไป)"
              badge="ใช้งานอยู่"
              onClick={handleItemClick}
            />
          </DrawerSection>

          {/* Section 2: Book & Author (ทั้งที่รู้ว่าไม่ดี...ทำไมยังทำซ้ำ) */}
          <DrawerSection title="หนังสือและผู้เขียน" icon="📖">
            <div className="drawerBookCard">
              <div className="drawerBookCoverWrap">
                <img
                  src={bookConfig.bookCover}
                  alt={bookConfig.bookTitle}
                  className="drawerBookCoverImg"
                />
              </div>
              <div className="drawerBookInfo">
                <b className="drawerBookTitle">{bookConfig.bookTitle}</b>
                <span className="drawerBookAuthor">เขียนโดย: {bookConfig.authorName}</span>
                <p className="drawerBookDesc">{bookConfig.description}</p>
              </div>
            </div>

            <DrawerItem
              id="buy_book"
              label="ซื้อหนังสือ / E-Book"
              subtitle="ฉบับพิมพ์ & ดิจิทัล"
              badge={bookConfig.pdfPurchaseUrl || bookConfig.mebPurchaseUrl ? undefined : 'เร็วๆ นี้'}
              onClick={() => {
                if (bookConfig.mebPurchaseUrl) {
                  window.open(bookConfig.mebPurchaseUrl, '_blank');
                } else if (bookConfig.pdfPurchaseUrl) {
                  window.open(bookConfig.pdfPurchaseUrl, '_blank');
                } else {
                  handleItemClick('buy_book');
                }
              }}
            />

            <DrawerItem
              id="about_author"
              label={`เกี่ยวกับผู้เขียน (${bookConfig.authorName})`}
              subtitle="ผู้สร้างสรรค์ Deung Sati"
              onClick={handleItemClick}
            />
          </DrawerSection>

          {/* Section 3: Membership & Packages */}
          <DrawerSection title="สมาชิกและแพ็กเกจ" icon="⭐">
            <DrawerItem
              id="membership"
              label="สมัครสมาชิก"
              badge="เร็วๆ นี้"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="plans"
              label="แพ็กเกจ"
              badge="เร็วๆ นี้"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="manage_membership"
              label="จัดการสมาชิก"
              badge="เร็วๆ นี้"
              onClick={handleItemClick}
            />
          </DrawerSection>

          {/* Section 3: Services */}
          <DrawerSection title="บริการ" icon="🌿">
            <DrawerItem
              id="workshops"
              label="เวิร์กชอป"
              badge="เร็วๆ นี้"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="other_services"
              label="บริการอื่นๆ"
              badge="เร็วๆ นี้"
              onClick={handleItemClick}
            />
          </DrawerSection>

          {/* Section 4: Settings */}
          <DrawerSection title="การตั้งค่า" icon="⚙️">
            <DrawerItem
              id="language"
              label="ภาษา"
              actionSlot={
                <div className="langSwitcherGroup">
                  <button
                    type="button"
                    className={`langBtn ${activeLang === 'th' ? 'langBtnActive' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLang('th');
                    }}
                  >
                    ไทย
                  </button>
                  <button
                    type="button"
                    className={`langBtn ${activeLang === 'en' ? 'langBtnActive' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLang('en');
                    }}
                  >
                    EN
                  </button>
                </div>
              }
            />
            <DrawerItem
              id="notifications"
              label="การแจ้งเตือน"
              actionSlot={
                <input
                  type="checkbox"
                  className="drawerToggleSwitch"
                  checked={notifActive}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNotifActive(e.target.checked);
                  }}
                />
              }
            />
            <DrawerItem
              id="sound"
              label="เสียง (Sound FX)"
              actionSlot={
                <input
                  type="checkbox"
                  className="drawerToggleSwitch"
                  checked={soundActive}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSoundActive(e.target.checked);
                  }}
                />
              }
            />
            <DrawerItem
              id="vibration"
              label="การสั่น (Haptics)"
              actionSlot={
                <input
                  type="checkbox"
                  className="drawerToggleSwitch"
                  checked={vibrationActive}
                  onChange={(e) => {
                    e.stopPropagation();
                    setVibrationActive(e.target.checked);
                  }}
                />
              }
            />
          </DrawerSection>

          {/* Section 5: Privacy */}
          <DrawerSection title="ความเป็นส่วนตัว" icon="🔒">
            <DrawerItem
              id="private_mode"
              label="Private Mode"
              subtitle="ไม่บันทึกบทสนทนา"
              badge="เร็วๆ นี้"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="manage_data"
              label="จัดการข้อมูลที่แอปจำ"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="clear_history"
              label="ลบประวัติ"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="delete_account"
              label="ลบบัญชี"
              onClick={handleItemClick}
            />
          </DrawerSection>

          {/* Section 6: Support */}
          <DrawerSection title="ช่วยเหลือ" icon="💬">
            <DrawerItem
              id="how_to_use"
              label="วิธีใช้"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="contact_us"
              label="ติดต่อเรา"
              onClick={handleItemClick}
            />
            <DrawerItem
              id="safety_info"
              label="ข้อมูลความปลอดภัย (Safety & Hotlines)"
              onClick={handleItemClick}
            />
          </DrawerSection>

          <div className="drawerFooterNote">
            <small>Deung Sati v2.0 • ใจดีกับตัวเองในทุกวัน 🌱</small>
          </div>
        </div>
      </div>
      <style>{drawerStyles}</style>
    </div>
  );
};

const drawerStyles = `
.appDrawerBackdrop {
  position: absolute;
  inset: 0;
  background: rgba(30, 24, 18, 0.45);
  backdrop-filter: blur(4px);
  z-index: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease;
}

.appDrawerBackdrop.drawerBackdropOpen {
  opacity: 1;
  pointer-events: auto;
}

.appDrawerPanel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 84%;
  max-width: 340px;
  background: #FAF5ED;
  box-shadow: -8px 0 32px rgba(40, 30, 20, 0.18);
  transform: translateX(100%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  z-index: 501;
  border-left: 1px solid #EBE0D2;
}

.appDrawerPanel.drawerPanelOpen {
  transform: translateX(0);
}

.drawerHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 18px 14px;
  border-bottom: 1px solid #EAE0D1;
  background: #F8F2E7;
}

.drawerBrandInfo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawerBabyAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(70, 52, 38, 0.12);
}

.drawerBrandInfo h3 {
  margin: 0;
  font-size: 16px;
  color: #3F5944;
  font-family: Georgia, "Noto Serif Thai", serif;
}

.drawerBrandInfo small {
  display: block;
  font-size: 11px;
  color: #7D6B57;
}

.drawerCloseBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #E0D4C5;
  background: white;
  color: #6E5A47;
  font-size: 20px;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.drawerScrollContent {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 28px;
}

.drawerEmergencyBanner {
  background: linear-gradient(135deg, #E65A32, #BA3B1C);
  color: white;
  border: 0;
  border-radius: 20px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 14px 16px;
  box-shadow: 0 4px 14px rgba(186, 59, 28, 0.28);
  cursor: pointer;
  width: calc(100% - 28px);
}

.drawerEmergencyCopy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  flex: 1;
  margin-left: 8px;
}

.drawerEmergencyCopy b {
  display: block;
  font-size: 14px;
  line-height: 1.2;
}

.drawerEmergencyCopy small {
  display: block;
  font-size: 11px;
  opacity: 0.9;
  margin-top: 2px;
}

.drawerSection {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid #ECE0D2;
  border-radius: 20px;
  padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(70, 52, 38, 0.02);
}

.drawerSectionHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #EFE6D8;
}

.drawerSectionHeader h4 {
  margin: 0;
  font-size: 13.5px;
  color: #3F5944;
}

.drawerItemRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 4px;
  cursor: pointer;
}

.drawerItemMain {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawerItemTitle {
  font-size: 13.5px;
  color: #3E2D23;
}

.drawerItemSubtitle {
  display: block;
  font-size: 10.5px;
  color: #8E7866;
}

.drawerSubtleBadge {
  font-size: 10px;
  background: #EBE1D3;
  color: #796552;
  padding: 2px 7px;
  border-radius: 999px;
}

.drawerLangToggle {
  display: flex;
  background: #EFE6D9;
  padding: 2px;
  border-radius: 999px;
}

.langBtn {
  border: 0;
  background: transparent;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #7E6C5A;
  cursor: pointer;
}

.langBtnActive {
  background: white;
  color: #3F5944;
  font-weight: bold;
}

.drawerBookCard {
  display: flex;
  gap: 12px;
  background: #FFFDF9;
  border: 1px solid #EAE0D3;
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 8px;
}

.drawerBookCoverWrap {
  width: 58px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(0,0,0,0.12);
  border: 1px solid #E2D7C8;
}

.drawerBookCoverImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawerBookInfo {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
}

.drawerBookTitle {
  font-size: 12.5px;
  color: #3E2D23;
  line-height: 1.35;
  margin-bottom: 2px;
}

.drawerBookAuthor {
  font-size: 11px;
  color: #657E53;
  font-weight: 600;
  margin-bottom: 4px;
}

.drawerBookDesc {
  font-size: 10.5px;
  color: #796552;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drawerFooterNote {
  text-align: center;
  color: #9C8775;
  margin-top: 14px;
  font-size: 11px;
}
`;

