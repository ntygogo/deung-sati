import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  Volume2,
  Activity,
  Mountain,
  HeartHandshake,
  CheckCircle2,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  leadBy: string;
  badge: string;
  tagColor: string;
  icon: React.ReactNode;
  highlight: string;
  location: string;
  duration: string;
  description: string;
}

const SERVICES_LIST: ServiceItem[] = [
  {
    id: 'service-workshop',
    title: 'Deung Sati Lab: ถอดหน้ากาก ปลดล็อกลูปความคิด',
    category: 'เวิร์กช็อปกลุ่ม (Interactive Workshop)',
    leadBy: 'นัตตี้ — NTYGOGO (Drama & Somatic Facilitator)',
    badge: '🔥 ไฮไลท์อันดับ 1',
    tagColor: '#B86A3E',
    icon: <Users size={24} />,
    highlight: 'จำลองบทบาทสมมติ (Drama Therapy) + ปลดปล่อยกลไกเอาตัวรอด + ฝึกสื่อสาร NVC',
    location: 'สตูดิโอพักใจ กรุงเทพฯ (BTS / MRT)',
    duration: '3.5 ชั่วโมง (จำกัด 15 ท่าน/รุ่น)',
    description: 'เวิร์กช็อปแบบลงมือทำจริง ไม่ใช่แค่การนั่งฟังบรรยาย แต่คือการได้ถอดหน้ากาก สวมบทบาทสมมติ และเผชิญหน้ากับเสียงในอดีตในพื้นที่ปลอดภัย 100%',
  },
  {
    id: 'service-sound-bath',
    title: 'Tibetan Sound Bath & 432Hz Chakra Alignment',
    category: 'คลื่นเสียงบำบัด (Sound Healing)',
    leadBy: 'Sound Practitioner & Mindfulness Coach',
    badge: '✨ ผ่อนคลายลึก',
    tagColor: '#4f7a6b',
    icon: <Volume2 size={24} />,
    highlight: 'นอนพักท่ามกลางเสียงขันทิเบตแท้ 7 ใบ สลายคลื่นความเครียดสู่ระดับลึก',
    location: 'ห้องกระจกเก็บเสียงธรรมชาติ',
    duration: '60 นาที',
    description: 'คลื่นเสียงความถี่กังวานจะช่วยปรับคลื่นสมองจาก Beta สู่ Alpha และ Theta State ลดการคิดวน และช่วยให้หลับลึกอย่างเป็นธรรมชาติ',
  },
  {
    id: 'service-somatic-reset',
    title: 'Somatic Nervous System & Vagus Nerve Release',
    category: 'กายภาพและระบบประสาทบำบัด',
    leadBy: 'Somatic Therapist & Physical Partner',
    badge: '🌿 คลายเครียดร่างกาย',
    tagColor: '#219ebc',
    icon: <Activity size={24} />,
    highlight: 'ปลดล็อกอาการคอบ่าไหล่เกร็งเรื้อรัง และจัดระเบียบการหายใจ',
    location: 'ศูนย์กายภาพบำบัดและเวลเนสพาร์ทเนอร์',
    duration: '75 นาที',
    description: 'เพราะร่างกายจำความกลัวไว้ (The Body Keeps the Score) การนวดกระตุ้น Vagus Nerve และยืดกล้ามเนื้อจะช่วยปลดปล่อย Trauma ที่คั่งค้างในกล้ามเนื้อ',
  },
  {
    id: 'service-retreat',
    title: 'Deung Sati 3D2N Retreat: หมอกเช้า ชาอุ่น ดอยแม่สลอง',
    category: 'รีทรีตพักใจ (Wellness Retreat)',
    leadBy: 'ทีมงานดึงสติ & โฮมสเตย์แม่สลอง',
    badge: '🏔️ ทริปพิเศษประจำปี',
    tagColor: '#b45309',
    icon: <Mountain size={24} />,
    highlight: 'ตัดขาดจากโลกดิจิทัล (Digital Detox) จิบชาร้อนมองหมอกเช้า และเขียนบันทึกสำรวจใจ',
    location: 'ดอยแม่สลอง จ.เชียงราย',
    duration: '3 วัน 2 คืน',
    description: 'ตามรอยเรื่องราวในหนังสือ บทที่ดอยแม่สลอง ให้คุณได้ทิ้งความวุ่นวาย มานั่งเงียบๆ สูดอากาศบริสุทธิ์ และได้ยินเสียงความต้องการของตัวเองอย่างชัดเจน',
  },
  {
    id: 'service-counseling',
    title: '1-on-1 Certified Psychologist Consultation',
    category: 'จิตบำบัดเดี่ยว (Professional Counseling)',
    leadBy: 'นักจิตวิทยาการปรึกษา & จิตแพทย์ผู้เชี่ยวชาญ',
    badge: '🔒 ปลอดภัยและเป็นความลับ',
    tagColor: '#605249',
    icon: <HeartHandshake size={24} />,
    highlight: 'พูดคุยส่วนตัวแบบตัวต่อตัว หรือออนไลน์ ผ่านระบบที่ปลอดภัย 100%',
    location: 'ออนไลน์ (Video Call) หรือ คลินิกพาร์ทเนอร์',
    duration: '50 นาที / เซสชัน',
    description: 'พื้นที่รับฟังอย่างมืออาชีพโดยไม่มีการตัดสิน สำหรับผู้ที่ต้องการทำความเข้าใจปมในใจลึกๆ และหาแนวทางการเยียวยาแบบเฉพาะบุคคล',
  },
];

