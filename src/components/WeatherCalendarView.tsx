import React, { useState } from 'react';
import type { MoodWeather, GratitudeEntry } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  X,
  Trash2,
  Check,
} from 'lucide-react';
import { MOOD_WEATHER_OPTIONS } from '../constants/moodOptions';

interface WeatherCalendarViewProps {
  entries?: GratitudeEntry[];
  onSaveEntry?: (entry: GratitudeEntry) => void;
  onDeleteEntry?: (id: string) => void;
  onSelectEntry?: (entry: GratitudeEntry) => void;
  openForDateStr?: string;
  onClosePicker?: () => void;
}

const MOOD_EMOTICONS: Record<
  MoodWeather,
  { emoticon: string; label: string; subtitle: string; color: string; bg: string; barColor: string }
> = {
  sunny: {
    emoticon: '😎✨',
    label: 'ตัวแม่ตัวมัม',
    subtitle: 'สดใส พลังงานล้น',
    color: '#e09f3e',
    bg: 'rgba(224, 159, 62, 0.18)',
    barColor: '#e09f3e',
  },
  partly_cloudy: {
    emoticon: '🫠🧋',
    label: 'ไหลชิลล์ๆ',
    subtitle: 'ปล่อยใจจอยๆ สบายๆ',
    color: '#219ebc',
    bg: 'rgba(33, 158, 188, 0.18)',
    barColor: '#219ebc',
  },
  rainy: {
    emoticon: '🥀🪫',
    label: 'ถ่านหมดเกลี้ยง',
    subtitle: 'ล้า หมดพลัง นอยด์',
    color: '#4a7c59',
    bg: 'rgba(74, 124, 89, 0.18)',
    barColor: '#4a7c59',
  },
  stormy: {
    emoticon: '🌋🧨',
    label: 'ไฟลุกพร้อมบวก',
    subtitle: 'หงุดหงิด โกรธ ล่ก',
    color: '#c84b31',
    bg: 'rgba(200, 75, 49, 0.18)',
    barColor: '#c84b31',
  },
};

const WEEKDAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const monthNamesThai = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const WeatherCalendarView: React.FC<WeatherCalendarViewProps> = ({
  entries = [],
  onSaveEntry,
  onDeleteEntry,
  openForDateStr,
  onClosePicker,
}) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Active Day Logger / Viewer State
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [editingMood, setEditingMood] = useState<MoodWeather>('partly_cloudy');
  const [editingText, setEditingText] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Create entries lookup map by YYYY-MM-DD
  const entriesMap = new Map<string, GratitudeEntry>();
  safeEntries.forEach((e) => {
    if (!e) return;
    const dStr = e.date || (e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : '');
    if (dStr) entriesMap.set(dStr, e);
  });

  // Watch openForDateStr prop
  React.useEffect(() => {
    if (openForDateStr) {
      handleDayClick(openForDateStr);
    }
  }, [openForDateStr]);

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Days in month
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate monthly stats
  const currentMonthEntries = safeEntries.filter((e) => {
    if (!e) return false;
    const d = new Date(e.createdAt || e.date);
    return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
  });

  const moodCounts: Record<MoodWeather, number> = {
    sunny: 0,
    partly_cloudy: 0,
    rainy: 0,
    stormy: 0,
  };

  currentMonthEntries.forEach((e) => {
    if (e.moodWeather && moodCounts[e.moodWeather] !== undefined) {
      moodCounts[e.moodWeather]++;
    }
  });

  const totalChecks = currentMonthEntries.length;

  // When clicking a day cell
  const handleDayClick = (dayString: string) => {
    setActiveDateStr(dayString);
    const existing = entriesMap.get(dayString);
    if (existing) {
      setEditingMood(existing.moodWeather || 'partly_cloudy');
      setEditingText(existing.text || '');
    } else {
      setEditingMood('partly_cloudy');
      setEditingText('');
    }
  };

  const handleCloseEditor = () => {
    setActiveDateStr(null);
    if (onClosePicker) onClosePicker();
  };

  // Save day log
  const handleSaveDayLog = () => {
    if (!activeDateStr) return;

    const existing = entriesMap.get(activeDateStr);
    const newOrUpdatedEntry: GratitudeEntry = {
      id: existing ? existing.id : `mood-${Date.now()}-${activeDateStr}`,
      date: activeDateStr,
      moodWeather: editingMood,
      text: editingText.trim() || `เช็คอินสภาพใจ ${MOOD_EMOTICONS[editingMood].label}`,
      tag: '🌦️ สภาพใจ',
      createdAt: existing ? existing.createdAt : new Date(`${activeDateStr}T12:00:00`).toISOString(),
    };

    if (onSaveEntry) {
      onSaveEntry(newOrUpdatedEntry);
    }
    handleCloseEditor();
  };

  // Delete day log
  const handleDeleteDayLog = () => {
    if (!activeDateStr) return;
    const existing = entriesMap.get(activeDateStr);
    if (existing && onDeleteEntry) {
      onDeleteEntry(existing.id);
    }
    handleCloseEditor();
  };

  // Generate witty, colorful, playful personality report
  const getPlayfulSummary = () => {
    if (totalChecks === 0) {
      return {
        badge: '🔮 พยากรณ์ใจล่วงหน้า',
        text: 'ยังไม่มีดาต้าในเดือนนี้เลย! แตะเลือกวันที่บนปฏิทินเพื่อบันทึกสภาพใจวันแรกได้เลยจ้า ✨',
        themeClass: 'playful-neutral',
      };
    }

    const { sunny, partly_cloudy, rainy, stormy } = moodCounts;
    const maxMood = Math.max(sunny, partly_cloudy, rainy, stormy);

    if (stormy === maxMood && stormy > 0) {
      return {
        badge: '🌋 เตือนภัยความเดือดระดับ Max!',
        text: `เดือนนี้พกฟืนพร้อมบวกไปถึง ${stormy} วัน (${Math.round((stormy / totalChecks) * 100)}%)! สะกิดนิดเดียวมีแววระเบิดตู้ม ใครเฉียดมาใกล้ช่วงนี้คือรอดมาได้แบบปาฏิหาริย์มาก ปรบมือให้ตับไตที่ยังไม่พัง แนะนำให้ไปจิบน้ำเย็นๆ ดับไฟในตัวด่วนจ้า 🔥`,
        themeClass: 'playful-stormy',
      };
    } else if (rainy === maxMood && rainy > 0) {
      return {
        badge: '🪫 รายงานวิญญาณหลุดจากร่าง',
        text: `พลังงานระดับแมวขี้เซา! แบตเหลือ 1% ไปแล้ว ${rainy} วัน (${Math.round((rainy / totalChecks) * 100)}%) วิญญาณแทบจะหลอมรวมเป็นเนื้อเดียวกับที่นอนแล้วมั้ง... แต่ใดๆ คือเธอเก่งมากที่ยังลากสังขารผ่านแต่ละวันมาได้นะ สุดยอดนักสู้ชีวิต! 🛌✨`,
        themeClass: 'playful-rainy',
      };
    } else if (sunny === maxMood && sunny > 0) {
      return {
        badge: '💅✨ รังสีตัวแม่ตัวมัมแผ่ซ่าน!',
        text: `ตัวมัมตัวคลอดบุตร! เดือนนี้เอนเนอร์จี้บวกพุ่งทะลุปรอทไป ${sunny} วัน (${Math.round((sunny / totalChecks) * 100)}%)! แดดยังต้องยกมือไหว้ให้ความสดใสของคุณ แจกพลังบวกจนคนรอบข้างต้องใส่แว่นกันแดดแล้วมั้งเนี่ย ปังไม่ไหว! 🕶️🔥`,
        themeClass: 'playful-sunny',
      };
    } else if (partly_cloudy === maxMood && partly_cloudy > 0) {
      return {
        badge: '🫠 สภาวะของเหลวครองเมือง',
        text: `ปล่อยใจจอยๆ ไหลตามแรงโน้มถ่วงไป ${partly_cloudy} วัน (${Math.round((partly_cloudy / totalChecks) * 100)}%)! ไม่หวือหวาแต่รอดตายอย่างสงบ ขับเคลื่อนชีวิตด้วยของกินอร่อยๆ และความชิลล์ระดับสิบ ถือว่าทรงตัวได้ดีเยี่ยม 🧋🛋️`,
        themeClass: 'playful-cloudy',
      };
    }

    return {
      badge: '🎢 รถไฟเหาะอารมณ์ 8 ตลบ',
      text: `สภาพอากาศในใจเดือนนี้แปรปรวนยิ่งกว่าฤดูในไทย! ครบทุกรสทั้งสดใสทั้งอยากหยุมคน แต่คุณก็ยังเก่งที่ประคองสติรอดมาได้ทุกวัน ปรบมือให้ตัวเองรัวๆ! 👏✨`,
      themeClass: 'playful-neutral',
    };
  };

  const playfulReport = getPlayfulSummary();

  const formattedActiveDate = activeDateStr
    ? new Date(`${activeDateStr}T12:00:00`).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="weather-calendar-card">
      {/* Calendar Header with Month Navigation */}
      <div className="cal-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarIcon size={18} className="text-primary" />
          <h4 className="cal-month-title">
            {monthNamesThai[month]} {year + 543}
          </h4>
        </div>

        <div className="cal-nav-buttons">
          <button type="button" className="btn-cal-nav" onClick={prevMonth} title="เดือนก่อนหน้า">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn-cal-nav" onClick={nextMonth} title="เดือนถัดไป">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="cal-tap-hint-text">
        <span>💡 แตะที่วันที่บนปฏิทินเพื่อบันทึกหรือดูความรู้สึกย้อนหลัง</span>
      </div>

      {/* Weekday Names Header */}
      <div className="cal-weekdays-grid">
        {WEEKDAY_NAMES.map((dayName, idx) => (
          <div key={idx} className="cal-weekday-cell">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Day Grid with Emoticons */}
      <div className="cal-days-grid">
        {/* Empty leading cells */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="cal-day-cell empty" />
        ))}

        {/* Month days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const entry = entriesMap.get(dayString);
          const isToday =
            new Date().getDate() === dayNum &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          const isSelected = activeDateStr === dayString;
          const moodConfig = entry && entry.moodWeather ? MOOD_EMOTICONS[entry.moodWeather] : null;

          return (
            <button
              key={`day-${dayNum}`}
              type="button"
              className={`cal-day-cell ${isToday ? 'today' : ''} ${entry ? 'has-entry' : ''} ${isSelected ? 'is-active-day' : ''}`}
              onClick={() => handleDayClick(dayString)}
              style={{
                backgroundColor: moodConfig ? moodConfig.bg : isSelected ? 'rgba(79, 122, 107, 0.15)' : undefined,
                borderColor: isSelected ? 'var(--primary)' : isToday ? '#B86A3E' : undefined,
                borderWidth: isSelected || isToday ? '2px' : undefined,
              }}
              title={entry ? `${dayNum} ${monthNamesThai[month]}: ${moodConfig?.label}` : `แตะเพื่อบันทึกวันที่ ${dayNum}`}
            >
              <span className="cal-day-number">{dayNum}</span>
              {moodConfig ? (
                <span className="cal-day-emoticon">{moodConfig.emoticon}</span>
              ) : (
                <span className="cal-day-add-hint">+</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Day Logger & Editor Card */}
      {activeDateStr && (
        <div className="cal-day-editor-card">
          <div className="cal-editor-header">
            <div className="cal-editor-title-row">
              <CalendarIcon size={16} className="text-primary" />
              <strong>{formattedActiveDate}</strong>
            </div>
            <button
              type="button"
              className="btn-cal-editor-close"
              onClick={handleCloseEditor}
              aria-label="ปิด"
            >
              <X size={15} />
            </button>
          </div>

          <label className="cal-editor-prompt">วันนี้ใจของคุณตรงกับข้อไหน?</label>
          
          <div className="cal-editor-mood-grid">
            {MOOD_WEATHER_OPTIONS.map((opt) => {
              const isSelected = editingMood === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`cal-editor-mood-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setEditingMood(opt.id)}
                  style={{
                    borderColor: isSelected ? opt.color : undefined,
                    backgroundColor: isSelected ? opt.bg : undefined,
                  }}
                >
                  <span className="cal-editor-mood-emo">{opt.emoticon}</span>
                  <div className="cal-editor-mood-txt">
                    <strong>{opt.label}</strong>
                    <small>{opt.subtitle}</small>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="cal-editor-note-box">
            <label className="cal-editor-note-label">บันทึกสั้นๆ 1 ประโยค (ไม่บังคับ):</label>
            <input
              type="text"
              className="cal-editor-note-input"
              placeholder="เช่น วันนี้งานเหนื่อยแต่ได้กินของอร่อย, ทะเลาะกับแฟนแต่ปรับความเข้าใจแล้ว..."
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="cal-editor-actions">
            {entriesMap.has(activeDateStr) && (
              <button
                type="button"
                className="btn-cal-delete"
                onClick={handleDeleteDayLog}
                title="ลบบันทึกวันนี้"
              >
                <Trash2 size={14} />
                <span>ลบ</span>
              </button>
            )}
            <button
              type="button"
              className="btn-cal-save"
              onClick={handleSaveDayLog}
            >
              <Check size={16} />
              <span>บันทึกลงปฏิทิน ✨</span>
            </button>
          </div>
        </div>
      )}

      {/* Monthly Statistics Breakdown */}
      <div className="cal-stats-summary">
        <div className="stats-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={15} className="text-primary" />
            <span className="stats-title">สถิติสภาพใจ ({totalChecks} วันที่เช็คอิน)</span>
          </div>
        </div>

        {/* Visual Weather Percentage Bars with colorful emoticons */}
        <div className="weather-bars-grid">
          {(['sunny', 'partly_cloudy', 'rainy', 'stormy'] as MoodWeather[]).map((moodKey) => {
            const count = moodCounts[moodKey];
            const percent = totalChecks > 0 ? Math.round((count / totalChecks) * 100) : 0;
            const config = MOOD_EMOTICONS[moodKey];

            return (
              <div key={moodKey} className="weather-stat-row">
                <div className="weather-stat-label">
                  <span style={{ fontSize: '0.95rem' }}>{config.emoticon}</span>
                  <span style={{ fontSize: '0.78rem' }}>{config.label}</span>
                </div>
                <div className="weather-bar-track">
                  <div
                    className="weather-bar-fill"
                    style={{ width: `${percent}%`, backgroundColor: config.barColor }}
                  />
                </div>
                <span className="weather-stat-num">{count} วัน ({percent}%)</span>
              </div>
            );
          })}
        </div>

        {/* Witty & Playful Personality Summary Card */}
        <div className={`playful-summary-box ${playfulReport.themeClass}`}>
          <div className="playful-badge-row">
            <Sparkles size={14} className="text-primary" />
            <span className="playful-badge-title">{playfulReport.badge}</span>
          </div>
          <p className="playful-summary-text">{playfulReport.text}</p>
        </div>
      </div>
    </div>
  );
};
