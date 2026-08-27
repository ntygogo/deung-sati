import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGE_OPTIONS } from '../i18n/translations';
import type { Language } from '../i18n/translations';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGE_OPTIONS.find((o) => o.code === language) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="language-switcher-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="lang-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="เปลี่ยนภาษา / Change Language"
        aria-label="เปลี่ยนภาษา"
      >
        <span className="lang-flag">{currentOption.flag}</span>
        <span className="lang-code-text">{currentOption.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="lang-dropdown-menu">
          <div className="lang-dropdown-header">
            <Globe size={13} />
            <span>เลือกภาษา / Select Language</span>
          </div>
          <div className="lang-options-list">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                className={`lang-option-item ${language === opt.code ? 'active' : ''}`}
                onClick={() => handleSelect(opt.code)}
              >
                <span className="opt-flag">{opt.flag}</span>
                <span className="opt-name">{opt.nativeName}</span>
                {language === opt.code && <Check size={14} className="opt-check ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
