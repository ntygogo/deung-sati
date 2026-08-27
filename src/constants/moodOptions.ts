import type { MoodWeather } from '../types';

export const MOOD_WEATHER_OPTIONS: {
  id: MoodWeather;
  label: string;
  emoticon: string;
  subtitle: string;
  color: string;
  bg: string;
}[] = [
  {
    id: 'sunny',
    label: 'ตัวแม่ตัวมัม',
    emoticon: '😎✨',
    subtitle: 'พลังบวกเต็มคาราเบล',
    color: '#e09f3e',
    bg: 'rgba(224, 159, 62, 0.15)',
  },
  {
    id: 'partly_cloudy',
    label: 'ไหลชิลล์ๆ',
    emoticon: '🫠🧋',
    subtitle: 'เรื่อยๆ ตามกรรม',
    color: '#219ebc',
    bg: 'rgba(33, 158, 188, 0.15)',
  },
  {
    id: 'rainy',
    label: 'ถ่านหมดเกลี้ยง',
    emoticon: '🥀🪫',
    subtitle: 'แบตเหลือ 1%',
    color: '#4a7c59',
    bg: 'rgba(74, 124, 89, 0.15)',
  },
  {
    id: 'stormy',
    label: 'ไฟลุกพร้อมบวก',
    emoticon: '🌋🧨',
    subtitle: 'สะกิดปุ๊บหยุมปั๊บ',
    color: '#c84b31',
    bg: 'rgba(200, 75, 49, 0.15)',
  },
];
