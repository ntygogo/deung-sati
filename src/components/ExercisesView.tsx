import React, { useState } from 'react';
import { BreathingPacer } from './BreathingPacer';
import { ConsequenceSimulatorView } from './ConsequenceSimulatorView';
import { CommunicationFilterView } from './CommunicationFilterView';
import { EmpathyLensView } from './EmpathyLensView';
import { BedtimeUnloadView } from './BedtimeUnloadView';
import { BodyCalmView } from './BodyCalmView';
import { GroundingExercise } from './GroundingExercise';
import { SoundHealingView } from './SoundHealingView';
import { ReleaseRitual } from './ReleaseRitual';
import { MindfulLibraryModal } from './MindfulLibraryModal';
import { SurvivalLensQuizView } from './SurvivalLensQuizView';
import { DeskSomaticResetView } from './DeskSomaticResetView';
import {
  Scale,
  MessageSquare,
  Glasses,
  Wind,
  Activity,
  Compass,
  Moon,
  Volume2,
  Sparkles,
  BookOpen,
  ChevronLeft,
  Coffee,
  Brain,
} from 'lucide-react';

export type ExerciseToolId =
  | 'simulator'
  | 'empathy'
  | 'filter'
  | 'quiz'
  | 'desk'
  | 'breathing'
  | 'body'
  | 'grounding'
  | 'bedtime'
  | 'sound'
  | 'release'
  | 'library';

type CategoryFilter = 'all' | 'thought' | 'body' | 'rest';

interface ToolMetadata {
  id: ExerciseToolId;
  title: string;
  shortTitle: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  imageIllustration: string;
  themeColor: string;
  bgLight: string;
  category: 'thought' | 'body' | 'rest';
}

