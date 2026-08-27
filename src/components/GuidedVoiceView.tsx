import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../services/soundEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  BookOpen,
  Moon,
  Heart,
  Cloud,
  Shield,
  Upload,
} from 'lucide-react';

export interface GuidedTrack {
  id: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  icon: React.ReactNode;
  themeColor: string;
  defaultBgSound: string; // 'freq-432' | 'nature-rain' | 'nature-ocean' | 'tibetan-bowl'
  script: string[];
}

export const GUIDED_TRACKS: GuidedTrack[] = [
  {
    id: 'bedtime-release',
    title: 'วางวันนี้ลง... พักผ่อนได้แล้ว',
    subtitle: 'กล่อมใจปล่อยวางเรื่องค้างคาก่อนนอน',
    durationLabel: '4 นาที',
    icon: <Moon size={22} />,
    themeColor: '#8ecae6',
    defaultBgSound: 'nature-rain',
    script: [
      'ยินดีต้อนรับสู่ช่วงเวลาแห่งความสงบของค่ำคืนนี้นะ...',
      'ไม่ว่าวันนี้คุณจะเจอเรื่องอะไรมา... ไม่ว่าจะมีเรื่องไหนที่ยังค้างคา หรือยังแก้ไม่เสร็จ...',
      'หน้าที่ของวันนี้ จบลงแล้วตรงนี้...',
      'เตียงนอนตรงนี้ไม่มีเรื่องงาน... ไม่มีความคาดหวัง... และไม่มีอะไรที่คุณต้องรีบพิสูจน์อีกต่อไป',
      'สูดหายใจเข้าช้าๆ ลึกๆ... และผ่อนลมหายใจออกยาวๆ สบายๆ...',
      'ปล่อยให้น้ำหนักตัวทั้งหมด ทิ้งลงบนเตียงนอนที่รองรับคุณอย่างปลอดภัย',
      'เรื่องของวันพรุ่งนี้... ปล่อยให้วันพรุ่งนี้เป็นคนดูแล...',
      'คืนนี้... คุณได้ทำดีที่สุดแล้ว พักผ่อนให้เต็มที่นะ หลับฝันดีครับ',
    ],
  },
  {
    id: 'body-compassion',
    title: 'ขอบคุณร่างกายที่แบกเรามาทั้งวัน',
    subtitle: 'สแกนและคลายกล้ามเนื้อพร้อมส่งความรักให้ตัวเอง',
    durationLabel: '5 นาที',
    icon: <Heart size={22} />,
    themeColor: '#e09f3e',
    defaultBgSound: 'freq-432',
    script: [
      'ลองสังเกตดูร่างกายของตัวเองในตอนนี้สักนิดนะ...',
      'กรามที่อาจจะขบแน่นอยู่โดยไม่รู้ตัว... ค่อยๆ คลายมันออกเบาๆ...',
      'บ่าและไหล่ที่แบกรับความตึงเครียดมาทั้งวัน... ทิ้งน้ำหนักมันลงมาอย่างสบายใจ',
      'ขอบคุณดวงตาคู่นี้... ที่มองสิ่งต่างๆ และพาเราผ่านพ้นเรื่องราวมากมาย',
      'ขอบคุณหัวใจดวงนี้... ที่ยังคงเต้นและทำหน้าที่ดูแลเราอย่างซื่อสัตย์เสมอในทุกวินาที',
      'ขอบคุณสองมือและสองเท้า... ที่พาเราเดินผ่านทุกอุปสรรคมาได้จนถึงตอนนี้',
      'คุณเก่งมากแล้วนะ... ร่างกายนี้เหนื่อยมาพอแล้ว ถึงเวลาได้พักผ่อนอย่างแท้จริง',
    ],
  },
  {
    id: 'overthinking-clouds',
    title: 'เมื่อความคิดตีกันในหัว',
    subtitle: 'มองความคิดเป็นก้อนเมฆที่ลอยผ่าน',
    durationLabel: '4 นาที',
    icon: <Cloud size={22} />,
    themeColor: '#4a7c59',
    defaultBgSound: 'nature-ocean',
    script: [
      'ถ้าในหัวตอนนี้มันกำลังวุ่นวาย... มีความคิดวิ่งชนกันเต็มไปหมด...',
      'ไม่ต้องพยายามไปห้ามมัน... และไม่ต้องวิ่งตามมันไปนะ',
      'ลองถอยออกมาหนึ่งก้าว... แล้วมองความคิดเหล่านั้น เหมือนก้อนเมฆที่กำลังลอยผ่านท้องฟ้า',
      'ความคิดมันเกิดขึ้นมา... แล้วเดี๋ยวมันก็จะค่อยๆ จางและลอยผ่านไปตามธรรมชาติ',
      'คุณไม่ใช่ความคิดนั้น... คุณคือผืนฟ้าที่กว้างใหญ่ สงบนิ่ง และปลอดภัยอยู่เบื้องหลังเสมอ',
      'สูดหายใจเข้าลึกๆ... รับรู้ความนิ่งที่มีอยู่จริงในตัวคุณตรงนี้',
    ],
  },
  {
    id: 'grounded-safety',
    title: 'ความปลอดภัยในปัจจุบัน',
    subtitle: 'ดึงสติสยบความตื่นตระหนกและใจสั่น',
    durationLabel: '3 นาที',
    icon: <Shield size={22} />,
    themeColor: '#219ebc',
    defaultBgSound: 'tibetan-bowl',
    script: [
      'ลองวางมือข้างหนึ่งไว้ที่หน้าอก... และอีกข้างหนึ่งไว้ที่หน้าท้อง...',
      'รับรู้ความอุ่นและน้ำหนักเบาๆ จากฝ่ามือของตัวเอง',
      'ตอนนี้คุณอยู่ที่นี่... ในที่ที่ปลอดภัย... ไม่มีอันตรายใดๆ ในวินาทีนี้',
      'ลมหายใจกำลังเข้า... ลมหายใจกำลังออก...',
      'ค่อยๆ หายใจช้าๆ ไปด้วยกันนะ... ทุกอย่างจะค่อยๆ ผ่านไป และคุณปลอดภัยดี',
    ],
  },
];