export const ServicesView: React.FC = () => {
  const [waitlistEmail, setWaitlistEmail] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmitWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setIsSubmitted(true);
    setTimeout(() => {
      setWaitlistEmail('');
      setIsSubmitted(false);
    }, 4000);
  };

  return (
    <div className="services-screen">
      {/* Header Banner */}
      <div className="services-hero-card">
        <div className="services-hero-badge">
          <Sparkles size={14} className="text-amber-600" />
          <span>DEUNG SATI WELLNESS SANCTUARY</span>
        </div>
        <h2 className="services-hero-title">บริการ & เวิร์กช็อปดูแลใจ</h2>
        <p className="services-hero-sub">
          ต่อยอดจากแอปพลิเคชันสู่ประสบการณ์จริง ทั้งเวิร์กช็อปกลุ่ม คลื่นเสียงบำบัด และทริปพักใจดอยแม่สลอง
        </p>
      </div>

      {/* Services Showcase Cards */}
      <div className="services-list-container">
        {SERVICES_LIST.map((svc) => (
          <div key={svc.id} className="service-showcase-card">
            <div className="service-card-top-row">
              <div className="service-icon-box" style={{ color: svc.tagColor }}>
                {svc.icon}
              </div>
              <div className="service-card-header-meta">
                <span className="service-category-tag">{svc.category}</span>
                <span className="service-status-pill">{svc.badge}</span>
              </div>
            </div>

            <h3 className="service-card-title">{svc.title}</h3>
            <p className="service-lead-by">
              👤 วิทยากร/ผู้ดูแล: <strong>{svc.leadBy}</strong>
            </p>

            <div className="service-highlight-box">
              <Sparkles size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{svc.highlight}</span>
            </div>

            <p className="service-card-desc">{svc.description}</p>

            <div className="service-meta-row">
              <div className="service-meta-item">
                <MapPin size={13} className="text-muted" />
                <span>{svc.location}</span>
              </div>
              <div className="service-meta-item">
                <Clock size={13} className="text-muted" />
                <span>{svc.duration}</span>
              </div>
            </div>

            <div className="service-card-footer">
              <span className="coming-soon-tag">🌱 กำลังเปิดรับลงทะเบียนรุ่นแรกเร็วๆ นี้</span>
              <button
                type="button"
                className="btn-interest-tag"
                onClick={() => setSelectedService(svc.title)}
              >
                <span>สนใจบริการนี้</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Waitlist / Contact Us Box */}
      <div className="services-waitlist-card">
        <h4 className="waitlist-title">📬 สนใจเข้าร่วมกิจกรรม หรืออยากให้เราจัดรอบพิเศษ?</h4>
        <p className="waitlist-sub">
          กรอกอีเมลหรือชื่อเล่นของคุณ เพื่อรับสิทธิ์จองที่นั่งก่อนใคร (Early Bird Access) พร้อมรับส่วนลดพิเศษ
        </p>

        {selectedService && (
          <div className="selected-service-pill">
            <span>กิจกรรมที่สนใจ: <strong>{selectedService}</strong></span>
            <button type="button" onClick={() => setSelectedService('')} className="btn-clear-sel">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmitWaitlist} className="waitlist-form">
          <input
            type="text"
            className="waitlist-input"
            placeholder="อีเมล หรือ Line ID ของคุณ..."
            value={waitlistEmail}
            onChange={(e) => setWaitlistEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-waitlist-submit" disabled={!waitlistEmail.trim()}>
            <Send size={15} />
            <span>รับข่าวสารรอบใหม่</span>
          </button>
        </form>

        {isSubmitted && (
          <div className="waitlist-success-toast">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>บันทึกความสนใจเรียบร้อยแล้ว ทีมงานจะแจ้งข่าวสารให้ทราบเป็นคนแรกครับ 🌿</span>
          </div>
        )}
      </div>
    </div>
  );
};
