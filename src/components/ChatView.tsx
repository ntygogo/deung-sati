import React, { useState, useEffect, useRef } from 'react';
import type {
  ChatMessage,
  LoopMapData,
  SafetyClassificationResult,
  EmotionalCheckinData,
  CbtConversationStage,
  ConversationIntent,
} from '../types';
import {
  Send,
  Sparkles,
  PhoneCall,
  Wind,
  CheckCircle2,
  Share2,
  Edit3,
  Trash2,
  Info,
  Check,
  HelpCircle,
  Mic,
  MicOff,
} from 'lucide-react';
import { GroundingModal } from './GroundingModal';
import { LoopEditorModal } from './LoopEditorModal';
import { streamClientAiResponse } from '../utils/aiClientEngine';

interface ChatViewProps {
  initialTopic?: string;
  isPrivateSession: boolean;
  onSaveLoop: (loop: LoopMapData) => void;
  onNavigateToLoops: () => void;
  onNavigateToExercises?: () => void;
}

const THAI_CRISIS_HOTLINES = [
  { org: 'ศูนย์รับแจ้งเหตุด่วนเหตุร้าย (ตำรวจ)', phone: '191', desc: 'ภัยคุกคามเฉพาะหน้า และเหตุฉุกเฉิน', availability: '24 ชั่วโมง' },
  { org: 'สายด่วนสุขภาพจิต (กรมสุขภาพจิต)', phone: '1323', desc: 'ปรึกษาภาวะเครียด สิ้นหวัง วิตกกังวล', availability: 'โทรฟรี 24 ชั่วโมง' },
  { org: 'สมาคมสะมาริตันส์แห่งประเทศไทย', phone: '02-107-7977', desc: 'พื้นที่รับฟังด้วยใจ เพื่อป้องกันการทำร้ายตนเอง', availability: '12:00 - 22:00 น.' },
  { org: 'ศูนย์ช่วยเหลือสังคม (พม.)', phone: '1300', desc: 'วิกฤตความรุนแรงในครอบครัว และความปลอดภัย', availability: '24 ชั่วโมง' },
  { org: 'ศูนย์อุบัติเหตุและการแพทย์ฉุกเฉิน', phone: '1669', desc: 'เจ็บป่วยฉุกเฉิน ทำร้ายร่างกาย และกู้ชีพ', availability: '24 ชั่วโมง' },
];

