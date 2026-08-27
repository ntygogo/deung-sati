export type MediaDifficulty = 'easy' | 'medium' | 'deep';
export type MediaType = 'book' | 'podcast' | 'video';

export interface MindfulMediaItem {
  id: string;
  title: string;
  author: string;
  type: MediaType;
  difficulty: MediaDifficulty;
  difficultyLabel: string;
  moodTags: string[];
  description: string;
  keyTakeaway: string;
  coverEmoji: string;
  badge: string;
  links: {
    lineShopUrl?: string;
    shopeeAffiliate?: string;
    mebEbook?: string;
    youtubeUrl?: string;
    spotifyUrl?: string;
  };
}

export const MINDFUL_LIBRARY_ITEMS: MindfulMediaItem[] = [
  // --- 🌟 0. Flagship Masterpiece by Founder: NTYGOGO ---
  {
    id: 'book-why-repeat-bad-habits',
    title: 'ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ',
    author: 'นัตตี้ — NTYGOGO',
    type: 'book',
    difficulty: 'easy',
    difficultyLabel: 'อ่านสบาย • ฮีลใจลึกซึ้ง • มีแบบฝึกหัดในเล่ม',
    moodTags: ['คิดมาก / วิตกกังวล', 'อกหัก / สูญเสีย', 'เหนื่อยล้า / หมดไฟ', 'โกรธ / แค้น', 'ค้นหาตัวเอง'],
    description: 'หนังสือหัวใจสำคัญของแอปดึงสติ ที่ชวนคุณหยุดโทษตัวเอง แล้วหันกลับมาทำความเข้าใจว่าพฤติกรรมเดิมๆ ที่เราทำซ้ำ แท้จริงแล้วคือวิธีที่เด็กคนหนึ่งในอดีตเคยใช้เพื่อเอาตัวรอดในวันที่ไม่มีทางเลือก',
    keyTakeaway: '“สิ่งที่กำลังเลือกชีวิตของเราอยู่ตอนนี้... คือตัวเราในวันนี้ หรือเป็นใครบางคนในอดีตที่ยังพยายามปกป้องเราอยู่”',
    coverEmoji: '🐏✨',
    badge: '👑 หนังสือแม่บทประจำแอปดึงสติ',
    links: {
      lineShopUrl: 'https://lin.ee/snQhce5',
      mebEbook: 'https://www.mebmarket.com/ebook-463638-%E0%B8%97%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%A3%E0%B8%B9%E0%B9%89%E0%B8%A7%E0%B9%88%E0%B8%B2%E0%B9%84%E0%B8%A1%E0%B9%88%E0%B8%94%E0%B8%B5---%E0%B8%97%E0%B8%B3%E0%B9%84%E0%B8%A1%E0%B8%A2%E0%B8%B1%E0%B8%87%E0%B8%97%E0%B8%B3%E0%B8%8B%E0%B9%89%E0%B8%B3',
    },
  },

  // --- 1. Level 1: Easy / Picture Books for Broken Hearts & Exhaustion ---
  {
    id: 'book-grown-up-happy',
    title: 'โตขึ้นมาเป็นความสุข',
    author: 'คิดมาก (Kidmakk)',
    type: 'book',
    difficulty: 'easy',
    difficultyLabel: 'อ่านง่ายมาก • ภาพประกอบน่ารัก',
    moodTags: ['อกหัก / สูญเสีย', 'เหนื่อยล้า / หมดไฟ', 'เหงา / เคว้งคว้าง'],
    description: 'หนังสือรวมข้อความสั้นๆ และภาพประกอบอบอุ่น เหมาะมากสำหรับคนที่กำลังใจพัง ไม่มีสมาธิอ่านอะไรยาวๆ แค่เปิดอ่านทีละหน้าก็รู้สึกเหมือนได้รับการกอดใจ',
    keyTakeaway: '“ความสุขไม่ได้แปลว่าต้องยิ้มได้ตลอดเวลา แต่คือการอนุญาตให้ตัวเองรู้สึกเจ็บ แล้วรู้ว่าเดี๋ยวมันจะผ่านไป”',
    coverEmoji: '🌱📖',
    badge: '🌟 แนะนำสำหรับคนใจพัง',
    links: {
      shopeeAffiliate: 'https://shopee.co.th/search?keyword=โตขึ้นมาเป็นความสุข',
      mebEbook: 'https://www.mebmarket.com/index.php?action=SearchBook&page_no=1&min_price=&max_price=&exact_keyword=1&search=โตขึ้นมาเป็นความสุข',
    },
  },
  {
    id: 'book-home-for-broken-hearts',
    title: 'บ้านพักใจในวันที่ใจเปราะบาง',
    author: 'Kim Dan (คิมดัน)',
    type: 'book',
    difficulty: 'easy',
    difficultyLabel: 'อ่านง่ายมาก • ฮีลใจด่วน',
    moodTags: ['คิดมาก / วิตกกังวล', 'อกหัก / สูญเสีย', 'เหนื่อยล้า / หมดไฟ'],
    description: 'หนังสือภาพและบทความปลอบประโลมจิตใจจากเกาหลี ที่เปรียบเทียบใจเราเหมือนบ้านที่ต้องการการซ่อมแซมและปัดกวาดฝุ่นผง',
    keyTakeaway: '“เธอไม่จำเป็นต้องสมบูรณ์แบบเพื่อที่จะได้รับความรัก โดยเฉพาะความรักจากตัวเธอเอง”',
    coverEmoji: '🏡💛',
    badge: '☕ พักใจ 10 นาที',
    links: {
      shopeeAffiliate: 'https://shopee.co.th/search?keyword=บ้านพักใจในวันที่ใจเปราะบาง',
      mebEbook: 'https://www.mebmarket.com/index.php?action=SearchBook&exact_keyword=1&search=บ้านพักใจในวันที่ใจเปราะบาง',
    },
  },
  {
    id: 'book-cat-life-coach',
    title: 'เมื่อแมวที่บ้านผันตัวเป็นไลฟ์โค้ช',
    author: 'Stéphane Garnier',
    type: 'book',
    difficulty: 'easy',
    difficultyLabel: 'อ่านสนุก • มินิมอล',
    moodTags: ['คิดมาก / วิตกกังวล', 'เหนื่อยล้า / หมดไฟ', 'ค้นหาตัวเอง'],
    description: 'เรียนรู้ศิลปะแห่งการช่างแม่งและความสุขสงบผ่านพฤติกรรมของแมว ไม่แคร์สายตาใคร กินอิ่ม นอนอุ่น และรู้จักตั้งขอบเขตปกป้องตัวเอง',
    keyTakeaway: '“แมวไม่เคยรู้สึกผิดที่นอนกลางวัน และไม่เคยขอโทษใครที่เป็นตัวของตัวเอง”',
    coverEmoji: '🐾🐱',
    badge: '🐱 คลายเครียด 100%',
    links: {
      shopeeAffiliate: 'https://shopee.co.th/search?keyword=เมื่อแมวที่บ้านผันตัวเป็นไลฟ์โค้ช',
      mebEbook: 'https://www.mebmarket.com/index.php?action=SearchBook&exact_keyword=1&search=เมื่อแมวที่บ้านผันตัวเป็นไลฟ์โค้ช',
    },
  },

  // --- 2. Level 2: Medium / Pop-Psychology & Actionable Habits ---
  {
    id: 'book-courage-to-be-disliked',
    title: 'กล้าที่จะถูกเกลียด (The Courage to Be Disliked)',
    author: 'Ichiro Kishimi & Fumitake Koga',
    type: 'book',
    difficulty: 'medium',
    difficultyLabel: 'จิตวิทยาอ่านเพลิน • บทสนทนา',
    moodTags: ['โกรธ / แค้น', 'คิดมาก / วิตกกังวล', 'ค้นหาตัวเอง', 'ความสัมพันธ์'],
    description: 'ปรัชญาจิตวิทยาสำนักแอดเลอร์ (Adlerian Psychology) ผ่านบทสนทนาระหว่างปรัชญาเมธีกับชายหนุ่ม สอนเรื่อง "การแยกแยะงานของตัวเองและงานของคนอื่น" ตัดความแคร์สายตาคนรอบข้าง',
    keyTakeaway: '“คนอื่นจะคิดยังไงกับเธอ นั่นคืองานของเขา ไม่ใช่งานของเธอ... งานของเธอคือใช้ชีวิตของตัวเองให้ดีที่สุด”',
    coverEmoji: '🎭🏛️',
    badge: '🔥 หนังสือขายดีอันดับ 1',
    links: {
      shopeeAffiliate: 'https://shopee.co.th/search?keyword=กล้าที่จะถูกเกลียด',
      mebEbook: 'https://www.mebmarket.com/index.php?action=SearchBook&exact_keyword=1&search=กล้าที่จะถูกเกลียด',
    },
  },
  {
    id: 'book-atomic-habits',
    title: 'Atomic Habits เพราะชีวิตดีได้กว่าที่เป็น',
    author: 'James Clear',
    type: 'book',
    difficulty: 'medium',
    difficultyLabel: 'เข้าใจง่าย • นำไปใช้ได้จริง',
    moodTags: ['เหนื่อยล้า / หมดไฟ', 'ค้นหาตัวเอง'],
    description: 'วิธีเปลี่ยนชีวิตด้วยพลังของการเปลี่ยนพฤติกรรมทีละ 1% ในแต่ละวัน ไม่ต้องใช้พลังใจมหาศาล แต่สร้างสิ่งแวดล้อมที่ทำให้เราเติบโตอย่างมั่นคง',
    keyTakeaway: '“คุณไม่ได้ล้มเหลวเพราะตัวคุณไม่ดี แต่เป็นเพราะระบบที่คุณใช้อยู่มันยังไม่เอื้ออำนวยต่างหาก”',
    coverEmoji: '⚡📈',
    badge: '🏆 คัมภีร์เปลี่ยนชีวิต',
    links: {
      shopeeAffiliate: 'https://shopee.co.th/search?keyword=Atomic+Habits',
      mebEbook: 'https://www.mebmarket.com/index.php?action=SearchBook&exact_keyword=1&search=Atomic+Habits',
    },
  },

  // --- 3. Level 3: Deep / Stoicism & Meaning of Life ---
  {
    id: 'book-mans-search-meaning',
    title: 'Man\'s Search for Meaning (ชีวิตไม่ไร้ความหมาย)',
    author: 'Viktor E. Frankl',
    type: 'book',
    difficulty: 'deep',
    difficultyLabel: 'เจาะลึก • ปรัชญาคลาสสิก',
    moodTags: ['อกหัก / สูญเสีย', 'เหนื่อยล้า / หมดไฟ', 'ค้นหาตัวเอง'],
    description: 'บันทึกของจิตแพทย์ผู้รอดชีวิตจากค่ายกักกันเอาชวิทซ์ สะท้อนว่ามนุษย์เราสามารถก้าวข้ามความทุกข์ที่โหดร้ายที่สุดได้เสมอ หากเราค้นพบ "ความหมาย" ของการมีชีวิตอยู่',
    keyTakeaway: '“ระหว่างสิ่งเร้ากับการตอบสนอง จะมีช่องว่างอยู่เสมอ... ในช่องว่างนั้นคืออิสรภาพและพลังในการเลือกของเรา”',
    coverEmoji: '🕯️🌌',
    badge: '💎 วรรณกรรมระดับตำนาน',
    links: {
      shopeeAffiliate: 'https://shopee.co.th/search?keyword=Man+Search+for+Meaning+ภาษาไทย',
      mebEbook: 'https://www.mebmarket.com/index.php?action=SearchBook&exact_keyword=1&search=Man%27s+Search+for+Meaning',
    },
  },

  // --- 4. Curated Free Podcasts & Video Talks (100% Legal & Free to Stream) ---
  {
    id: 'podcast-ruok-boundary',
    title: 'R U OK Podcast: ศิลปะการตั้งขอบเขตกับคน Toxic',
    author: 'The Standard Podcast (ดุจดาว วัฒนปกรณ์)',
    type: 'podcast',
    difficulty: 'easy',
    difficultyLabel: 'ฟังสบาย • 15 นาที',
    moodTags: ['โกรธ / แค้น', 'ความสัมพันธ์', 'คิดมาก / วิตกกังวล'],
    description: 'พอดแคสต์ด้านจิตบำบัดที่จะพาคุณทำความเข้าใจว่าทำไมเราถึงยอมให้คนอื่นล้ำเส้น และวิธีปฏิเสธอย่างสุภาพแต่มั่นคงโดยไม่รู้สึกผิด',
    keyTakeaway: '“การตั้งขอบเขตไม่ใช่การเห็นแก่ตัว แต่คือการปกป้องสุขภาพจิตของเราเพื่อให้เราอยู่ร่วมกับคนอื่นได้อย่างยั่งยืน”',
    coverEmoji: '🎧🎙️',
    badge: '✨ พอดแคสต์ฟรี 100%',
    links: {
      youtubeUrl: 'https://www.youtube.com/results?search_query=R+U+OK+The+Standard+ตั้งขอบเขต',
      spotifyUrl: 'https://open.spotify.com/search/R%20U%20OK%20The%20Standard',
    },
  },
  {
    id: 'podcast-secret-sauce-burnout',
    title: 'The Secret Sauce: วิธีฟื้นฟูใจในวันที่หมดไฟ (Burnout Recovery)',
    author: 'เคน นครินทร์ วนกิจไพบูลย์',
    type: 'podcast',
    difficulty: 'easy',
    difficultyLabel: 'ฟังสบาย • 20 นาที',
    moodTags: ['เหนื่อยล้า / หมดไฟ', 'คิดมาก / วิตกกังวล'],
    description: 'สัมภาษณ์นักจิตวิทยาว่าด้วยการสังเกตสัญญาณหมดไฟ การจัดสรรพลังงานชีวิต และการอนุญาตให้ตัวเองพักผ่อนโดยไม่มีความรู้สึกผิด',
    keyTakeaway: '“พักผ่อนไม่ได้แปลว่าขี้เกียจ... รถแข่งที่เร็วที่สุดยังต้องเข้าพิทเพื่อเปลี่ยนยางและเติมน้ำมัน”',
    coverEmoji: '🔋🌿',
    badge: '🔥 ยอดวิวหลักแสน',
    links: {
      youtubeUrl: 'https://www.youtube.com/results?search_query=The+Secret+Sauce+Burnout+หมดไฟ',
      spotifyUrl: 'https://open.spotify.com/search/The%20Secret%20Sauce',
    },
  },
];
