import React, { useState } from 'react';
import { Sparkles, RefreshCw, Quote, BookOpen, HeartHandshake } from 'lucide-react';

interface WisdomItem {
  quote: string;
  tag: string;
  source: string;
  isBookOriginal?: boolean;
}

const WISDOM_COLLECTION: WisdomItem[] = [
  // --- 📖 จากหนังสือ "ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ" (NTYGOGO) ---
  {
    quote: 'สิ่งที่กำลังเลือกชีวิตของเราอยู่ตอนนี้... คือตัวเราในวันนี้ หรือเป็นใครบางคนในอดีตที่ยังพยายามปกป้องเราอยู่?',
    tag: 'ตัวตน & อดีต',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },
  {
    quote: 'เราไม่ได้เลือกจากสิ่งที่ดีที่สุด แต่เราเลือกจากสิ่งที่ "คุ้นที่สุด"... คำว่าคุ้นไม่ได้แปลว่าปลอดภัย มันเพียงแปลว่าเราเคยอยู่กับมันมาก่อน',
    tag: 'ความคุ้นเคย',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },
  {
    quote: 'อย่าใช้ความเข้าใจในวันนี้ ไปตัดสินตัวเองในวันที่ยังไม่รู้... คนในอดีตตัดสินใจจากสิ่งที่เขารู้ และเครื่องมือเท่าที่เขามีในวันนั้น',
    tag: 'ให้อภัยตัวเอง',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },
  {
    quote: 'ผลงานมีหน้าที่บอกว่าเราควรพัฒนาตรงไหน... ไม่ใช่บอกว่าเราเป็นมนุษย์ที่มีคุณค่าหรือไม่',
    tag: 'คุณค่าในตัวเอง',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },
  {
    quote: 'การเป็นคนดี ไม่ได้แปลว่าต้องเปิดประตูให้ทุกคน... การเดินถอยออกมา ไม่ได้ทำให้เรากลายเป็นคนใจร้าย',
    tag: 'การตั้งขอบเขต',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },
  {
    quote: 'ระหว่างสิ่งที่เกิดขึ้นจริง กับความหมายที่เราให้กับมัน... มีพื้นที่ว่างอยู่เสมอ และเราเลือกความหมายใหม่ได้',
    tag: 'ข้อเท็จจริง vs ตีความ',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },
  {
    quote: 'ขอบคุณนะที่พาเรามาได้ถึงตรงนี้... จากนี้เดี๋ยวเราเลือกเอง',
    tag: 'ปล่อยวาง & เริ่มใหม่',
    source: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ (NTYGOGO)',
    isBookOriginal: true,
  },

  // --- 🌿 ข้อคิดจิตวิทยาและการบำบัดใจสากล (Universal Mindful Insights) ---
  {
    quote: 'เราไม่สามารถควบคุมคำพูดหรือการกระทำของคนอื่นได้... แต่เราเลือกที่จะไม่รับมันเข้ามาเป็นความจริงในใจเราได้',
    tag: 'การปล่อยวาง',
    source: 'ปรัชญาสโตอิก (Stoicism)',
    isBookOriginal: false,
  },
  {
    quote: 'คนอื่นจะคิดอย่างไรกับเธอ นั่นคืองานของเขา ไม่ใช่งานของเธอ... งานของเธอคือใช้ชีวิตของตัวเองให้ดีที่สุด',
    tag: 'การแยกแยะหน้าที่',
    source: 'จิตวิทยาสำนักแอดเลอร์ (Adlerian)',
    isBookOriginal: false,
  },
  {
    quote: 'คุณไม่ต้องพิสูจน์คุณค่าของตัวเองกับทุกคนที่เดินผ่านเข้ามาในชีวิต... การมีอยู่ของคุณมีความหมายในตัวมันเองอยู่แล้ว',
    tag: 'ความรักในตัวเอง',
    source: 'จิตวิทยาความสัมพันธ์',
    isBookOriginal: false,
  },
  {
    quote: 'ความโกรธคือสัญญาณเตือนว่ามีบางอย่างล้ำเส้นเรา... สังเกตมัน แต่อย่าปล่อยให้มันเป็นคนขับพวงมาลัยชีวิต',
    tag: 'การรู้ทันอารมณ์',
    source: 'สติบำบัด (Mindfulness)',
    isBookOriginal: false,
  },
  {
    quote: 'เมื่อรู้สึกว่ามีเรื่องให้คิดเยอะเกินไป ลองทำเพียงสิ่งเดียวที่อยู่ตรงหน้าให้เสร็จก่อน... ทีละก้าวเล็กๆ ก็พาเราไปข้างหน้าได้',
    tag: 'หยุดคิดวน',
    source: 'จิตบำบัดพฤติกรรม (CBT)',
    isBookOriginal: false,
  },
  {
    quote: 'ใจดีกับตัวเองให้เหมือนกับที่คุณคอยใจดีและเข้าใจเพื่อนสนิทของคุณนะ',
    tag: 'ความเมตตาต่อตนเอง',
    source: 'Self-Compassion',
    isBookOriginal: false,
  },
  {
    quote: 'ระหว่างสิ่งเร้ากับการตอบสนอง จะมีช่องว่างอยู่เสมอ... ในช่องว่างนั้นคืออิสรภาพและพลังในการเลือกของเรา',
    tag: 'อิสรภาพทางใจ',
    source: 'Viktor E. Frankl',
    isBookOriginal: false,
  },
  {
    quote: 'การพักผ่อนไม่ได้แปลว่าขี้เกียจ... แต่คือการอนุญาตให้ร่างกายและหัวใจได้ฟื้นฟูเพื่อไปต่อ',
    tag: 'พลังงานชีวิต',
    source: 'สุขภาวะทางใจ (Mental Wellbeing)',
    isBookOriginal: false,
  },
];

export const DailyWisdomCard: React.FC = () => {
  const dayIndex = new Date().getDate() % WISDOM_COLLECTION.length;
  const [currentIndex, setCurrentIndex] = useState<number>(dayIndex);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  const currentWisdom = WISDOM_COLLECTION[currentIndex];

  const handleShuffle = () => {
    setIsRotating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % WISDOM_COLLECTION.length);
      setIsRotating(false);
    }, 200);
  };

  return (
    <div className="daily-wisdom-card">
      <div className="wisdom-top-row">
        <div className="wisdom-badge">
          <Sparkles size={13} className="text-amber-600" />
          <span>ข้อคิดสะกิดใจวันนี้</span>
          <span className="wisdom-tag-pill">{currentWisdom.tag}</span>
        </div>
        <button
          type="button"
          className="btn-shuffle-wisdom"
          onClick={handleShuffle}
          title="สุ่มข้อคิดใบใหม่ (กดเพื่ออ่านบทอื่น)"
        >
          <RefreshCw size={13} className={isRotating ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="wisdom-quote-box">
        <Quote size={20} className="wisdom-quote-icon" />
        <p className="wisdom-quote-text">“{currentWisdom.quote}”</p>
      </div>

      <div className="wisdom-source-footer">
        {currentWisdom.isBookOriginal ? (
          <>
            <BookOpen size={11} className="inline mr-1 opacity-70" />
            <span>จากหนังสือ: <em>{currentWisdom.source}</em></span>
          </>
        ) : (
          <>
            <HeartHandshake size={11} className="inline mr-1 opacity-70" />
            <span>ข้อคิดบำบัดใจ: <em>{currentWisdom.source}</em></span>
          </>
        )}
      </div>
    </div>
  );
};