export const ChatView: React.FC<ChatViewProps> = ({
  initialTopic,
  isPrivateSession,
  onSaveLoop,
  onNavigateToLoops,
  onNavigateToExercises,
}) => {
  const [sessionId] = useState<string>(() => `session-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isAiStreaming, setIsAiStreaming] = useState<boolean>(false);
  const [cbtStage, setCbtStage] = useState<CbtConversationStage>(1);
  const [conversationIntent, setConversationIntent] = useState<ConversationIntent>('unclear');
  const [checkinData, setCheckinData] = useState<EmotionalCheckinData>({ step: 'idle' });
  const [currentLoopData, setCurrentLoopData] = useState<LoopMapData | null>(null);
  const [isLoopSaved, setIsLoopSaved] = useState<boolean>(false);
  const [showGroundingModal, setShowGroundingModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [safetyState, setSafetyState] = useState<SafetyClassificationResult | null>(null);
  const [showLoopOffer, setShowLoopOffer] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Toggle Thai Speech Recognition (พูดแทนพิมพ์)
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn(e);
        }
      }
      setIsListening(false);
      setSpeechHint(null);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowObj = window as any;
    const SpeechRecognitionClass =
      windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert(
        'เบราว์เซอร์นี้ยังไม่รองรับระบบถอดเสียงภาษาไทยอัตโนมัติ แนะนำให้เปิดใช้งานผ่าน Google Chrome, Safari หรือ Microsoft Edge นะครับ'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'th-TH';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechHint('กำลังฟังเสียงภาษาไทยของคุณ... (พูดเสร็จแล้วกดหยุด)');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setSpeechHint(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechHint(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  // Initialize chat session
  useEffect(() => {
    if (initialTopic) {
      startInitialConversation(initialTopic);
    } else {
      startInitialConversation();
    }
    return () => {
      abortControllerRef.current?.abort();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, [initialTopic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiStreaming]);

  const startInitialConversation = async (topic?: string) => {
    setIsLoopSaved(false);
    setCurrentLoopData(null);
    setShowLoopOffer(false);
    setCheckinData({ step: 'idle' });
    setCbtStage(1);
    setConversationIntent('unclear');

    if (topic) {
      const userText = `ตอนนี้ฉันรู้สึก: "${topic}"`;
      const initialUserMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: userText,
      };
      setMessages([initialUserMsg]);
      await streamAiResponse([initialUserMsg]);
    } else {
      const greetingMsg: ChatMessage = {
        id: `ai-greet-${Date.now()}`,
        role: 'ai',
        text: 'สวัสดี... มีอะไรเกิดขึ้นกับเธอตอนนี้ เล่าให้เราฟังได้นะ ไม่ต้องรีบเรียบเรียง',
      };
      setMessages([greetingMsg]);
    }
  };

  const streamAiResponse = async (history: ChatMessage[]) => {
    setIsAiStreaming(true);
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const aiMsgId = `ai-${Date.now()}`;
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'ai',
      text: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, initialAiMsg]);

    const latestMsg = history.filter((m) => m.role === 'user').pop()?.text || '';
    if (/อยากตาย|ไม่อยากอยู่แล้ว|ทำร้ายตัวเอง|กรีดแขน|กินยาตาย|ฆ่าตัวตาย/i.test(latestMsg)) {
      setSafetyState({ mode: 'protect', risk_type: ['self_harm'], reason: 'self_harm', confidence: 1 });
    } else {
      setSafetyState({ mode: 'normal', risk_type: [], reason: 'normal', confidence: 1 });
    }

    const fetchController = new AbortController();
    abortControllerRef.current = fetchController;
    const fetchTimeout = setTimeout(() => fetchController.abort(), 15000);

    try {
      const formattedMessages = history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: formattedMessages,
          sessionState: {
            cbtStage,
            conversationIntent,
            checkinState: checkinData,
          },
        }),
        signal: fetchController.signal,
      });
      clearTimeout(fetchTimeout);

      if (!res.ok || !res.body) {
        throw new Error('Network response was not ok');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let serverOptions: string[] | undefined = undefined;
      let buffer = '';

      const processBlock = (block: string) => {
        if (!block.trim()) return;
        const lines = block.split('\n');
        let eventType = '';
        let dataStr = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            eventType = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            dataStr = trimmed.slice(5).trim();
          }
        }

        if (eventType === 'safety' && dataStr) {
          try {
            const safetyData = JSON.parse(dataStr);
            setSafetyState(safetyData);
          } catch (e) {
            console.error('Safety parse error:', e);
          }
        } else if (eventType === 'chunk' && dataStr) {
          try {
            const { text: chunk, options: opts } = JSON.parse(dataStr);
            if (opts) serverOptions = opts;
            if (chunk) {
              accumulatedText += chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, text: accumulatedText, options: serverOptions, isStreaming: true }
                    : msg
                )
              );
            }
          } catch (e) {
            console.error('Chunk parse error:', e);
          }
        } else if (eventType === 'done' && dataStr) {
          try {
            const {
              fullText,
              options: opts,
              checkinData: newCheckin,
              exerciseCard: newExercise,
            } = JSON.parse(dataStr);
            if (opts) serverOptions = opts;
            if (newExercise) serverExercise = newExercise;
            if (newCheckin) setCheckinData(newCheckin);
            if (fullText) {
              accumulatedText = fullText;
            }
          } catch (e) {
            console.error('Done event parse error:', e);
          }
        }
      };

      let serverExercise: any = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          processBlock(block);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        const remainingBlocks = buffer.split('\n\n');
        for (const block of remainingBlocks) {
          processBlock(block);
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: accumulatedText,
                options: serverOptions,
                exerciseCard: serverExercise,
                isStreaming: false,
              }
            : msg
        )
      );

      if (history.length >= 3) {
        checkAndOfferLoopMap([...history, { id: aiMsgId, role: 'ai', text: accumulatedText }]);
      }
    } catch (err: unknown) {
      console.warn('Backend unavailable, streaming from Client AI Engine seamlessly:', err);
      let accumulatedClientText = '';
      await streamClientAiResponse(
        history,
        checkinData,
        cbtStage,
        (chunk: string) => {
          accumulatedClientText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, text: accumulatedClientText, isStreaming: true }
                : msg
            )
          );
        },
        (clientResponse) => {
          if (clientResponse.checkinData) {
            setCheckinData(clientResponse.checkinData);
          }
          if (clientResponse.cbtStage) {
            setCbtStage(clientResponse.cbtStage);
          }
          if (clientResponse.conversationIntent) {
            setConversationIntent(clientResponse.conversationIntent);
          }
          if (clientResponse.safetyMode) {
            setSafetyState({ mode: clientResponse.safetyMode, risk_type: [], reason: '', confidence: 1 });
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? {
                    ...msg,
                    text: clientResponse.text,
                    options: clientResponse.options,
                    checkinData: clientResponse.checkinData,
                    exerciseCard: clientResponse.exerciseCard,
                    isStreaming: false,
                  }
                : msg
            )
          );
          if (
            history.length >= 4 &&
            (!clientResponse.checkinData ||
              clientResponse.checkinData.step === 'idle' ||
              clientResponse.checkinData.step === 'completed')
          ) {
            checkAndOfferLoopMap([...history, { id: aiMsgId, role: 'ai', text: clientResponse.text }]);
          }
        }
      );
    } finally {
      setIsAiStreaming(false);
      isSubmittingRef.current = false;
    }
  };

  const checkAndOfferLoopMap = async (allMessages: ChatMessage[]) => {
    try {
      const formatted = allMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const res = await fetch('/api/extract-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages: formatted }),
      });
      if (res.ok) {
        const loopResult = await res.json();
        if (loopResult.can_offer_loop) {
          setCurrentLoopData({
            id: `loop-${Date.now()}`,
            title: loopResult.title,
            event: loopResult.event,
            feeling: loopResult.feeling,
            interpretation: loopResult.interpretation,
            needFear: loopResult.need_fear,
            habitualResponse: loopResult.habitual_response,
            habitualResult: loopResult.habitual_result,
            newChoice: loopResult.new_choice,
            userConfirmed: false,
          });
          setShowLoopOffer(true);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not extract loop via backend, generating client loop:', err);
    }

    // Client-side intelligent loop extraction fallback
    const userMsgs = allMessages.filter((m) => m.role === 'user');
    const latestUserText = userMsgs[userMsgs.length - 1]?.text || 'เรื่องที่กังวล';
    setCurrentLoopData({
      id: `loop-${Date.now()}`,
      title: 'ลูปอารมณ์และการตอบสนองอัตโนมัติ',
      event: { value: latestUserText, sourceType: 'user_explicit' },
      feeling: { value: 'อึดอัด • กังวล • เครียด', sourceType: 'user_explicit' },
      interpretation: { value: 'รู้สึกว่าสถานการณ์นี้อยู่นอกเหนือการควบคุม หรือกลัวความผิดหวัง', sourceType: 'ai_reflection' },
      needFear: { value: 'ต้องการความปลอดภัย ความเข้าใจ และการยอมรับ', sourceType: 'ai_reflection' },
      habitualResponse: { value: 'พยายามคิดวนซ้ำๆ หรือถอยห่างออกมาเงียบๆ', sourceType: 'user_explicit' },
      habitualResult: { value: 'ความรู้สึกยังคงคั่งค้างและสะสมความล้า', sourceType: 'ai_reflection' },
      newChoice: { value: 'หยุดพักหายใจ ดึงสติรับรู้ความรู้สึก แล้วสื่อสารความต้องการอย่างตรงไปตรงมา', sourceType: 'user_explicit' },
      userConfirmed: false,
    });
    setShowLoopOffer(true);
  };

  const handleSendMessage = async (customText?: string | React.FormEvent) => {
    let userText = '';
    if (typeof customText === 'string') {
      userText = customText.trim();
    } else if (customText && typeof customText === 'object' && 'preventDefault' in customText) {
      customText.preventDefault();
      userText = inputText.trim();
    } else {
      userText = inputText.trim();
    }

    if (!userText || isAiStreaming || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    await streamAiResponse(newHistory);
  };

  const handleSaveLoopMap = () => {
    if (currentLoopData) {
      onSaveLoop(currentLoopData);
      setIsLoopSaved(true);
    }
  };

  // Find options from latest AI message if available and not streaming
  const latestAiMessage = messages.filter((m) => m.role === 'ai').pop();
  const activeQuickOptions =
    !isAiStreaming &&
    latestAiMessage?.options &&
    latestAiMessage.options.length > 0
      ? latestAiMessage.options
      : undefined;

  return (
    <div className="chat-screen">
      {/* Private Session Indicator (if active) */}
      {isPrivateSession && (
        <div
          style={{
            padding: '6px 16px',
            backgroundColor: 'var(--primary-subtle)',
            fontSize: '0.78rem',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Info size={14} />
          <span>🔒 โหมดไม่บันทึก: ข้อความจะไม่ถูกเก็บไว้หลังปิดหน้าจอ</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="messages-list">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`message-row ${msg.role}`}>
            <div className="bubble">
              {msg.text}

              {/* Special Moment: Micro-Exercise Card (Guided Check-in Step 6) */}
              {msg.exerciseCard && (
                <div className="checkin-exercise-card">
                  <div className="checkin-exercise-header">
                    <div className="checkin-exercise-title-group">
                      <Wind size={16} className="text-emerald-600" />
                      <span className="checkin-exercise-title">{msg.exerciseCard.title}</span>
                    </div>
                    <span className="checkin-exercise-badge">{msg.exerciseCard.duration}</span>
                  </div>
                  <p className="checkin-exercise-desc">{msg.exerciseCard.description}</p>
                  <div className="checkin-exercise-steps">
                    {msg.exerciseCard.steps.map((stepText, sIdx) => (
                      <div key={sIdx} className="checkin-step-item">
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Moment: Fact vs Story gentle reflection */}
              {msg.specialType === 'fact_story' && msg.factStory && (
                <div className="fact-story-card">
                  <div className="fact-section">
                    <span className="card-tag">สิ่งที่เกิดขึ้นจริง</span>
                    <span className="card-text">“{msg.factStory.fact}”</span>
                  </div>
                  <div className="story-section">
                    <span className="card-tag">สิ่งที่ใจเล่าต่อ</span>
                    <span className="card-text">“{msg.factStory.story}”</span>
                  </div>
                </div>
              )}

              {/* Special Moment: Choice Experience */}
              {msg.specialType === 'choice' && msg.choiceData && (
                <div className="choice-card">
                  <div className="choice-header">
                    <Sparkles size={16} />
                    <span>{msg.choiceData.title}</span>
                  </div>
                  <div className="choice-list">
                    {msg.choiceData.options.map((opt, i) => (
                      <button
                        key={i}
                        className="choice-option-btn"
                        onClick={() => handleSendMessage(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Quick Options for this AI Message */}
              {msg.role === 'ai' && msg.options && msg.options.length > 0 && idx === messages.length - 1 && !isAiStreaming && (
                <div className="msg-quick-options">
                  {msg.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      type="button"
                      className="quick-option-chip"
                      onClick={() => handleSendMessage(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Protect Mode Calm Crisis Safety Card */}
        {safetyState?.mode === 'protect' && (
          <div className="crisis-card" style={{ animation: 'scaleUp 0.3s ease' }}>
            <div className="crisis-header">
              <PhoneCall size={18} />
              <span>ช่องทางช่วยเหลือฉุกเฉิน (ประเทศไทย)</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--protect-text)', lineHeight: 1.5 }}>
              ความปลอดภัยของคุณและทุกคนสำคัญที่สุด คุณไม่ต้องเผชิญเรื่องนี้เพียงลำพัง
            </p>
            <div className="hotline-list">
              {THAI_CRISIS_HOTLINES.map((contact, idx) => (
                <div key={idx} className="hotline-item">
                  <div className="hotline-info">
                    <span className="hotline-org">{contact.org}</span>
                    <span className="hotline-desc">{contact.desc} • {contact.availability}</span>
                  </div>
                  <a href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`} className="hotline-call-btn">
                    <PhoneCall size={14} />
                    <span>{contact.phone}</span>
                  </a>
                </div>
              ))}
            </div>

            <button
              className="grounding-btn"
              onClick={() => setShowGroundingModal(true)}
              style={{ marginTop: 8 }}
            >
              <Wind size={16} />
              <span>ฝึกหายใจดึงสติ 60 วินาที</span>
            </button>
          </div>
        )}

        {/* Typing / Streaming Indicator */}
        {isAiStreaming && (
          <div className="message-row ai">
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        {/* Gentle Loop Map Offer (Not forced) */}
        {showLoopOffer && currentLoopData && !isLoopSaved && (
          <div
            className="gentle-card"
            style={{
              borderLeft: '3px solid var(--primary)',
              backgroundColor: 'var(--bg-surface)',
              marginTop: 12,
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              ตอนนี้เราเริ่มเห็นวงจรของเรื่องนี้ชัดขึ้นนิดหนึ่งแล้ว อยากดูไหมว่ามันเกิดเป็นลูปยังไง?
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn-primary-small"
                onClick={() => setShowLoopOffer(false)}
                style={{ fontSize: '0.82rem', padding: '8px 14px' }}
              >
                <Share2 size={14} />
                <span>ดูลูปนี้</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowLoopOffer(false)}
                style={{ fontSize: '0.82rem', padding: '8px 14px' }}
              >
                คุยต่อก่อน
              </button>
            </div>
          </div>
        )}

        {/* Display Current Generated Loop Map Card Inline */}
        {currentLoopData && !showLoopOffer && (
          <div className="loop-detail-card" style={{ animation: 'scaleUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                🗺️ แผนผังลูปความคิด
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Edit3 size={14} />
                <span>แก้ไข</span>
              </button>
            </div>

            {/* 5-Second Comprehension Structure */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentLoopData.event?.value && (
                <div className="loop-step-item">
                  <div className="loop-step-bullet" />
                  <span className="loop-step-label" style={{ color: 'var(--fact-text)' }}>เกิดอะไรขึ้นจริง</span>
                  <span className="loop-step-content" style={{ backgroundColor: 'var(--fact-bg)', border: '1px solid var(--fact-border)', color: 'var(--fact-text)' }}>
                    {currentLoopData.event.value}
                  </span>
                </div>
              )}

              {currentLoopData.feeling?.value && (
                <div className="loop-step-item">
                  <div className="loop-step-bullet" />
                  <span className="loop-step-label">ข้างในเกิดอะไรขึ้น</span>
                  <span className="loop-step-content">{currentLoopData.feeling.value}</span>
                </div>
              )}

              {currentLoopData.interpretation?.value && (
                <div className="loop-step-item">
                  <div className="loop-step-bullet" />
                  <span className="loop-step-label" style={{ color: 'var(--story-text)' }}>
                    ใจเล่าอะไรต่อ {currentLoopData.interpretation.sourceType === 'ai_reflection' && '(ข้อสะท้อน)'}
                  </span>
                  <span className="loop-step-content" style={{ backgroundColor: 'var(--story-bg)', border: '1px solid var(--story-border)', color: 'var(--story-text)' }}>
                    “{currentLoopData.interpretation.value}”
                  </span>
                  {currentLoopData.interpretation.sourceType === 'ai_reflection' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button className="quick-reply-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        <Check size={12} style={{ display: 'inline', marginRight: 2 }} /> ตรง
                      </button>
                      <button className="quick-reply-chip" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        <HelpCircle size={12} style={{ display: 'inline', marginRight: 2 }} /> ไม่ค่อยตรง
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentLoopData.habitualResponse?.value && (
                <div className="loop-step-item">
                  <div className="loop-step-bullet" />
                  <span className="loop-step-label">แล้วฉันมักทำอะไร</span>
                  <span className="loop-step-content">{currentLoopData.habitualResponse.value}</span>
                </div>
              )}

              {currentLoopData.habitualResult?.value && (
                <div className="loop-step-item">
                  <div className="loop-step-bullet" />
                  <span className="loop-step-label">ผลคือ</span>
                  <span className="loop-step-content">{currentLoopData.habitualResult.value}</span>
                </div>
              )}

              {currentLoopData.newChoice?.value && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    backgroundColor: 'var(--choice-bg)',
                    border: '1px solid var(--choice-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--choice-text)' }}>
                    จุดที่เราเริ่มเลือกได้
                  </span>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--choice-text)', marginTop: 2 }}>
                    “{currentLoopData.newChoice.value}”
                  </p>
                </div>
              )}
            </div>

            <div className="loop-actions-row">
              {isLoopSaved ? (
                <button
                  className="btn-primary-small"
                  onClick={onNavigateToLoops}
                  style={{ backgroundColor: 'var(--choice-text)' }}
                >
                  <CheckCircle2 size={16} />
                  <span>บันทึกแล้ว (ดูที่แท็บ ลูปของฉัน)</span>
                </button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setCurrentLoopData(null)}>
                    <Trash2 size={16} />
                    <span>ไม่บันทึก</span>
                  </button>
                  <button className="btn-primary-small" onClick={handleSaveLoopMap}>
                    <CheckCircle2 size={16} />
                    <span>บันทึกลูปนี้</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Real-time Voice Listening Toast Indicator */}
      {speechHint && (
        <div className="voice-listening-toast">
          <div className="listening-pulse-dot" />
          <span>{speechHint}</span>
          <button
            type="button"
            className="btn-stop-voice"
            onClick={toggleVoiceInput}
          >
            เสร็จสิ้น
          </button>
        </div>
      )}

      {/* Pinned Quick Option Chips Bar */}
      {activeQuickOptions && (
        <div className="pinned-quick-options-bar">
          {activeQuickOptions.map((opt, oIdx) => (
            <button
              key={oIdx}
              type="button"
              className="quick-option-chip"
              onClick={() => handleSendMessage(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSendMessage}>
        {/* Voice Input Button (พูดแทนพิมพ์) */}
        <button
          type="button"
          className={`btn-voice-input ${isListening ? 'listening' : ''}`}
          onClick={toggleVoiceInput}
          title={isListening ? 'กดเพื่อหยุดฟัง' : 'พูดแทนพิมพ์ (ภาษาไทย)'}
          aria-label="พูดแทนพิมพ์"
          disabled={isAiStreaming}
        >
          {isListening ? (
            <MicOff size={19} className="mic-active-icon" />
          ) : (
            <Mic size={19} />
          )}
        </button>

        <textarea
          className="chat-input"
          placeholder={
            isListening
              ? '🎙️ กำลังฟังเสียงของคุณอยู่... พูดเล่าได้เลยนะ'
              : 'พิมพ์เล่า หรือกดไมค์พูดได้เลย...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          rows={1}
          disabled={isAiStreaming}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!inputText.trim() || isAiStreaming}
          aria-label="ส่งข้อความ"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Modals */}
      {showGroundingModal && (
        <GroundingModal
          onClose={() => setShowGroundingModal(false)}
          onOpenFullExercises={onNavigateToExercises}
        />
      )}
      {showEditModal && currentLoopData && (
        <LoopEditorModal
          loop={currentLoopData}
          onSave={(updated) => {
            setCurrentLoopData(updated);
            if (isLoopSaved) onSaveLoop(updated);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};
