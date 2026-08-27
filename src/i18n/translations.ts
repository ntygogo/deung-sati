export type Language = 'th' | 'en' | 'zh' | 'ja';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'th', label: 'ไทย', nativeName: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', nativeName: '日本語', flag: '🇯🇵' },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  th: {
    // Brand & Header
    brandTitle: 'ดึงสติ',
    brandSubtitle: 'พื้นที่ฮีลใจและถอดรหัสลูปอารมณ์',
    emergencyBtn: 'ฉุกเฉิน',
    emergencyTooltip: 'เบรกอารมณ์ฉุกเฉิน (สติหลุด/ตื่นตระหนก)',
    privateMode: 'โหมดส่วนตัว',
    privateModeActive: '🔒 ไม่บันทึก',
    plusBtn: 'อัปเกรด Plus',
    plusMember: 'สมาชิก Plus',

    // Navigation Tabs
    tabToday: 'วันนี้',
    tabChat: 'แชทดึงสติ',
    tabLoops: 'ลูปของฉัน',
    tabExercises: 'ฝึก',
    tabServices: 'บริการ',

    // Today Screen
    todayGreeting: 'วันนี้ใจคุณเป็นอย่างไรบ้าง?',
    todaySub: 'พิมพ์ระบาย หรือแตะประเด็นที่ติดค้างในหัวได้เลยนะ',
    heroChatBtn: '💬 ดึงสติตอนนี้',
    chip1: 'โกรธจนใจสั่น',
    chip2: 'กังวลเรื่องงาน',
    chip3: 'น้อยใจคนรัก',
    chip4: 'รู้สึกหมดไฟ',
    chip5: 'คิดวนก่อนนอน',
    duoMirrorTitle: 'กระจกจำลองผลลัพธ์',
    duoMirrorSub: 'ฉายภาพ 10 นาที / 10 วัน / 10 เดือน ก่อนตัดสินใจชั่ววูบ',
    duoEmpathyTitle: 'แว่นส่องใจอีกฝ่าย',
    duoEmpathySub: 'ถอดรหัสจิตวิทยาคนอื่น ➔ จัดการใจและสื่อสารอย่างมีวุฒิภาวะ',
    libraryBannerTitle: 'คลังยาใจ & หนังสือ',
    libraryBannerSub: 'ทั้งที่รู้ว่าไม่ดีฯ (NTYGOGO), หนังสือภาพฮีลใจ, พอดแคสต์ฟรี',
    founderTitle: 'คุยกับผู้สร้าง & สั่งซื้อหนังสือ',
    founderSub: 'นัตตี้ (NTYGOGO) ผู้เขียน "ทั้งที่รู้ว่าไม่ดี... ทำไมยังทำซ้ำ"',
    founderLineBtn: 'แอด LINE ทักแชตนัตตี้ (@ntygogo)',
    weatherWidget: 'สภาพอากาศอารมณ์',
    gratitudeWidget: 'โหลแก้วเก็บความสุข',

    // Chat Screen
    chatPlaceholder: 'พิมพ์เล่า หรือกดไมค์พูดได้เลย...',
    chatListening: '🎙️ กำลังฟังเสียงของคุณอยู่... พูดเล่าได้เลยนะ',
    voiceStop: 'เสร็จสิ้น',
    voiceTitle: 'พูดแทนพิมพ์',
    voiceHint: '🎙️ กำลังฟังเสียงของคุณ... พูดเล่าได้เลยนะ',

    // Plus Modal
    subTitle: 'ดึงสติ พลัส (Plus)',
    subCorporateTitle: 'ดึงสติ สำหรับองค์กร (Enterprise)',
    tabPersonal: 'บุคคลทั่วไป (Personal)',
    tabCorporate: 'องค์กร & HR (Corporate)',
    yearlyPlan: 'รายปี (แนะนำ)',
    monthlyPlan: 'รายเดือน',
    save33: 'ประหยัด 33% 🌟',
    perYear: '/ปี',
    perMonth: '/เดือน',
    cancelAnytime: 'ยกเลิกได้ตลอดเวลา',
  },

  en: {
    // Brand & Header
    brandTitle: 'Deung Sati',
    brandSubtitle: 'Mindful Loop & CBT Mental Wellness',
    emergencyBtn: 'SOS',
    emergencyTooltip: 'Emergency Panic & Emotional Brake',
    privateMode: 'Private Mode',
    privateModeActive: '🔒 Zero Storage',
    plusBtn: 'Upgrade Plus',
    plusMember: 'Plus Member',

    // Navigation Tabs
    tabToday: 'Today',
    tabChat: 'Mindful Chat',
    tabLoops: 'My Loops',
    tabExercises: 'Exercises',
    tabServices: 'Services',

    // Today Screen
    todayGreeting: 'How is your heart feeling today?',
    todaySub: 'Talk freely or tap a topic that has been on your mind.',
    heroChatBtn: '💬 Reset Mind Now',
    chip1: 'Trembling with Anger',
    chip2: 'Work Anxiety',
    chip3: 'Hurt by Partner',
    chip4: 'Burnout & Fatigue',
    chip5: 'Overthinking at Night',
    duoMirrorTitle: 'Worst-Case Mirror',
    duoMirrorSub: 'Simulate 10 min / 10 days / 10 months before reacting',
    duoEmpathyTitle: 'Empathy Lens',
    duoEmpathySub: 'Decode interpersonal psychology ➔ Mature & calm communication',
    libraryBannerTitle: 'Mindful Wisdom Library',
    libraryBannerSub: 'Featured Books by Nutty (NTYGOGO), Art therapy & Podcasts',
    founderTitle: 'Connect with the Author',
    founderSub: 'Nutty (NTYGOGO), Author of "Why We Repeat What We Know Is Bad"',
    founderLineBtn: 'Chat with Nutty on LINE (@ntygogo)',
    weatherWidget: 'Mood Weather',
    gratitudeWidget: 'Gratitude Jar',

    // Chat Screen
    chatPlaceholder: 'Type what you are going through, or tap mic to speak...',
    chatListening: '🎙️ Listening to your voice... Feel free to share',
    voiceStop: 'Done',
    voiceTitle: 'Voice to Text',
    voiceHint: '🎙️ Listening to your voice... Speak naturally',

    // Plus Modal
    subTitle: 'Deung Sati Plus',
    subCorporateTitle: 'Deung Sati for Enterprise',
    tabPersonal: 'Personal',
    tabCorporate: 'Teams & HR',
    yearlyPlan: 'Yearly (Best Value)',
    monthlyPlan: 'Monthly',
    save33: 'Save 33% 🌟',
    perYear: '/yr',
    perMonth: '/mo',
    cancelAnytime: 'Cancel anytime',
  },

  zh: {
    // Brand & Header
    brandTitle: '静心循环 (Deung Sati)',
    brandSubtitle: '情绪觉察与CBT心理疗愈空间',
    emergencyBtn: '紧急求助',
    emergencyTooltip: '情绪失控与恐慌急救刹车',
    privateMode: '无痕模式',
    privateModeActive: '🔒 不保存记录',
    plusBtn: '升级 Plus',
    plusMember: 'Plus 会员',

    // Navigation Tabs
    tabToday: '今日',
    tabChat: '静心对话',
    tabLoops: '我的心念环',
    tabExercises: '练习工具',
    tabServices: '服务工坊',

    // Today Screen
    todayGreeting: '今天你的内心感觉如何？',
    todaySub: '写下你的感受，或点击困扰你的情绪瞬间。',
    heroChatBtn: '💬 立即觉察倾诉',
    chip1: '愤怒到心跳加速',
    chip2: '职场焦虑与压力',
    chip3: '亲密关系受挫',
    chip4: '精力耗竭与倦怠',
    chip5: '深夜反复思虑',
    duoMirrorTitle: '后果镜像 (Worst-Case)',
    duoMirrorSub: '在冲动前预演 10分钟 / 10天 / 10个月的真实结果',
    duoEmpathyTitle: '共情透镜 (Empathy)',
    duoEmpathySub: '破译对方心理 ➔ 带着成熟与平静从容沟通',
    libraryBannerTitle: '心灵疗愈书库',
    libraryBannerSub: 'Nutty畅销书《明知不好为何屡屡重犯》、绘本与播客',
    founderTitle: '联系创作者与订购正版书',
    founderSub: 'Nutty (NTYGOGO) 心理畅销书作者',
    founderLineBtn: '通过 LINE 联系 Nutty (@ntygogo)',
    weatherWidget: '心情天气',
    gratitudeWidget: '感恩收藏罐',

    // Chat Screen
    chatPlaceholder: '输入你的心声，或点击麦克风直接说话...',
    chatListening: '🎙️ 正在倾听你的声音... 请随时倾诉',
    voiceStop: '完成',
    voiceTitle: '语音转文字',
    voiceHint: '🎙️ 正在录入中文语音... 随时倾诉',

    // Plus Modal
    subTitle: '静心循环 Plus (Deung Sati Plus)',
    subCorporateTitle: '企业与团队心理健康方案',
    tabPersonal: '个人方案',
    tabCorporate: '企业 & HR',
    yearlyPlan: '包年方案 (推荐)',
    monthlyPlan: '包月方案',
    save33: '立省 33% 🌟',
    perYear: '/年',
    perMonth: '/月',
    cancelAnytime: '随时可取消',
  },

  ja: {
    // Brand & Header
    brandTitle: 'マインドフル・ループ (Deung Sati)',
    brandSubtitle: '感情のループを解き明かすCBT心のオアシス',
    emergencyBtn: '緊急SOS',
    emergencyTooltip: 'パニック・感情爆発の緊急リセット',
    privateMode: 'プライベート',
    privateModeActive: '🔒 記録なし',
    plusBtn: 'Plus に登録',
    plusMember: 'Plus 会員',

    // Navigation Tabs
    tabToday: '今日',
    tabChat: '対話リセット',
    tabLoops: '心のループ',
    tabExercises: '心の練習',
    tabServices: 'サービス',

    // Today Screen
    todayGreeting: '今日のあなたの心模様はいかがですか？',
    todaySub: '胸の内を話すか、気になっているテーマをタップしてください。',
    heroChatBtn: '💬 今すぐ心をととのえる',
    chip1: '怒りで動悸がする',
    chip2: '仕事の強い不安',
    chip3: 'パートナーへの不満',
    chip4: '燃え尽き・倦怠感',
    chip5: '夜のぐるぐる思考',
    duoMirrorTitle: '結果シミュレーター',
    duoMirrorSub: '感情の衝動前に 10分後 / 10日後 / 10ヶ月後 を見つめる',
    duoEmpathyTitle: '共感レンズ',
    duoEmpathySub: '相手の心理を解読 ➔ 落ち着いた大人の対話へ',
    libraryBannerTitle: '心の処方箋ライブラリ',
    libraryBannerSub: '著者ナッティの本、心温まるアートセラピーとポッドキャスト',
    founderTitle: '著者ナッティとつながる・書籍購入',
    founderSub: 'Nutty (NTYGOGO) 心のベストセラー著者',
    founderLineBtn: 'LINE でナッティに連絡 (@ntygogo)',
    weatherWidget: '心の天気予報',
    gratitudeWidget: '感謝のガラス瓶',

    // Chat Screen
    chatPlaceholder: '今の気持ちを入力するか、マイクで話しかけてください...',
    chatListening: '🎙️ 音声を聞き取っています... ゆっくり話してください',
    voiceStop: '完了',
    voiceTitle: '音声入力',
    voiceHint: '🎙️ 日本語音声を認識中... お話しください',

    // Plus Modal
    subTitle: 'マインドフル・ループ Plus',
    subCorporateTitle: '法人・チーム向けメンタルウェルネス',
    tabPersonal: '個人プラン',
    tabCorporate: '法人・HR',
    yearlyPlan: '年額プラン (お得)',
    monthlyPlan: '月額プラン',
    save33: '33% OFF 🌟',
    perYear: '/年',
    perMonth: '/月',
    cancelAnytime: 'いつでも解約可能',
  },
};