const TOOL_DEFINITIONS: Record<ExerciseToolId, ToolMetadata> = {
  // --- 1. Thought & Psychology ---
  empathy: {
    id: 'empathy',
    title: 'แว่นส่องใจอีกฝ่าย (Empathy Lens)',
    shortTitle: 'แว่นส่องใจอีกฝ่าย',
    subtitle: 'ถอดรหัสจิตวิทยาคนอื่น ➔ จัดการใจและสื่อสารอย่างมีวุฒิภาวะ',
    badge: 'ถอดรหัสใจ',
    icon: <Glasses size={24} />,
    imageIllustration: '/images/couple_empathy.svg',
    themeColor: '#B86A3E',
    bgLight: 'rgba(184, 106, 62, 0.15)',
    category: 'thought',
  },
  simulator: {
    id: 'simulator',
    title: 'กระจกจำลองผลลัพธ์ (Worst-Case)',
    shortTitle: 'กระจกจำลองผลลัพธ์',
    subtitle: 'ฉายภาพ 10 นาที / 10 วัน / 10 เดือน ก่อนตัดสินใจชั่ววูบ',
    badge: 'เช็คความเสี่ยง',
    icon: <Scale size={24} />,
    imageIllustration: '/images/mirror_empathy_style.svg',
    themeColor: '#dc2626',
    bgLight: 'rgba(220, 38, 38, 0.15)',
    category: 'thought',
  },
  filter: {
    id: 'filter',
    title: 'กลั่นกรองข้อความก่อนส่ง (NVC)',
    shortTitle: 'กลั่นกรองข้อความ',
    subtitle: 'ถอดคำประชด สกัดความต้องการจริง และปรับคำพูดใหม่',
    badge: 'สื่อสารสันติ',
    icon: <MessageSquare size={24} />,
    imageIllustration: '/images/filter_empathy_style.svg',
    themeColor: '#4f7a6b',
    bgLight: 'rgba(79, 122, 107, 0.15)',
    category: 'thought',
  },
  quiz: {
    id: 'quiz',
    title: 'แบบสำรวจเลนส์เอาตัวรอด',
    shortTitle: 'สำรวจเลนส์เอาตัวรอด',
    subtitle: 'ค้นหาชุดเกราะในวัยเด็กของคุณ (สายเอาใจ, แบกคนเดียว, เป๊ะ, หลบเลี่ยง)',
    badge: 'ค้นหาตัวเอง',
    icon: <Brain size={24} />,
    imageIllustration: '/images/quiz_empathy_style.svg',
    themeColor: '#b45309',
    bgLight: 'rgba(217, 119, 6, 0.15)',
    category: 'thought',
  },

  // --- 2. Body & Somatic Reset ---
  desk: {
    id: 'desk',
    title: 'คลายร่างฉุกเฉิน 60 วินาที',
    shortTitle: 'คลายร่าง 60 วิ',
    subtitle: 'หย่อนไหล่ คลายกราม ยืดอก ถอนหายใจลึกที่โต๊ะทำงาน',
    badge: 'รีเซ็ต 1 นาที',
    icon: <Coffee size={24} />,
    imageIllustration: '/images/desk_empathy_style.svg',
    themeColor: '#B86A3E',
    bgLight: 'rgba(184, 106, 62, 0.15)',
    category: 'body',
  },
  breathing: {
    id: 'breathing',
    title: 'ฝึกหายใจ (Breathing Pacer)',
    shortTitle: 'ฝึกหายใจ Pacer',
    subtitle: '4 โหมดสรีรวิทยา สยบความล่กและใจสั่นใน 30 วินาที',
    badge: 'สยบใจสั่น',
    icon: <Wind size={24} />,
    imageIllustration: '/images/breathing_empathy_style.svg',
    themeColor: '#219ebc',
    bgLight: 'rgba(33, 158, 188, 0.15)',
    category: 'body',
  },
  body: {
    id: 'body',
    title: 'คลายกาย & กล้ามเนื้อ (PMR)',
    shortTitle: 'คลายกล้ามเนื้อ PMR',
    subtitle: 'เกร็งแล้วคลาย 4 ส่วน และทาบมือบนหัวใจ 1 นาที',
    badge: 'ผ่อนคลายกาย',
    icon: <Activity size={24} />,
    imageIllustration: '/images/body_empathy_style.svg',
    themeColor: '#d97706',
    bgLight: 'rgba(217, 119, 6, 0.15)',
    category: 'body',
  },
  grounding: {
    id: 'grounding',
    title: 'กราวดิ้ง 5-4-3-2-1',
    shortTitle: 'กราวดิ้ง 5-4-3-2-1',
    subtitle: 'ดึงประสาทสัมผัสกลับมาอยู่กับความเป็นจริงตรงหน้า',
    badge: 'คืนสู่ปัจจุบัน',
    icon: <Compass size={24} />,
    imageIllustration: '/images/grounding_empathy_style.svg',
    themeColor: '#4a7c59',
    bgLight: 'rgba(74, 124, 89, 0.15)',
    category: 'body',
  },

  // --- 3. Rest, Night & Wisdom ---
  bedtime: {
    id: 'bedtime',
    title: 'ทิ้งเรื่องค้างคาก่อนนอน (Sleep Vault)',
    shortTitle: 'ทิ้งเรื่องก่อนนอน',
    subtitle: 'ล็อกกล่องฝากเรื่องวันพรุ่งนี้ พร้อมเปิดเสียงกล่อมนอน',
    badge: 'หลับลึก',
    icon: <Moon size={24} />,
    imageIllustration: '/images/bedtime_empathy_style.svg',
    themeColor: '#8ecae6',
    bgLight: 'rgba(142, 202, 230, 0.2)',
    category: 'rest',
  },
  sound: {
    id: 'sound',
    title: 'เสียงบำบัด & ขันทิเบต',
    shortTitle: 'เสียงบำบัด Mixer',
    subtitle: 'คลื่น 432Hz/528Hz, ขันทิเบต, ฝนตกแม่สลอง, คลื่นทะเล',
    badge: 'Web Audio',
    icon: <Volume2 size={24} />,
    imageIllustration: '/images/sound_empathy_style.svg',
    themeColor: '#4f7a6b',
    bgLight: 'rgba(79, 122, 107, 0.15)',
    category: 'rest',
  },
  release: {
    id: 'release',
    title: 'กล่องปล่อยวาง (Let It Go)',
    shortTitle: 'กล่องปล่อยวาง',
    subtitle: 'พิมพ์เรื่องที่ติดค้างในหัว แล้วสลายตัวเป็นละอองดาว',
    badge: 'ปลดล็อกใจ',
    icon: <Sparkles size={24} />,
    imageIllustration: '/images/release_empathy_style.svg',
    themeColor: '#e09f3e',
    bgLight: 'rgba(224, 159, 62, 0.15)',
    category: 'rest',
  },
  library: {
    id: 'library',
    title: 'คลังยาใจ: หนังสือ & พอดแคสต์',
    shortTitle: 'คลังยาใจ & หนังสือ',
    subtitle: 'ทั้งที่รู้ว่าไม่ดีฯ (NTYGOGO), หนังสือภาพฮีลใจ, พอดแคสต์ฟรี',
    badge: 'คัดสรรเพื่อคุณ',
    icon: <BookOpen size={24} />,
    imageIllustration: '/images/library_empathy_style.svg',
    themeColor: '#d97706',
    bgLight: 'rgba(217, 119, 6, 0.15)',
    category: 'rest',
  },
};

