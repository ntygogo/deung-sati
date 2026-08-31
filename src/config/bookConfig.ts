/**
 * Central Configuration for Book & Author ("ทั้งที่รู้ว่าไม่ดี...ทำไมยังทำซ้ำ")
 * 
 * NOTE: Real URLs should be provided here when available.
 * Placeholders with `null` will automatically display as "เร็วๆ นี้" (Coming Soon)
 * without hard-coding fake or broken links.
 */

export interface BookConfiguration {
  bookTitle: string;
  bookSubtitle: string;
  authorName: string;
  authorBio: string;
  bookCover: string;
  description: string;
  pdfPurchaseUrl: string | null;
  mebPurchaseUrl: string | null;
  paperBookUrl: string | null;
  lineOaUrl: string | null;
  authorSocialLinks: {
    facebook?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
  };
}

export const bookConfig: BookConfiguration = {
  bookTitle: 'ทั้งที่รู้ว่าไม่ดี...ทำไมยังทำซ้ำ',
  bookSubtitle: 'คู่มือดึงสติและรู้เท่าทันลูปความคิด อารมณ์ และพฤติกรรมเดิมๆ',
  authorName: 'นัตตี้ (NTYGOGO)',
  authorBio:
    'นักเขียนและผู้สร้างสรรค์เนื้อหาด้านการรู้เท่าทันตนเอง (Self-Awareness) ผู้ถ่ายทอดเรื่องราวการฝึกสติและจิตวิทยาความสัมพันธ์ในภาษาที่อบอุ่น เรียบง่าย และจับต้องได้จริง',
  bookCover: '/images/deung_sati_hero_banner.png',
  description:
    'หนังสือที่ช่วยให้เราเข้าใจว่าทำไมสมองและใจถึงพาเรากลับไปทำพฤติกรรมเดิมๆ แม้รู้ว่าไม่ดี พร้อมทั้งเครื่องมือทีละก้าวเพื่อหยุดส่อง รู้ทัน และเลือกตอบสนองด้วยความเมตตาต่อตนเอง',
  pdfPurchaseUrl: null, // กำหนดเป็น null ไว้ -> UI จะแสดง "เร็วๆ นี้"
  mebPurchaseUrl: null, // กำหนดเป็น null ไว้ -> UI จะแสดง "เร็วๆ นี้"
  paperBookUrl: null, // กำหนดเป็น null ไว้ -> UI จะแสดง "เร็วๆ นี้"
  lineOaUrl: null, // กำหนดเป็น null ไว้ -> UI จะแสดง "เร็วๆ นี้"
  authorSocialLinks: {
    facebook: null,
    instagram: null,
    tiktok: null,
    youtube: null,
  },
};
