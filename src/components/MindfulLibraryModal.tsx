import React, { useState } from 'react';
import { X, BookOpen, Headphones, ExternalLink, Sparkles, Filter, ShoppingBag, Tablet, Search, MessageCircle } from 'lucide-react';
import { MINDFUL_LIBRARY_ITEMS, type MindfulMediaItem } from '../data/mindfulLibrary';

interface MindfulLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMoodFilter?: string;
}

export const MindfulLibraryModal: React.FC<MindfulLibraryModalProps> = ({
  isOpen,
  onClose,
  initialMoodFilter,
}) => {
  const [selectedMood, setSelectedMood] = useState<string>(initialMoodFilter || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const moodFilters = [
    { label: '🌟 ทั้งหมด', value: 'all' },
    { label: '💔 อกหัก/สูญเสีย', value: 'อกหัก / สูญเสีย' },
    { label: '🔥 เหนื่อยล้า/หมดไฟ', value: 'เหนื่อยล้า / หมดไฟ' },
    { label: '🤯 คิดมาก/วิตกกังวล', value: 'คิดมาก / วิตกกังวล' },
    { label: '😡 โกรธ/แค้น', value: 'โกรธ / แค้น' },
    { label: '🎭 ค้นหาตัวเอง', value: 'ค้นหาตัวเอง' },
  ];

  const difficultyFilters: { label: string; value: string }[] = [
    { label: 'ทุกระดับ', value: 'all' },
    { label: '🟢 อ่านง่ายมาก (รูปเยอะ)', value: 'easy' },
    { label: '🟡 จิตวิทยาอ่านเพลิน', value: 'medium' },
    { label: '🟣 เจาะลึกปรัชญา', value: 'deep' },
    { label: '🎧 พอดแคสต์ฟรี', value: 'podcast' },
  ];

  const filteredItems = MINDFUL_LIBRARY_ITEMS.filter((item: MindfulMediaItem) => {
    // Mood Filter
    if (selectedMood !== 'all' && !item.moodTags.includes(selectedMood)) {
      return false;
    }
    // Difficulty / Format Filter
    if (selectedDifficulty === 'podcast') {
      if (item.type !== 'podcast') return false;
    } else if (selectedDifficulty !== 'all') {
      if (item.difficulty !== selectedDifficulty) return false;
    }
    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAuthor = item.author.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content mindful-library-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="library-header">
          <div className="library-header-title-box">
            <div className="library-header-icon">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="library-title">📚 คลังยาใจ: หนังสือ & พอดแคสต์</h2>
              <p className="library-sub">คัดสรรสื่อบำบัดใจตามระดับความยากง่ายและอารมณ์ของคุณ</p>
            </div>
          </div>
          <button type="button" className="sos-close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อหนังสือ, ผู้แต่ง, หรือหัวข้อฮีลใจ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-medium)',
              backgroundColor: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mood Filter Pills */}
        <div className="library-filter-scroll">
          <div className="library-filter-label">
            <Filter size={13} />
            <span>หมวดอารมณ์:</span>
          </div>
          <div className="library-filter-pills">
            {moodFilters.map((pill) => (
              <button
                key={pill.value}
                type="button"
                className={`library-pill-btn ${selectedMood === pill.value ? 'active' : ''}`}
                onClick={() => setSelectedMood(pill.value)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty / Format Pills */}
        <div className="library-filter-scroll">
          <div className="library-filter-label">
            <Sparkles size={13} />
            <span>รูปแบบ/ระดับ:</span>
          </div>
          <div className="library-filter-pills">
            {difficultyFilters.map((pill) => (
              <button
                key={pill.value}
                type="button"
                className={`library-pill-btn ${selectedDifficulty === pill.value ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty(pill.value)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items List Grid */}
        <div className="library-items-grid">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item.id} className="library-item-card">
                <div className="library-item-top">
                  <div className="library-cover-box">
                    <span className="library-cover-emoji">{item.coverEmoji}</span>
                  </div>

                  <div className="library-item-meta">
                    <div className="library-badge-row">
                      <span className="library-badge">{item.badge}</span>
                      <span className={`library-diff-tag diff-${item.difficulty}`}>
                        {item.difficultyLabel}
                      </span>
                    </div>

                    <h3 className="library-item-title">{item.title}</h3>
                    <p className="library-item-author">ผู้แต่ง/ผู้จัด: {item.author}</p>
                  </div>
                </div>

                <p className="library-item-desc">{item.description}</p>

                {/* Golden Wisdom Quote Box */}
                <div className="library-quote-box">
                  <p className="library-quote-text">{item.keyTakeaway}</p>
                </div>

                {/* Mood Tag Badges */}
                <div className="library-tags-row">
                  {item.moodTags.map((tag) => (
                    <span key={tag} className="library-tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Action Affiliate / Streaming Buttons */}
                <div className="library-actions-row">
                  {item.links.lineShopUrl && (
                    <a
                      href={item.links.lineShopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-library-action btn-line"
                    >
                      <MessageCircle size={14} />
                      <span>สั่งซื้อเล่มจริงผ่าน LINE (ทักนัตตี้)</span>
                      <ExternalLink size={12} className="ml-auto opacity-70" />
                    </a>
                  )}

                  {item.links.shopeeAffiliate && (
                    <a
                      href={item.links.shopeeAffiliate}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-library-action btn-shopee"
                    >
                      <ShoppingBag size={14} />
                      <span>สั่งซื้อเล่มจริง (Shopee)</span>
                      <ExternalLink size={12} className="ml-auto opacity-70" />
                    </a>
                  )}

                  {item.links.mebEbook && (
                    <a
                      href={item.links.mebEbook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-library-action btn-meb"
                    >
                      <Tablet size={14} />
                      <span>อ่าน E-book (MEB)</span>
                      <ExternalLink size={12} className="ml-auto opacity-70" />
                    </a>
                  )}

                  {item.links.youtubeUrl && (
                    <a
                      href={item.links.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-library-action btn-stream"
                    >
                      <Headphones size={14} />
                      <span>ฟังคลิปเต็ม (YouTube/Spotify)</span>
                      <ExternalLink size={12} className="ml-auto opacity-70" />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="library-empty-state">
              <span style={{ fontSize: '2rem' }}>🌿📖</span>
              <p>ยังไม่พบรายการในหมวดนี้ ลองเลือกหมวดอารมณ์อื่นดูนะ</p>
            </div>
          )}
        </div>

        {/* Affiliate Disclosure Footer */}
        <div className="library-footer-disclosure">
          💡 <em>ลิงก์สั่งซื้อหนังสือเป็นพันธมิตร Affiliate เพื่อช่วยสนับสนุนค่าเซิร์ฟเวอร์ในการพัฒนาแอปดึงสติให้เปิดใช้งานได้ฟรีต่อไป ขอบคุณที่ร่วมเป็นส่วนหนึ่งของการดูแลใจครับ</em>
        </div>
      </div>
    </div>
  );
};