export const GuidedVoiceView: React.FC = () => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>('bedtime-release');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [showFullScript, setShowFullScript] = useState<boolean>(false);
  const [ambientSoundActive, setAmbientSoundActive] = useState<boolean>(true);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTrack = GUIDED_TRACKS.find((t) => t.id === selectedTrackId) || GUIDED_TRACKS[0];

  // Speech synthesis reference
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Handle ambient sound sync
  useEffect(() => {
    if (isPlaying && ambientSoundActive) {
      soundEngine.toggleTrack(activeTrack.defaultBgSound);
    } else {
      soundEngine.stopTrack(activeTrack.defaultBgSound);
    }

    return () => {
      soundEngine.stopTrack(activeTrack.defaultBgSound);
    };
  }, [isPlaying, ambientSoundActive, selectedTrackId]);

  // Voice narration progression
  useEffect(() => {
    if (!isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const currentText = activeTrack.script[currentLineIndex];
    if (!currentText) {
      setIsPlaying(false);
      setCurrentLineIndex(0);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentText);
      utterance.lang = 'th-TH';
      utterance.rate = 0.82; // Calm, gentle, slow pace
      utterance.pitch = 0.95;

      utterance.onend = () => {
        setTimeout(() => {
          if (isPlaying) {
            setCurrentLineIndex((prev) => {
              if (prev < activeTrack.script.length - 1) {
                return prev + 1;
              } else {
                setIsPlaying(false);
                return 0;
              }
            });
          }
        }, 1800); // 1.8s breath pause between lines
      };

      utterance.onerror = () => {
        // Fallback timer if speech synthesis fails
        setTimeout(() => {
          if (isPlaying) {
            setCurrentLineIndex((prev) => (prev < activeTrack.script.length - 1 ? prev + 1 : 0));
          }
        }, 4000);
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      const timer = setTimeout(() => {
        if (isPlaying) {
          setCurrentLineIndex((prev) => (prev < activeTrack.script.length - 1 ? prev + 1 : 0));
        }
      }, 4500);
      return () => clearTimeout(timer);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying, currentLineIndex, selectedTrackId]);

  const handleSelectTrack = (trackId: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    soundEngine.stopAll();
    setSelectedTrackId(trackId);
    setIsPlaying(false);
    setCurrentLineIndex(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentLineIndex(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
    }
  };

  const handleSleepTimer = (mins: number) => {
    if (sleepTimerMinutes === mins) {
      setSleepTimerMinutes(null);
      soundEngine.clearSleepTimer();
    } else {
      setSleepTimerMinutes(mins);
      soundEngine.setSleepTimer(mins, (remaining) => {
        if (remaining <= 0) {
          setIsPlaying(false);
          setSleepTimerMinutes(null);
        }
      });
    }
  };

  return (
    <div className="guided-voice-container">
      {/* Track Selector Carousel */}
      <div className="guided-tracks-scroll">
        {GUIDED_TRACKS.map((t) => {
          const isSelected = t.id === selectedTrackId;
          return (
            <button
              key={t.id}
              className={`guided-track-chip ${isSelected ? 'active' : ''}`}
              onClick={() => handleSelectTrack(t.id)}
              style={{ borderColor: isSelected ? t.themeColor : undefined }}
            >
              <div className="track-chip-icon" style={{ color: t.themeColor }}>
                {t.icon}
              </div>
              <div className="track-chip-text">
                <span className="track-chip-title">{t.title}</span>
                <span className="track-chip-dur">{t.durationLabel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Guided Player Card */}
      <div className="guided-player-card">
        <div className="player-card-header">
          <div className="player-icon-box" style={{ color: activeTrack.themeColor }}>
            {activeTrack.icon}
          </div>
          <div className="player-title-box">
            <h3 className="player-main-title">{activeTrack.title}</h3>
            <p className="player-subtitle">{activeTrack.subtitle}</p>
          </div>
        </div>

        {/* Live Spoken Line Display */}
        <div className="player-spoken-box">
          <div className="spoken-quote-mark">“</div>
          <p className="player-spoken-text">
            {isPlaying ? activeTrack.script[currentLineIndex] : 'กดปุ่มเล่นเพื่อเริ่มฟังเสียงนำสมาธิ'}
          </p>
          <div className="spoken-progress-dots">
            {activeTrack.script.map((_, idx) => (
              <span
                key={idx}
                className={`progress-dot ${idx === currentLineIndex ? 'current' : idx < currentLineIndex ? 'passed' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="player-controls-row">
          <button
            className={`btn-control-secondary ${ambientSoundActive ? 'active-ambient' : ''}`}
            onClick={() => setAmbientSoundActive(!ambientSoundActive)}
            title={ambientSoundActive ? 'ปิดเสียงบรรยากาศคลอ' : 'เปิดเสียงบรรยากาศคลอ'}
          >
            {ambientSoundActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button className="btn-primary btn-player-main" onClick={handleTogglePlay}>
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            <span>{isPlaying ? 'พักเสียง' : 'เริ่มฟังเสียงนำสมาธิ'}</span>
          </button>

          <button className="btn-control-secondary" onClick={handleReset} title="เริ่มใหม่อีกครั้ง">
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Ambient & Sleep Timer Options */}
        <div className="player-extra-bar">
          <div className="extra-ambient-label">
            <Sparkles size={14} className="text-primary" />
            <span>เสียงคลอ: <strong>{activeTrack.defaultBgSound}</strong></span>
          </div>

          <div className="sleep-timer-group">
            <Clock size={14} className="text-secondary" />
            <span style={{ fontSize: '0.78rem' }}>ตั้งเวลาปิด:</span>
            {[15, 30, 45].map((m) => (
              <button
                key={m}
                className={`mini-timer-btn ${sleepTimerMinutes === m ? 'active' : ''}`}
                onClick={() => handleSleepTimer(m)}
              >
                {m}น.
              </button>
            ))}
          </div>
        </div>

        {/* Script Reader Accordion */}
        <div className="player-script-accordion">
          <button
            className="btn-toggle-script"
            onClick={() => setShowFullScript(!showFullScript)}
          >
            <BookOpen size={14} />
            <span>{showFullScript ? 'ซ่อนบทอ่านทั้งหมด' : 'อ่านบทนำสมาธิทั้งหมด'}</span>
          </button>

          {showFullScript && (
            <div className="full-script-content">
              {activeTrack.script.map((line, idx) => (
                <p
                  key={idx}
                  className={`script-line ${idx === currentLineIndex && isPlaying ? 'active-reading' : ''}`}
                >
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Custom Audio Upload Option */}
        <div className="custom-voice-upload-bar">
          <input
            type="file"
            accept="audio/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="btn-upload-voice"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            <span>{customAudioUrl ? 'เปลี่ยนไฟล์เสียงอัดของคุณ' : 'อัปโหลดเสียงพูดจริงของคุณเอง (.mp3)'}</span>
          </button>
          {customAudioUrl && (
            <audio controls src={customAudioUrl} style={{ width: '100%', marginTop: 8 }} />
          )}
        </div>
      </div>
    </div>
  );
};