interface ExercisesViewProps {
  onStartChat?: (initialTopic?: string) => void;
}

export const ExercisesView: React.FC<ExercisesViewProps> = ({ onStartChat }) => {
  const [selectedTool, setSelectedTool] = useState<ExerciseToolId | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  // If a tool is selected, render the focused tool screen with back navigation
  if (selectedTool) {
    if (selectedTool === 'library') {
      return (
        <div className="exercises-screen">
          <MindfulLibraryModal
            isOpen={true}
            onClose={() => setSelectedTool(null)}
          />
        </div>
      );
    }

    const currentMeta = TOOL_DEFINITIONS[selectedTool];
    return (
      <div className="exercises-screen focused-mode">
        {/* Top Focused Navigation Bar */}
        <div className="focused-top-bar">
          <button
            type="button"
            className="btn-back-to-hub"
            onClick={() => setSelectedTool(null)}
          >
            <ChevronLeft size={18} />
            <span>กลับไปเลือกหมวดอื่น</span>
          </button>

          <span className="focused-tool-tag" style={{ color: currentMeta.themeColor }}>
            {currentMeta.badge}
          </span>
        </div>

        {/* Render Selected Interactive Tool */}
        <div className="focused-tool-content">
          {selectedTool === 'simulator' && <ConsequenceSimulatorView onStartChat={onStartChat} />}
          {selectedTool === 'empathy' && <EmpathyLensView onStartChat={onStartChat} />}
          {selectedTool === 'filter' && <CommunicationFilterView onStartChat={onStartChat} />}
          {selectedTool === 'quiz' && <SurvivalLensQuizView onStartChat={onStartChat} />}
          {selectedTool === 'desk' && <DeskSomaticResetView />}
          {selectedTool === 'breathing' && <BreathingPacer />}
          {selectedTool === 'body' && <BodyCalmView />}
          {selectedTool === 'grounding' && <GroundingExercise />}
          {selectedTool === 'bedtime' && <BedtimeUnloadView />}
          {selectedTool === 'sound' && <SoundHealingView />}
          {selectedTool === 'release' && <ReleaseRitual />}
        </div>
      </div>
    );
  }

  // Render Full Illustrated Storybook Cards (กรอบสีขาว พร้อมภาพแบนเนอร์ใหญ่)
  const allTools = Object.values(TOOL_DEFINITIONS);
  const thoughtTools = allTools.filter((t) => t.category === 'thought');
  const bodyTools = allTools.filter((t) => t.category === 'body');
  const restTools = allTools.filter((t) => t.category === 'rest');

  const renderToolCard = (tool: ToolMetadata) => (
    <button
      key={tool.id}
      type="button"
      className="story-tool-card"
      onClick={() => setSelectedTool(tool.id)}
    >
      {/* Top Large Hero Banner Image */}
      <div className="story-card-banner">
        <img
          src={tool.imageIllustration}
          alt={tool.shortTitle}
          className="story-card-img"
          loading="lazy"
        />
        <span className="story-card-badge-floating">
          {tool.badge}
        </span>
      </div>

      {/* Bottom Content in White Card */}
      <div className="story-card-content">
        <h4 className="story-card-title">{tool.shortTitle}</h4>
        <p className="story-card-sub">{tool.subtitle}</p>
      </div>
    </button>
  );

  return (
    <div className="exercises-screen">
      {/* Header */}
      <div className="exercises-header-section">
        <h2 className="loops-title">ศูนย์รวมความสงบ & สติ</h2>
        <p className="loops-subtitle">เลือกเครื่องมือดูแลใจที่ตรงกับความรู้สึกของคุณตอนนี้</p>
      </div>

      {/* Category Filter Pills */}
      <div className="hub-category-filter-row">
        <button
          type="button"
          className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <span>🌟 ทั้งหมด ({allTools.length})</span>
        </button>
        <button
          type="button"
          className={`filter-pill emergency ${activeFilter === 'thought' ? 'active' : ''}`}
          onClick={() => setActiveFilter('thought')}
        >
          <span>🧠 ดักความคิด & จิตวิทยา ({thoughtTools.length})</span>
        </button>
        <button
          type="button"
          className={`filter-pill body ${activeFilter === 'body' ? 'active' : ''}`}
          onClick={() => setActiveFilter('body')}
        >
          <span>🫁 ร่างกาย & ลมหายใจ ({bodyTools.length})</span>
        </button>
        <button
          type="button"
          className={`filter-pill rest ${activeFilter === 'rest' ? 'active' : ''}`}
          onClick={() => setActiveFilter('rest')}
        >
          <span>🌙 ปล่อยวาง & พักใจ ({restTools.length})</span>
        </button>
      </div>

      <div className="exercise-zones-container">
        {/* ZONE 1: 🧠 โซนดักความคิด & ถอดรหัสจิตวิทยา */}
        {(activeFilter === 'all' || activeFilter === 'thought') && (
          <div className="exercise-zone-block highlight-zone">
            <div className="zone-header">
              <div className="zone-badge" style={{ color: '#B86A3E' }}>
                <Brain size={16} />
                <span>หมวดที่ 1: ดักความคิด & ถอดรหัสจิตวิทยา</span>
              </div>
              <p className="zone-desc">ถอดรหัสใจตัวเองและคนอื่น ชะลออารมณ์ก่อนตัดสินใจ และสกัดความต้องการจริง</p>
            </div>

            {/* 2-Column Grid with Large Hero Illustrations */}
            <div className="story-tools-grid">
              {thoughtTools.map(renderToolCard)}
            </div>
          </div>
        )}

        {/* ZONE 2: 🫁 โซนผ่อนคลายร่างกาย & ระบบประสาท */}
        {(activeFilter === 'all' || activeFilter === 'body') && (
          <div className="exercise-zone-block">
            <div className="zone-header">
              <div className="zone-badge" style={{ color: '#219ebc' }}>
                <Activity size={16} />
                <span>หมวดที่ 2: ผ่อนคลายร่างกาย & ระบบประสาท (Somatic)</span>
              </div>
              <p className="zone-desc">สำหรับเวลาที่ใจสั่น ตาลอย หายใจตื้น หรือเมื่อยล้าตึงคอบ่าไหล่จากการทำงาน</p>
            </div>

            <div className="story-tools-grid">
              {bodyTools.map(renderToolCard)}
            </div>
          </div>
        )}

        {/* ZONE 3: 🌙 โซนค่ำคืน ปล่อยวาง & คลังยาใจ */}
        {(activeFilter === 'all' || activeFilter === 'rest') && (
          <div className="exercise-zone-block">
            <div className="zone-header">
              <div className="zone-badge" style={{ color: '#8ecae6' }}>
                <Moon size={16} />
                <span>หมวดที่ 3: ปล่อยวาง หลับสบาย & คลังยาใจ</span>
              </div>
              <p className="zone-desc">พักสมองยามค่ำคืน ล็อกความคิดทิ้งไว้ชั่วคราว และเติมพลังใจด้วยหนังสือดีๆ</p>
            </div>

            <div className="story-tools-grid">
              {restTools.map(renderToolCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
