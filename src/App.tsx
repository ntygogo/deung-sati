import React, { useEffect, useRef, useState } from "react";
import {
  type Screen,
  type EvidenceType,
  type ChatMessage,
  type ExerciseId,
  type ExerciseResultPayload,
  EXERCISE_REGISTRY,
} from "./shared/chat-protocol";
import { InteractiveExerciseModal } from "./components/InteractiveExerciseModal";
import { GuidedExerciseCard } from "./components/GuidedExerciseCard";
import {
  AppHeader,
  AppDrawer,
  type DrawerMenuItemId,
} from "./components/Navigation";
import {
  NibbanaWorld,
  QuickChatCard,
  EmergencyPauseCard,
  QuickToolCard,
  FutureSelfCard,
  GrowthReflectionCard,
} from "./components/HomeComponents";
import { playDeepTibetanSingingBowl } from "./utils/tibetanBowlAudio";

const SvgIcon = ({
  name,
  size = 24,
  stroke = "#3F5944",
}: {
  name:
    | "leaf"
    | "chat"
    | "eye"
    | "check"
    | "path"
    | "user"
    | "pause"
    | "send"
    | "heart"
    | "plus"
    | "arrow"
    | "siren"
    | "volume"
    | "mute";
  size?: number;
  stroke?: string;
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "leaf")
    return (
      <svg {...common}>
        <path d="M20 4c-6.6.2-11 2.4-13 6.6C5.6 13.5 6 16.6 7 19" />
        <path d="M7 19c2.2-4.8 5.8-8.2 11-10.2" />
      </svg>
    );

  if (name === "chat")
    return (
      <svg {...common}>
        <path d="M4 5h16v11H8l-4 3V5Z" />
      </svg>
    );

  if (name === "eye")
    return (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );

  if (name === "check")
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );

  if (name === "path")
    return (
      <svg {...common}>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="19" r="2" />
        <path d="M8 5h5a3 3 0 0 1 0 6H9a3 3 0 1 0 0 6h7" />
      </svg>
    );

  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="7" r="3.5" />
        <path d="M4.5 21c.7-5 3.2-7.5 7.5-7.5S18.8 16 19.5 21" />
      </svg>
    );

  if (name === "pause")
    return (
      <svg {...common}>
        <path d="M9 5v14M15 5v14" />
      </svg>
    );

  if (name === "send")
    return (
      <svg {...common}>
        <path d="m3 11 17-7-7 17-2.5-7.5L3 11Z" />
      </svg>
    );

  if (name === "heart")
    return (
      <svg {...common}>
        <path d="M12 20S4 15 4 9a4 4 0 0 1 7-2.5A4 4 0 0 1 18 9c0 6-6 11-6 11Z" />
      </svg>
    );

  if (name === "plus")
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );

  if (name === "volume")
    return (
      <svg {...common}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );

  if (name === "mute")
    return (
      <svg {...common}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );

  return (
    <svg {...common}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
};

// Official Nibbana Baby Mascot Component with Aura
const Baby = ({
  small = false,
  dark = false,
  size,
}: {
  small?: boolean;
  dark?: boolean;
  size?: number;
}) => {
  const imgSrc = dark
    ? "/images/nibbana_baby_dark.jpg"
    : "/images/nibbana_baby_sage.jpg";

  const dim = size || (small ? 56 : 116);

  return (
    <div
      className={`officialBabyContainer ${small ? "officialBabySmall" : ""} ${
        dark ? "officialBabyDark" : ""
      }`}
      style={{ width: dim, height: dim }}
    >
      <div className="babyAuraPulse" />
      <img src={imgSrc} alt="Nibbana Baby" className="officialBabyImg" />
    </div>
  );
};

const BottomNav = ({
  screen,
  setScreen,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
}) => (
  <div className="bottomNav">
    <NavItem
      active={screen === "home"}
      label="วันนี้"
      icon="leaf"
      onClick={() => setScreen("home")}
    />
    <NavItem
      active={screen === "chat"}
      label="ดึงสติ"
      icon="chat"
      onClick={() => setScreen("chat")}
    />
    <NavItem
      active={screen === "journey"}
      label="เส้นทาง"
      icon="path"
      onClick={() => setScreen("journey")}
    />
    <NavItem
      active={screen === "profile"}
      label="ฉัน"
      icon="user"
      onClick={() => setScreen("profile")}
    />
  </div>
);

const NavItem = ({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: Parameters<typeof SvgIcon>[0]["name"];
  onClick: () => void;
}) => (
  <button className={`navItem ${active ? "navActive" : ""}`} onClick={onClick}>
    <div className="navIconWrap">
      <SvgIcon name={icon} size={22} stroke={active ? "#3F5944" : "#8A7868"} />
    </div>
    <span>{label}</span>
  </button>
);

// Developer Debug HUD Component (?debug=1)
// Developer Debug State for ?debug=1
export interface ChatDebugInfo {
  endpoint: string;
  requestStatus: "idle" | "sending" | "streaming" | "success" | "error";
  httpStatus: number | null;
  model: string;
  isLoading: boolean;
  lastError: string | null;
  messageCount: number;
  safetyState?: string;
  mode?: string;
  capacity?: string;
  intent?: string;
  stage?: number;
  readiness?: string;
  recommendedExercise?: string;
  consentState?: string;
  suggestedIntervention?: string;
  latencyMs?: number;
}

// Developer Debug HUD Component (?debug=1)
const DevDebugPanel = ({
  debugInfo,
}: {
  debugInfo: ChatDebugInfo;
}) => {
  return (
    <div className="devDebugPanel">
      <div className="devDebugHeader">🛠️ DEV DEBUG HUD (?debug=1)</div>
      <div className="devDebugRow">
        <span>liveApi:</span>
        <b style={{ color: "#81C784" }}>true (Google Gemini Live)</b>
      </div>
      <div className="devDebugRow">
        <span>Endpoint:</span>
        <b>{debugInfo.endpoint}</b>
      </div>
      <div className="devDebugRow">
        <span>Status:</span>
        <b
          className={`debugTag tag-${
            debugInfo.requestStatus === "error"
              ? "crisis"
              : debugInfo.requestStatus === "streaming" || debugInfo.requestStatus === "sending"
              ? "mode"
              : "normal"
          }`}
        >
          {debugInfo.requestStatus.toUpperCase()} ({debugInfo.httpStatus || "-"})
        </b>
      </div>
      <div className="devDebugRow">
        <span>Model:</span>
        <b>{debugInfo.model}</b>
      </div>
      <div className="devDebugRow">
        <span>Messages in Session:</span>
        <b>{debugInfo.messageCount}</b>
      </div>
      {debugInfo.lastError && (
        <div className="devDebugRow" style={{ color: "#FF8A80" }}>
          <span>Last Error:</span>
          <b>{debugInfo.lastError}</b>
        </div>
      )}
      <div className="devDebugRow">
        <span>safety / mode:</span>
        <b>
          <span className={`debugTag tag-${debugInfo.safetyState || "normal"}`}>
            {debugInfo.safetyState || "normal"}
          </span>{" "}
          / <span className="debugTag tag-mode">{debugInfo.mode || "HOLD"}</span> (Stage {debugInfo.stage || 1})
        </b>
      </div>
      <div className="devDebugRow">
        <span>capacity / readiness:</span>
        <b>
          {debugInfo.capacity || "-"} / {debugInfo.readiness || "-"}
        </b>
      </div>
      <div className="devDebugRow">
        <span>intent / intervention:</span>
        <b>
          {debugInfo.intent || "vent"} / {debugInfo.suggestedIntervention || "reflection"}
        </b>
      </div>
      <div className="devDebugRow">
        <span>consent / exercise:</span>
        <b>{debugInfo.consentState || "idle"} / {debugInfo.recommendedExercise || "none"}</b>
      </div>
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [showEvidence, setShowEvidence] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceType[]>([
    "หยุดก่อน",
    "เลือกใหม่",
  ]);

  // Active Interactive Exercise Modal state
  const [activeExerciseModal, setActiveExerciseModal] = useState<ExerciseId | null>(null);

  // Fresh Global Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial-ai",
      role: "ai",
      text: "ยินดีต้อนรับนะเธอ 🌱 วันนี้มีเรื่องไหนที่อยากชวนคุย หรือมีอะไรในใจ เล่าให้เราฟังได้เลยนะ...",
      options: ["วันนี้รู้สึกเหนื่อยจัง", "มีเรื่องที่ยังค้างคาใจ", "อยากลองดึงสติ"],
    },
  ]);

  // Dev Debug State
  const [debugInfo, setDebugInfo] = useState<ChatDebugInfo>({
    endpoint: "/api/chat/stream",
    requestStatus: "idle",
    httpStatus: null,
    model: "gemini-3.5-flash (Live)",
    isLoading: false,
    lastError: null,
    messageCount: 1,
    safetyState: "normal",
    mode: "HOLD",
    capacity: "medium",
    intent: "vent",
    readiness: "story",
    recommendedExercise: "none",
  });

  const globalRequestId = useRef(0);
  const isDebugMode = typeof window !== "undefined" && window.location.search.includes("debug=1");

  const handleDrawerSelect = (_routeId: DrawerMenuItemId) => {
    setIsDrawerOpen(false);
  };

  const handleStartChatFromHome = (textToSend: string) => {
    setScreen("chat");
    const reqId = ++globalRequestId.current;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend,
      createdAt: Date.now(),
    };
    const cleanHistory = chatMessages.filter((m) => m.text && m.text.trim());
    const newHistory = [...cleanHistory, userMsg];
    setChatMessages(newHistory);
    triggerAiStream(newHistory, reqId, globalRequestId, undefined, setChatMessages, setDebugInfo);
  };

  return (
    <div className="appShell">
      <style>{styles}</style>

      <div className="phone">
        {isDebugMode && <DevDebugPanel debugInfo={debugInfo} />}

        {screen === "home" && (
          <Home
            setScreen={setScreen}
            openEvidence={() => setShowEvidence(true)}
            onOpenMenu={() => setIsDrawerOpen(true)}
            onStartChat={handleStartChatFromHome}
          />
        )}

        {screen === "pause" && <PauseScreen setScreen={setScreen} />}

        {screen === "chat" && (
          <ChatScreen
            setScreen={setScreen}
            messages={chatMessages}
            setMessages={setChatMessages}
            debugInfo={debugInfo}
            setDebugInfo={setDebugInfo}
            onOpenExercise={(id) => setActiveExerciseModal(id)}
            onOpenMenu={() => setIsDrawerOpen(true)}
          />
        )}

        {screen === "beforeSpeak" && (
          <BeforeSpeak
            setScreen={setScreen}
            onOpenBeforeSpeakExercise={() => setActiveExerciseModal("before_speak")}
            onOpenMenu={() => setIsDrawerOpen(true)}
          />
        )}

        {screen === "perspective" && (
          <Perspective
            setScreen={setScreen}
            onOpenPerspectiveExercise={() => setActiveExerciseModal("perspective_lens")}
            onOpenMenu={() => setIsDrawerOpen(true)}
          />
        )}

        {screen === "journey" && (
          <Journey
            setScreen={setScreen}
            onOpenMenu={() => setIsDrawerOpen(true)}
          />
        )}

        {screen === "profile" && (
          <Profile
            setScreen={setScreen}
            onOpenMenu={() => setIsDrawerOpen(true)}
          />
        )}

        {!["pause", "beforeSpeak", "perspective"].includes(screen) && (
          <BottomNav screen={screen} setScreen={setScreen} />
        )}

        {/* Right-side Sliding Hamburger App Drawer */}
        <AppDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onEmergency={() => setScreen("pause")}
          onSelectRoute={handleDrawerSelect}
        />

        {showEvidence && (
          <EvidenceModal
            evidence={evidence}
            add={(item) => {
              setEvidence((old) =>
                old.includes(item) ? old : [...old, item]
              );
              setShowEvidence(false);
            }}
            close={() => setShowEvidence(false)}
          />
        )}

        {activeExerciseModal && (
          <InteractiveExerciseModal
            exerciseId={activeExerciseModal}
            onClose={() => setActiveExerciseModal(null)}
            onOpenFullscreenPause={() => setScreen("pause")}
            onComplete={(payload: ExerciseResultPayload) => {
              setActiveExerciseModal(null);
              // Dispatch natural human-readable exercise summary text back into the chat
              const userText =
                payload.summary_text ||
                `ฉันได้ทำแบบฝึกหัด "${
                  EXERCISE_REGISTRY[payload.exercise_id]?.title || payload.exercise_id
                }" เรียบร้อยแล้ว 🌱`;

              const reqId = ++globalRequestId.current;
              const userMsg: ChatMessage = {
                id: `user-ex-${Date.now()}`,
                role: "user",
                text: userText,
                createdAt: Date.now(),
                exerciseResult: payload,
              };

              const cleanHistory = chatMessages.filter((m) => m.text && m.text.trim());
              const newHistory = [...cleanHistory, userMsg];
              setChatMessages(newHistory);
              setScreen("chat");

              // Trigger AI continuation on the natural user result
              triggerAiStream(newHistory, reqId, globalRequestId, undefined, setChatMessages, setDebugInfo);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Sanitizer helper ensuring assistant_message is always pure natural human text and never raw JSON
function cleanAssistantText(rawText: string): string {
  if (!rawText) return "";
  let result = rawText.trim();
  if (result.startsWith("{") || result.startsWith("```")) {
    try {
      let clean = result;
      if (clean.startsWith("```json")) clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      else if (clean.startsWith("```")) clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed.assistant_message === "string") {
        result = parsed.assistant_message.trim();
      }
    } catch {
      const match = result.match(/"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      if (match && match[1]) {
        try {
          result = JSON.parse(`"${match[1]}"`).trim();
        } catch {
          result = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
        }
      }
    }
  }

  // Lightweight Thai spelling & spacing cleanup
  return result
    .replace(/มีเซง\b|มีเซนส์\b/g, "จับจังหวะได้")
    .replace(/\bเซง\b/g, "เซ็ง")
    .replace(/(\S+)\s+\1/g, (_m, word) => (["มาก", "จริง", "บ่อย", "ค่อย"].includes(word) ? `${word}ๆ` : word))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Helper to stream chat responses from the real /api/chat/stream endpoint
async function triggerAiStream(
  history: ChatMessage[],
  requestId: number,
  activeRequestIdRef: React.MutableRefObject<number>,
  isSendingRef?: React.MutableRefObject<boolean>,
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setDebugInfo?: React.Dispatch<React.SetStateAction<ChatDebugInfo>>,
  exerciseResult?: ExerciseResultPayload
) {
  const aiMsgId = `ai-${requestId}-${Date.now()}`;
  console.log(`[ASSISTANT_MESSAGE_CREATE] assistantMessageId=${aiMsgId} requestId=${requestId}`);

  const initialAiMsg: ChatMessage = {
    id: aiMsgId,
    role: "ai",
    text: "",
    createdAt: Date.now(),
    isStreaming: true,
  };

  if (setMessages) {
    setMessages((prev) => [...prev, initialAiMsg]);
  }

  if (setDebugInfo) {
    setDebugInfo((prev) => ({
      ...prev,
      requestStatus: "sending",
      isLoading: true,
      lastError: null,
      messageCount: history.length + 1,
    }));
  }

  try {
    // Exclude ExerciseResult messages from message history serialization (Fix 2: Never serialize as fake assistant or user speech)
    const formattedMessages = history
      .filter((m) => !m.exerciseResult && m.text && m.text.trim().length > 0)
      .map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text.trim(),
      }));

    // Resolve structured exercise context: immediate if just completed, or latest retained from history (Fix 3)
    let effectiveExerciseResult: any = exerciseResult ? { ...exerciseResult, timing: 'immediate' } : undefined;
    if (!effectiveExerciseResult) {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].exerciseResult) {
          effectiveExerciseResult = {
            ...history[i].exerciseResult,
            timing: 'retained',
          };
          break;
        }
      }
    }

    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: formattedMessages,
        sessionId: "default-session",
        requestId,
        exerciseResult: effectiveExerciseResult || undefined,
      }),
    });

    // Check if a newer request has superseded this one
    if (requestId !== activeRequestIdRef.current) {
      console.log(`[Chat Client] Stale request ${requestId} ignored (active is ${activeRequestIdRef.current})`);
      return;
    }

    if (setDebugInfo) {
      setDebugInfo((prev) => ({
        ...prev,
        httpStatus: response.status,
        requestStatus: response.ok ? "streaming" : "error",
      }));
    }

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) throw new Error("No response stream body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (requestId !== activeRequestIdRef.current) {
        reader.cancel();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.text && requestId === activeRequestIdRef.current) {
              console.log(`[STREAM_CHUNK] assistantMessageId=${aiMsgId}`);
              const sanitizedText = cleanAssistantText(data.text);
              if (setMessages) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, text: sanitizedText } : m
                  )
                );
              }
            }

            if (data.structuredTurn && requestId === activeRequestIdRef.current) {
              console.log(`[ASSISTANT_MESSAGE_FINALIZE] assistantMessageId=${aiMsgId}`);
              const finalText = cleanAssistantText(data.fullText || data.structuredTurn.assistant_message);
              if (setMessages) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          text: finalText || m.text,
                          structuredTurn: data.structuredTurn,
                          options: data.options || data.structuredTurn.quick_replies,
                          isStreaming: false,
                        }
                      : m
                  )
                );
              }
              if (setDebugInfo) {
                setDebugInfo((prev) => ({
                  ...prev,
                  requestStatus: "success",
                  isLoading: false,
                  safetyState: data.structuredTurn.safety_state,
                  mode: data.structuredTurn.mode,
                  capacity: data.structuredTurn.capacity,
                  intent: data.structuredTurn.user_intent || data.structuredTurn.intent,
                  stage: data.structuredTurn.stage || 1,
                  readiness: data.structuredTurn.readiness,
                  recommendedExercise: data.structuredTurn.recommended_exercise?.id || "none",
                  consentState: data.structuredTurn.checkin_consent || "idle",
                  suggestedIntervention: data.structuredTurn.suggested_intervention || "reflection",
                }));
              }
            }
          } catch {
            // Partial JSON chunk
          }
        }
      }
    }
  } catch (err: any) {
    if (requestId !== activeRequestIdRef.current) return;
    console.error("Chat Stream Error:", err);
    const errorMsg = err?.message || String(err);
    if (setDebugInfo) {
      setDebugInfo((prev) => ({
        ...prev,
        requestStatus: "error",
        isLoading: false,
        lastError: errorMsg,
      }));
    }
    if (setMessages) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text: "เมื่อกี้ระบบสะดุดนิดนึง ลองส่งอีกครั้งได้เลยนะ 🌱",
                isStreaming: false,
                hasError: true,
              }
            : m
        )
      );
    }
  } finally {
    if (isSendingRef) {
      isSendingRef.current = false;
    }
  }
}

function Home({
  setScreen,
  openEvidence,
  onOpenMenu,
  onStartChat,
}: {
  setScreen: (s: Screen) => void;
  openEvidence: () => void;
  onOpenMenu: () => void;
  onStartChat: (text: string) => void;
}) {
  return (
    <div className="screen scrollArea homeScreenRoot">
      <AppHeader
        title="วันนี้"
        onEmergency={() => setScreen("pause")}
        onOpenMenu={onOpenMenu}
      />

      {/* 1. NIBBANA SANCTUARY BANNER (Welcoming visual tone) */}
      <NibbanaWorld />

      {/* 2. QUICK CHAT — START VENTING / CONVERSATION IMMEDIATELY */}
      <QuickChatCard
        onStartChat={onStartChat}
        onOpenChat={() => setScreen("chat")}
      />

      {/* 3. QUICK TOOLS GRID */}
      <h3 className="sectionCategoryTitle">เครื่องมือช่วยใจของคุณ</h3>
      <div className="toolGrid">
        <QuickToolCard
          icon="💬"
          title="ก่อนพูด"
          subtitle="คิดก่อน... เพื่อสัมพันธ์ที่ดี"
          onClick={() => setScreen("beforeSpeak")}
        />
        <QuickToolCard
          icon="👁️"
          title="มองอีกมุม"
          subtitle="มองให้กว้างขึ้น"
          onClick={() => setScreen("perspective")}
        />
        <QuickToolCard
          icon="✓"
          title="เมื่อกี้ฉันรู้ทัน"
          subtitle="กลับมาทันใจ"
          onClick={openEvidence}
        />
      </div>

      {/* 4. SOOTHING EMERGENCY PAUSE (Gentle, Peaceful, Accessible) */}
      <div className="pauseSectionWrap">
        <EmergencyPauseCard onTriggerEmergency={() => setScreen("pause")} />
      </div>

      {/* 5. FUTURE SELF */}
      <FutureSelfCard
        trait="คนที่สงบและชัดเจน"
        evidence="หยุดก่อนพูดได้ 2 ครั้ง"
        onClick={() => setScreen("journey")}
      />

      {/* 6. GROWTH REFLECTION */}
      <GrowthReflectionCard
        topic="การรู้ทันความโกรธในความสัมพันธ์"
        percent={72}
        onClick={() => setScreen("journey")}
      />

      <div className="bottomSpacer" />
    </div>
  );
}

// Emergency Breathing & Tibetan Singing Bowl Pause Screen
function PauseScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bowlRinging, setBowlRinging] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseCount, setPhaseCount] = useState(4);

  const phases = [
    { label: "หายใจเข้า", prompt: "หายใจเข้าลึก ๆ... เติมความสงบ..." },
    { label: "ค้างไว้", prompt: "พักใจให้นิ่ง... ผ่อนคลาย..." },
    { label: "หายใจออก", prompt: "ค่อย ๆ ปล่อยความเครียดออกมา..." },
    { label: "หยุดพัก", prompt: "อยู่กับปัจจุบัน... สบายใจ..." },
  ];

  // Mind-calming harmonious frequencies (432 Hz Peace, 136.1 Hz Heart Om, 174 Hz Tension Release, 528 Hz Transformation)
  const bowlFrequencies = [432.0, 136.1, 174.0, 528.0];
  const strikeCount = useRef(0);

  const triggerBowl = (freq?: number, isInitial = false) => {
    setBowlRinging(true);
    if (soundEnabled) {
      const targetFreq =
        freq ||
        bowlFrequencies[strikeCount.current % bowlFrequencies.length];
      strikeCount.current++;
      playDeepTibetanSingingBowl({
        baseFreq: targetFreq,
        volume: isInitial ? 0.38 : 0.45, // Feather-soft, peaceful volume
        decayTime: 18.0,
        attackTime: isInitial ? 0.80 : 0.65, // Gentle swelling bloom (zero startle)
      });
    }
    setTimeout(() => setBowlRinging(false), 2600);
  };

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      triggerBowl(432.0, true);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [running]);

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setPhaseCount((c) => {
        if (c <= 1) {
          setPhaseIndex((prev) => {
            const next = (prev + 1) % 4;
            if (next === 0 && soundEnabled) {
              triggerBowl();
            }
            return next;
          });
          return 4;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, soundEnabled]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  const curPhase = phases[phaseIndex];

  return (
    <div className="pauseScreen">
      <div className="ambientGlow1" />
      <div className="ambientGlow2" />

      <div className="pauseTopBar">
        <button className="closePause" onClick={() => setScreen("home")} aria-label="ปิด">
          ×
        </button>

        <button
          className="soundToggleBtn"
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) triggerBowl();
          }}
          title={soundEnabled ? "ปิดเสียงขันธิเบต" : "เปิดเสียงขันธิเบต"}
        >
          <SvgIcon
            name={soundEnabled ? "volume" : "mute"}
            size={18}
            stroke="#FFF4D4"
          />
          <span>{soundEnabled ? "เสียงขันธิเบตเปิดอยู่" : "ปิดเสียง"}</span>
        </button>
      </div>

      <div className="pauseHeaderArea">
        <h2>ฉุกเฉิน - หยุดก่อน</h2>
        <p className="pauseSubtext">
          หยุดพักสักครู่... หายใจตามจังหวะ... ฟังเสียงขันธิเบต
        </p>
      </div>

      <div
        className={`breathRing ${
          running ? `phase-${phaseIndex}` : ""
        } ${bowlRinging ? "ringRinging" : ""}`}
      >
        <div className="breathRingCore">
          <small>{curPhase.label}</small>
          <strong>{phaseCount}</strong>
          <span>วินาที</span>
        </div>
        <div className="ringWave wave1" />
        <div className="ringWave wave2" />
      </div>

      <p className="phasePrompt">{curPhase.prompt}</p>

      <div
        className={`bowlArea ${bowlRinging ? "bowlStriking" : ""}`}
        onClick={() => triggerBowl()}
        role="button"
        tabIndex={0}
        title="แตะเพื่อเคาะเสียงขันธิเบต"
      >
        <div className="bowlRipple" />
        <div className="bowlBody">
          <div className="bowlRim" />
          <div className="bowlShine" />
        </div>
        <div className="bowlStick" />
        <div className="bowlTapHint">
          <span>🔔 แตะที่ขันธิเบตเพื่อฟังเสียงกังวาน</span>
        </div>
      </div>

      <div className="pauseTime">
        เหลือเวลาพักสติ <b>{seconds}</b> วินาที
      </div>

      <div className="pauseButtons">
        <button onClick={() => setRunning(!running)}>
          <SvgIcon name="pause" stroke="#fff" size={18} />
          <span>{running ? "หยุดพักชั่วคราว" : "ฝึกต่อ"}</span>
        </button>

        <button className="strikeBtn" onClick={() => triggerBowl()}>
          🔔 เคาะขันธิเบต
        </button>

        <button className="skipBtn" onClick={() => setScreen("chat")}>
          ไปคุยต่อ →
        </button>
      </div>

      {!running && seconds === 0 && (
        <button className="afterPauseButton" onClick={() => setScreen("chat")}>
          🌱 ตอนนี้ใจนิ่งขึ้นแล้ว... ไปคุยกันต่อ
        </button>
      )}
    </div>
  );
}

// REAL Interactive Chat Screen
function ChatScreen({
  setScreen,
  messages,
  setMessages,
  debugInfo,
  setDebugInfo,
  onOpenExercise,
  onOpenMenu,
}: {
  setScreen: (s: Screen) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  debugInfo: ChatDebugInfo;
  setDebugInfo: React.Dispatch<React.SetStateAction<ChatDebugInfo>>;
  onOpenExercise: (id: ExerciseId) => void;
  onOpenMenu: () => void;
}) {
  const [inputText, setInputText] = useState("");
  const [dismissedExerciseMsgIds, setDismissedExerciseMsgIds] = useState<string[]>([]);
  const [activeInlineExercise, setActiveInlineExercise] = useState<{ msgId: string; exerciseId: string } | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const activeRequestId = useRef(0);
  const isSendingRef = useRef(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeInlineExercise]);

  const handleSendMessage = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    if (isSendingRef.current) {
      console.log(`[Chat Client] Ignored send because previous request is in flight.`);
      return;
    }
    isSendingRef.current = true;

    // Check if user clicked quick reply or typed natural consent to try exercise
    const exerciseKeywords = [
      "ลองดู",
      "ลองดู (1 นาที)",
      "ลองดู (1–2 นาที)",
      "ลองทำ",
      "ลองคลายตรงนี้",
      "พักหายใจ 1 นาที",
      "ลองเลย",
      "โอเค",
      "พร้อม",
      "ลองส่องดูลูป",
      "เกลาข้อความก่อน",
      "มองอีกมุม",
      "วางแผน ถ้า...แล้ว...",
      "ซ่อมแซมใจ",
      "เลือกทางใหม่",
      "ช่วยดึงสติหน่อย",
    ];

    if (exerciseKeywords.some((k) => trimmed.includes(k))) {
      const lastAiMsg = [...messages].reverse().find((m) => m.role === "ai" && m.structuredTurn?.recommended_exercise);
      if (lastAiMsg?.structuredTurn?.recommended_exercise?.id) {
        setActiveInlineExercise({
          msgId: lastAiMsg.id,
          exerciseId: lastAiMsg.structuredTurn.recommended_exercise.id,
        });
        isSendingRef.current = false;
        return;
      }
    }

    const reqId = ++activeRequestId.current;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: Date.now(),
    };

    console.log(`[CHAT_SEND] userMessageId=${userMessage.id} requestId=${reqId}`);

    setInputText("");

    // Clean previous history
    const cleanPrev = messages.filter((m) => m.text && m.text.trim().length > 0);
    const nextHistory = [...cleanPrev, userMessage];

    // Set messages state directly
    setMessages(nextHistory);

    // Call triggerAiStream cleanly outside setState updater callback
    triggerAiStream(nextHistory, reqId, activeRequestId, isSendingRef, setMessages, setDebugInfo);
  };

  useEffect(() => {
    (window as any).__sendTestChatMessage = (text: string) => handleSendMessage(text);
    (window as any).__chatMessages = messages;
    (window as any).__chatDebugInfo = debugInfo;
  }, [messages, debugInfo]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComposingRef.current) {
      handleSendMessage(inputText);
    }
  };

  return (
    <div className="screen chatScreen">
      <AppHeader
        title="ดึงสติตอนนี้"
        onEmergency={() => setScreen("pause")}
        onOpenMenu={onOpenMenu}
      />

      <div className="chatSubHeader">
        <Baby small size={44} />
        <div className="chatSubHeaderCopy">
          <b>ดึงสติตอนนี้ 🌱</b>
          <span>นิพพานเบบี้พร้อมรับฟังคุณเสมอ...</span>
        </div>
      </div>

      <div className="chatBody" ref={chatScrollRef}>
        <div className="dateLabel">วันนี้</div>

        {messages.map((msg) => (
          <div key={msg.id} className="messageTurnWrapper">
            {msg.exerciseResult ? (
              <div
                className="exerciseResultCard"
                style={{
                  background: "#F2F6F3",
                  border: "1.5px solid #C4D9C7",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  margin: "12px auto",
                  maxWidth: "92%",
                  color: "#38503C",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", color: "#2E5E35" }}>
                  <span>🌱</span>
                  <span>บันทึกผลลัพธ์แบบฝึกหัด</span>
                </div>
                {msg.text.split("\n").map((line, idx) => (
                  <div key={idx} style={{ opacity: idx === 0 ? 0.85 : 1 }}>
                    {line}
                  </div>
                ))}
              </div>
            ) : msg.role === "user" ? (
              <div className="userBubble">
                {msg.text}
                <small>
                  {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ✓✓
                </small>
              </div>
            ) : (
              <div className="aiRow">
                <div className="aiAvatar">
                  <img
                    src="/images/nibbana_baby_sage.jpg"
                    alt="Nibbana Baby"
                    className="aiAvatarImg"
                  />
                </div>
                <div className="aiBubble">
                  {msg.text ? (
                    <div className="aiTextContent">
                      {cleanAssistantText(msg.text)
                        .split("\n")
                        .map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                    </div>
                  ) : msg.isStreaming ? (
                    <span className="streamingDots">กำลังพิมพ์ข้อความ...</span>
                  ) : null}

                  {/* Error with Retry Button */}
                  {msg.hasError && (
                    <div className="errorRetryWrap">
                      <button
                        type="button"
                        className="retryMessageBtn"
                        onClick={() => {
                          if (isSendingRef.current) {
                            console.log(`[Chat Client] Ignored retry because previous request is in flight.`);
                            return;
                          }
                          isSendingRef.current = true;
                          const reqId = ++activeRequestId.current;
                          const cleanHistory = messages.filter(
                            (m) => m.id !== msg.id && m.text && m.text.trim().length > 0
                          );
                          setMessages(cleanHistory);
                          triggerAiStream(
                            cleanHistory,
                            reqId,
                            activeRequestId,
                            isSendingRef,
                            setMessages,
                            setDebugInfo
                          );
                        }}
                      >
                        🔄 ลองส่งใหม่อีกครั้ง
                      </button>
                    </div>
                  )}

                  {/* INLINE GUIDED EXERCISE CARD (Interactive Intervention) */}
                  {activeInlineExercise?.msgId === msg.id && (
                    <GuidedExerciseCard
                      exerciseId={activeInlineExercise.exerciseId}
                      onComplete={(result) => {
                        setActiveInlineExercise(null);
                        setDismissedExerciseMsgIds((prev) => [...prev, msg.id]);

                        const exRecordMsg: ChatMessage = {
                          id: `ex-result-${Date.now()}`,
                          role: "ai",
                          text: result.summary_text || `[บันทึกผลแบบฝึกหัด: ${result.exercise_id}]`,
                          createdAt: Date.now(),
                          exerciseResult: result,
                        };

                        const cleanPrev = messages.filter((m) => m.text && m.text.trim().length > 0);
                        const nextHistory = [...cleanPrev, exRecordMsg];
                        setMessages(nextHistory);

                        const reqId = ++activeRequestId.current;
                        isSendingRef.current = true;
                        triggerAiStream(
                          nextHistory,
                          reqId,
                          activeRequestId,
                          isSendingRef,
                          setMessages,
                          setDebugInfo,
                          result
                        );
                      }}
                      onCancel={() => {
                        setActiveInlineExercise(null);
                      }}
                    />
                  )}

                  {/* Exercise Recommendation Consent Card (when not active) */}
                  {msg.structuredTurn?.recommended_exercise &&
                    activeInlineExercise?.msgId !== msg.id &&
                    !dismissedExerciseMsgIds.includes(msg.id) && (
                      <div className="exerciseConsentCard">
                        <div className="exerciseConsentHeader">
                          <span className="sparkleIcon">✨</span>
                          <b>
                            {EXERCISE_REGISTRY[
                              msg.structuredTurn.recommended_exercise.id
                            ]?.title || "แบบฝึกสติ"}
                          </b>
                        </div>
                        <p>{msg.structuredTurn.recommended_exercise.reason}</p>
                        <p className="consentQuestion">
                          อยากลองอะไรสั้นๆ ประมาณ 1 นาทีไหม?
                        </p>
                        <div className="consentBtnGroup">
                          <button
                            type="button"
                            className="launchExerciseBtn"
                            onClick={() =>
                              setActiveInlineExercise({
                                msgId: msg.id,
                                exerciseId: msg.structuredTurn!.recommended_exercise!.id,
                              })
                            }
                          >
                            ⚡ ลองดู (1–2 นาที)
                          </button>
                          <button
                            type="button"
                            className="consentDeclineBtn"
                            onClick={() => {
                              setDismissedExerciseMsgIds((prev) => [
                                ...prev,
                                msg.id,
                              ]);
                              handleSendMessage("ยังไม่อยากทำ ขอคุยต่อ");
                            }}
                          >
                            ยังไม่อยากทำ
                          </button>
                          <button
                            type="button"
                            className="consentDeclineBtn"
                            onClick={() => {
                              setDismissedExerciseMsgIds((prev) => [
                                ...prev,
                                msg.id,
                              ]);
                              handleSendMessage("ขอระบายก่อน");
                            }}
                          >
                            ขอระบายก่อน
                          </button>
                        </div>
                      </div>
                    )}

                  <small>
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </small>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Quick Reply Chips: strictly only rendered when latest message is finished AI turn */}
        {messages[messages.length - 1]?.role === "ai" &&
          messages[messages.length - 1]?.options &&
          !messages[messages.length - 1]?.isStreaming && (
            <div className="quickReplies">
              {messages[messages.length - 1].options!.map((opt) => (
                <button key={opt} onClick={() => handleSendMessage(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}

        {/* Agency Actions Bar */}
        <div className="agencyRow">
          {[
            {
              label: "หายใจลึกๆ",
              action: () => setScreen("pause"),
              icon: "≈",
            },
            {
              label: "ระบาย",
              action: () => handleSendMessage("อยากระบายความรู้สึกตอนนี้"),
              icon: "☁",
            },
            {
              label: "เข้าใจ",
              action: () =>
                handleSendMessage("ช่วยอธิบายและทำความเข้าใจเรื่องนี้หน่อย"),
              icon: "♡",
            },
            {
              label: "หยุดก่อน",
              action: () => handleSendMessage("อยากหยุดตัวเองก่อนทำอะไรใจร้อน"),
              icon: "✋",
            },
            {
              label: "คิดทางเลือก",
              action: () =>
                handleSendMessage("มีทางเลือกใหม่อะไรที่ใจดีกับตัวเองบ้าง"),
              icon: "⑂",
            },
          ].map((item) => (
            <button key={item.label} onClick={item.action}>
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
      </div>

      <form className="composer" onSubmit={handleFormSubmit}>
        <button
          type="button"
          className="plusButton"
          onClick={() => onOpenExercise("fact_story_unknown")}
          title="เปิดเมนูเครื่องมือช่วยใจ"
        >
          <SvgIcon name="plus" size={20} stroke="#5A4738" />
        </button>
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !isComposingRef.current &&
              !(e.nativeEvent as any).isComposing
            ) {
              e.preventDefault();
              handleSendMessage(inputText);
            }
          }}
          placeholder="เล่าให้เราฟังได้เลย... ตอนนี้อยากระบายอะไร?"
        />
        <button
          type="submit"
          className="sendButton"
          title="ส่งข้อความ"
          disabled={!inputText.trim() || debugInfo.isLoading}
        >
          <SvgIcon name="send" stroke="#fff" size={18} />
        </button>
      </form>
      <div className="bottomSpacer" />
    </div>
  );
}

function BeforeSpeak({
  setScreen,
  onOpenBeforeSpeakExercise,
  onOpenMenu,
}: {
  setScreen: (s: Screen) => void;
  onOpenBeforeSpeakExercise: () => void;
  onOpenMenu: () => void;
}) {
  const [text, setText] = useState("ทำไมเธอถึงไม่เคยเห็นใจเราเลย");
  const [refined, setRefined] = useState(
    "ช่วงนี้เรารู้สึกว่าต้องการพื้นที่และความสม่ำเสมอจากเธอมากกว่านี้ ถ้าสะดวกช่วยตอบกลับหน่อยนะ"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string>("direct");
  const [breakdown, setBreakdown] = useState<{
    whatHappened: string;
    feeling: string;
    coreNeed: string;
    emotionalTrigger: string;
    request: string;
    rationale: string;
    alternatives: Array<{
      type: string;
      label: string;
      text: string;
      rationale: string;
    }>;
  }>({
    whatHappened: "อีกฝ่ายยังไม่ได้ตอบข้อความตามเวลาที่คาดหวัง",
    feeling: "น้อยใจ กังวล และรู้สึกไม่ได้รับความใส่ใจ",
    coreNeed: "ต้องการให้เขารับฟังและเห็นความสำคัญของความรู้สึกเรา",
    emotionalTrigger: "การใช้คำว่า 'ไม่เคยเห็นใจ' ทำให้อีกฝ่ายรู้สึกถูกกล่าวหาและตั้งการ์ด",
    request: "อยากขอให้ช่วยตอบกลับเพื่อความชัดเจน",
    rationale: "การบอกความต้องการตรงๆ ช่วยลดกำแพงและทำให้อีกฝ่ายเปิดใจรับฟัง",
    alternatives: [
      {
        type: "direct",
        label: "พูดตรงขึ้น",
        text: "เราต้องการความชัดเจนเรื่องนี้ ถ้าสะดวกช่วยตอบกลับหน่อยนะ",
        rationale: "ชัดเจน กระชับ ไม่ประชด",
      },
      {
        type: "gentle",
        label: "อ่อนลง",
        text: "ถ้าเธอติดธุระอยู่ไม่เป็นไรนะ สะดวกเมื่อไหร่ค่อยทักหาเราก็ได้",
        rationale: "ให้พื้นที่และคลายความกดดัน",
      },
      {
        type: "boundary",
        label: "ตั้งขอบเขต",
        text: "ถ้ายังไม่สะดวกคุยตอนนี้ ช่วยบอกเราสั้นๆ ได้ไหม เราจะได้ไม่ต้องนั่งรอ",
        rationale: "รักษาสิทธิและพื้นที่ของตนเองอย่างมั่นคง",
      },
      {
        type: "hold",
        label: "ยังไม่ส่งตอนนี้",
        text: "วางโทรศัพท์ลงก่อน 20 นาที หายใจลึกๆ แล้วค่อยกลับมาดูใหม่",
        rationale: "หยุดอารมณ์ชั่ววูบก่อนเผลอทำลายความสัมพันธ์",
      },
    ],
  });

  const handleRefineAI = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/filter-communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawMessage: text.trim() }),
      });
      const data = await res.json();
      if (data.refinedAlternative) {
        setRefined(data.refinedAlternative);
        setBreakdown({
          whatHappened: data.whatHappened || "สถานการณ์ที่เกิดขึ้น",
          feeling: data.feeling || "ความรู้สึกข้างใน",
          coreNeed: data.coreNeed || "ต้องการการรับฟังอย่างปลอดภัย",
          emotionalTrigger: data.emotionalTrigger || "น้ำเสียงตัดพ้อ",
          request: data.request || "คำร้องขอที่ชัดเจน",
          rationale: data.rationale || "สื่อสารด้วยข้อเท็จจริงและความรู้สึก",
          alternatives: data.alternatives || breakdown.alternatives,
        });
      }
    } catch (err) {
      console.error("Filter communication error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen detailScreen scrollArea">
      <AppHeader
        title="ก่อนพูด"
        showBack
        onBack={() => setScreen("home")}
        onEmergency={() => setScreen("pause")}
        onOpenMenu={onOpenMenu}
      />

      <div className="detailIntro">
        <p>หยุดก่อนพูด เพื่อให้ชัดและได้ยิน</p>
        <p>โดยไม่เผลอใช้ถ้อยคำทำร้าย 🌱</p>
      </div>

      <div className="paperCard">
        <h3>ข้อความที่คุณอยากสื่อ</h3>
        <label>ข้อความจากใจของคุณ (พิมพ์ข้อความดิบที่อยากส่ง):</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
          <small>{text.length}/120</small>
          <button
            type="button"
            className="secondary"
            style={{ minHeight: "36px", padding: "4px 14px", fontSize: "12px", borderRadius: "999px" }}
            onClick={handleRefineAI}
            disabled={isLoading}
          >
            {isLoading ? "กำลังเกลาคำ..." : "✨ เกลาคำด้วย AI"}
          </button>
        </div>
      </div>

      <div className="downArrow">↓</div>

      {/* 4 Alternative Style Selector */}
      <div className="paperCard">
        <h3>🌱 เลือกสไตล์การสื่อสารที่ตรงใจคุณ</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
          {breakdown.alternatives.map((alt) => (
            <button
              key={alt.type}
              type="button"
              className={`chipOption ${selectedStyle === alt.type ? "chipSelected" : ""}`}
              onClick={() => {
                setSelectedStyle(alt.type);
                setRefined(alt.text);
              }}
            >
              {alt.label}
            </button>
          ))}
        </div>

        <textarea
          value={refined}
          onChange={(e) => setRefined(e.target.value)}
          className="refinedBox"
        />

        <div className="reasonChips">
          <span>💡 <b>ความต้องการจริง:</b> {breakdown.coreNeed}</span>
          <span>⚡ <b>จุดสะกิดเดิม:</b> {breakdown.emotionalTrigger}</span>
          <span>🌿 <b>เหตุผล:</b> {breakdown.rationale}</span>
        </div>
      </div>

      <div className="babyTip">
        <Baby small size={48} />
        <p>
          <b>นึกถึงเจตนาดีของการสื่อสาร</b>
          <br />
          พูดจากใจ ด้วยความเคารพ จะช่วยให้ความสัมพันธ์เติบโต
        </p>
      </div>

      <div className="actionPair">
        <button className="secondary" onClick={() => setScreen("chat")}>
          ไปคุยต่อในแชท
        </button>
        <button className="primary" onClick={onOpenBeforeSpeakExercise}>
          <SvgIcon name="send" stroke="#fff" size={18} /> เปิดแบบฝึกหัดเกลาคำ
        </button>
      </div>

      <div className="bottomSpacer" />
    </div>
  );
}

function Perspective({
  setScreen,
  onOpenPerspectiveExercise,
  onOpenMenu,
}: {
  setScreen: (s: Screen) => void;
  onOpenPerspectiveExercise: () => void;
  onOpenMenu: () => void;
}) {
  const [situationText, setSituationText] = useState("เขาอ่านข้อความแล้วไม่ตอบมา 3 ชั่วโมง");
  const [isLoading, setIsLoading] = useState(false);
  const [perspectiveData, setPerspectiveData] = useState<{
    knownFact: string;
    myInterpretation: string;
    otherPerspectives: Array<{ title: string; explanation: string }>;
    myChoices: string[];
    deungSatiAdvice: string;
  }>({
    knownFact: "เขาอ่านข้อความแล้วยังไม่ได้ตอบกลับมา",
    myInterpretation: "เขาคงไม่สนใจหรือไม่เห็นความสำคัญของเราแล้ว",
    otherPerspectives: [
      {
        title: "กำลังติดงานด่วน หรือมีธุระที่ไม่สะดวกพิมพ์",
        explanation: "ในชีวิตจริง แต่ละคนมีภาระและจังหวะเวลาที่แตกต่างกัน การยังไม่ตอบอาจไม่ได้เกี่ยวกับเราโดยตรง",
      },
      {
        title: "กำลังคิดหาคำตอบที่เหมาะสม",
        explanation: "บางครั้งอีกฝ่ายต้องการเวลาคิดทบทวนก่อนตอบ เพื่อไม่ให้ใช้อารมณ์",
      },
      {
        title: "พลังงานหมดชั่วคราว (Social Battery Low)",
        explanation: "อาจกำลังเหนื่อยล้าจนยังไม่มีพลังสื่อสารในขณะนี้",
      },
    ],
    myChoices: [
      "พักวางมือถือ 30 นาที แล้วไปทำกิจกรรมอื่นให้ใจสบาย",
      "รอให้อีกฝ่ายสะดวก แล้วค่อยทักถามอย่างสุภาพ",
      "สื่อสารความต้องการของตนเองอย่างตรงไปตรงมา",
    ],
    deungSatiAdvice: "เมื่อมองได้กว้าง ไม่ด่วนเดาใจใครเป็นความจริง ใจก็จะคุยกับตัวเองนุ่มนวลขึ้น 🌱",
  });

  const handleAnalyzeAI = async () => {
    if (!situationText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyze-empathy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipType: "คนสำคัญ / แฟน / เพื่อน",
          situation: situationText.trim(),
        }),
      });
      const data = await res.json();
      if (data.otherPerspectives && Array.isArray(data.otherPerspectives)) {
        setPerspectiveData({
          knownFact: data.knownFact || situationText.trim(),
          myInterpretation: data.myInterpretation || "สิ่งที่สมองแอบคิดกลัว",
          otherPerspectives: data.otherPerspectives,
          myChoices: data.myChoices || perspectiveData.myChoices,
          deungSatiAdvice: data.deungSatiAdvice || perspectiveData.deungSatiAdvice,
        });
      }
    } catch (err) {
      console.error("Analyze empathy error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen detailScreen perspectiveScreen scrollArea">
      <AppHeader
        title="มองอีกมุม"
        showBack
        onBack={() => setScreen("home")}
        onEmergency={() => setScreen("pause")}
        onOpenMenu={onOpenMenu}
      />

      <div className="perspectiveIntro">
        บางครั้ง... สิ่งที่เรารู้ อาจไม่ใช่ทั้งหมด
        <br />
        ลองเปิดใจเห็น เพื่อมองให้กว้างขึ้น
      </div>

      <div className="paperCard" style={{ marginBottom: "14px" }}>
        <label>สถานการณ์ที่กำลังกวนใจคุณ:</label>
        <textarea
          value={situationText}
          onChange={(e) => setSituationText(e.target.value)}
          placeholder="เช่น เขาอ่านแล้วไม่ตอบ, เขาพูดเสียงดังใส่..."
          style={{ minHeight: "70px" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
          <button
            type="button"
            className="secondary"
            style={{ minHeight: "36px", padding: "4px 14px", fontSize: "12px", borderRadius: "999px" }}
            onClick={handleAnalyzeAI}
            disabled={isLoading}
          >
            {isLoading ? "กำลังวิเคราะห์..." : "✨ มองอีกมุมด้วย AI"}
          </button>
        </div>
      </div>

      {/* 4 Quadrants Layout */}
      <div className="perspectiveColumns">
        <div className="perspectiveCard">
          <h3>🌱 1. สิ่งที่เรารู้ (Fact)</h3>
          <p style={{ fontSize: "12.5px", color: "#4B342C", margin: "0 0 6px" }}>{perspectiveData.knownFact}</p>
          <small style={{ color: "#8E7866" }}>*พฤติกรรมจริงภายนอกที่เกิดขึ้น</small>
        </div>

        <div className="perspectiveCard">
          <h3>💭 2. สิ่งที่ใจเราแอบตีความ</h3>
          <p style={{ fontSize: "12.5px", color: "#8C4328", margin: "0 0 6px" }}>{perspectiveData.myInterpretation}</p>
          <small style={{ color: "#8E7866" }}>*สิ่งที่สมองปรุงแต่ง/กังวลไปเอง</small>
        </div>
      </div>

      <div style={{ marginTop: "10px" }} className="paperCard">
        <h3 style={{ color: "#4A6337" }}>🌿 3. ความเป็นไปได้อื่นที่ไม่เกี่ยวกับเรา</h3>
        <ul style={{ paddingLeft: "18px", margin: "6px 0", fontSize: "12.5px", lineHeight: "1.6" }}>
          {perspectiveData.otherPerspectives.map((p, idx) => (
            <li key={idx}>
              <b>{p.title}:</b> {p.explanation}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "10px" }} className="paperCard">
        <h3 style={{ color: "#2E5C70" }}>✨ 4. สิ่งที่ฉันต้องการและเลือกได้</h3>
        <ul style={{ paddingLeft: "18px", margin: "6px 0", fontSize: "12.5px", lineHeight: "1.6" }}>
          {perspectiveData.myChoices.map((c, idx) => (
            <li key={idx}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="perspectiveBaby">
        <Baby size={100} />
      </div>

      <div className="perspectiveQuote">
        {perspectiveData.deungSatiAdvice}
      </div>

      <button className="afterPauseButton" onClick={onOpenPerspectiveExercise}>
        ⚡ เปิดแบบฝึกหัดมองอีกมุม (4 มิติ)
      </button>

      <div className="bottomSpacer" />
    </div>
  );
}

function Journey({
  setScreen,
  onOpenMenu,
}: {
  setScreen: (s: Screen) => void;
  onOpenMenu: () => void;
}) {
  const [evidenceCount, setEvidenceCount] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("deung_sati_evidence_v1") || "[]");
      setEvidenceCount(saved.length);
    } catch {
      setEvidenceCount(2);
    }
  }, []);

  return (
    <div className="screen scrollArea">
      <AppHeader
        title="เส้นทางการเติบโต"
        onEmergency={() => setScreen("pause")}
        onOpenMenu={onOpenMenu}
      />

      <div className="journeyHero">
        <div className="journeyIntro">
          <span>คุณกำลังเดินทางพัฒนาตัวเอง</span>
          <span>ด้วยความอ่อนโยนและสติ 🌱</span>
        </div>

        <div className="journeyCircle">
          <strong>{Math.min(99, 45 + evidenceCount * 7)}%</strong>
          <span>ระดับการรู้ทัน</span>
        </div>

        <div className="journeyBabySpot">
          <Baby size={92} />
        </div>
      </div>

      <h3 className="sectionCategoryTitle">บันทึกการรู้ทันของคุณ</h3>
      <div className="journeyStats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "14px 20px" }}>
        <div className="paperCard" style={{ textAlign: "center" }}>
          <b style={{ fontSize: "18px", color: "#3F5944" }}>{evidenceCount + 2} ครั้ง</b>
          <small style={{ display: "block", color: "#8E7866", marginTop: "4px" }}>รู้ทันอารมณ์ตนเอง</small>
        </div>
        <div className="paperCard" style={{ textAlign: "center" }}>
          <b style={{ fontSize: "18px", color: "#657E53" }}>12 เครื่องมือ</b>
          <small style={{ display: "block", color: "#8E7866", marginTop: "4px" }}>พร้อมช่วยดึงสติ</small>
        </div>
      </div>

      <div className="journeyMessage">
        🌱
        <p>
          คุณไม่ได้สมบูรณ์แบบ
          <br />
          <b>แต่คุณกำลังเติบโตขึ้นในแบบของคุณ</b>
        </p>
        🌿
      </div>

      <div className="bottomSpacer" />
    </div>
  );
}

function Profile({
  setScreen,
  onOpenMenu,
}: {
  setScreen: (s: Screen) => void;
  onOpenMenu: () => void;
}) {
  const [selectedTraits, setSelectedTraits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("deung_sati_future_self_traits_v1");
      return saved ? JSON.parse(saved) : [
        "พูดตรงโดยไม่ทำร้าย",
        "รักษาขอบเขตตัวเอง",
        "ใจเย็นแต่ไม่กดความรู้สึก",
      ];
    } catch {
      return [
        "พูดตรงโดยไม่ทำร้าย",
        "รักษาขอบเขตตัวเอง",
        "ใจเย็นแต่ไม่กดความรู้สึก",
      ];
    }
  });

  const allTraits = [
    "พูดตรงโดยไม่ทำร้าย",
    "รักษาขอบเขตตัวเอง",
    "ใจเย็นแต่ไม่กดความรู้สึก",
    "ให้เกียรติตัวเองและผู้อื่น",
    "กล้าขอเวลาพักเมื่อใจยังไม่พร้อม",
    "ให้อภัยตัวเองเมื่อเผลอพลาด",
  ];

  const toggleTrait = (t: string) => {
    const next = selectedTraits.includes(t)
      ? selectedTraits.filter((item) => item !== t)
      : [...selectedTraits, t];
    setSelectedTraits(next);
    localStorage.setItem("deung_sati_future_self_traits_v1", JSON.stringify(next));
  };

  return (
    <div className="screen scrollArea">
      <AppHeader
        title="ฉัน"
        onEmergency={() => setScreen("pause")}
        onOpenMenu={onOpenMenu}
      />

      <div className="profileCard">
        <Baby size={105} />
        <h2>คนที่ฉันอยากเป็น (Future Self)</h2>
        <p>
          ไม่ต้องเป็นคนสมบูรณ์แบบ
          <br />
          แค่ค่อยๆ เป็นคนที่ตัวเองเลือกในทุก Choice Point
        </p>
      </div>

      <div style={{ padding: "0 20px" }}>
        <p style={{ fontSize: "13px", color: "#685141", marginBottom: "10px" }}>
          แตะเพื่อเลือกคุณค่าที่อยากนำทางใจ:
        </p>
        {allTraits.map((trait, i) => {
          const isSelected = selectedTraits.includes(trait);
          return (
            <div
              className="traitCard"
              key={trait}
              onClick={() => toggleTrait(trait)}
              style={{
                cursor: "pointer",
                background: isSelected ? "#F3EFE6" : "#FFFDF8",
                borderColor: isSelected ? "#657E53" : "#E8DDCF",
              }}
            >
              <span style={{ background: isSelected ? "#657E53" : "#DDE7D8", color: isSelected ? "white" : "#3F5944" }}>
                {i + 1}
              </span>
              <b>{trait}</b>
              <span style={{ fontSize: "16px", color: isSelected ? "#3F5944" : "#8A7664" }}>
                {isSelected ? "✓" : "+"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bottomSpacer" />
    </div>
  );
}

function EvidenceModal({
  evidence,
  add,
  close,
}: {
  evidence: EvidenceType[];
  add: (item: EvidenceType) => void;
  close: () => void;
}) {
  const options: EvidenceType[] = [
    "รู้ตัวหลังเกิด",
    "รู้ตัวระหว่างเกิด",
    "รู้ก่อนทำ",
    "หยุดก่อน",
    "เลือกใหม่",
    "กลับมาซ่อม",
  ];

  const handleSelectEvidence = (item: EvidenceType) => {
    add(item);
    try {
      const existing = JSON.parse(localStorage.getItem("deung_sati_evidence_v1") || "[]");
      const updated = [
        ...existing,
        { item, timestamp: new Date().toISOString() },
      ];
      localStorage.setItem("deung_sati_evidence_v1", JSON.stringify(updated));
    } catch {}
    close();
  };

  return (
    <div className="modalBackdrop" onClick={close}>
      <div className="evidenceModal" onClick={(e) => e.stopPropagation()}>
        <button className="modalClose" onClick={close}>
          ×
        </button>

        <div className="modalBaby">
          <Baby small size={56} />
        </div>

        <h2>เมื่อกี้ฉันรู้ทัน 🌱</h2>
        <p>สิ่งไหนใกล้กับสิ่งที่เกิดขึ้นที่สุด?</p>

        <div className="evidenceOptions">
          {options.map((item) => (
            <button
              key={item}
              className={evidence.includes(item) ? "alreadyEvidence" : ""}
              onClick={() => handleSelectEvidence(item)}
            >
              <SvgIcon name="check" size={18} stroke="#3F5944" />
              {item}
            </button>
          ))}
        </div>

        <small>
          พลาดแล้วรู้ตัวก็นับเป็นการเติบโตนะ
          <br />
          เราไม่ได้เก็บคะแนนจากการ “ไม่เคยพลาด”
        </small>
      </div>
    </div>
  );
}

const styles = `
/* ========================================================================== */
/* Deung Sati Design System Tokens & Global Base                              */
/* ========================================================================== */
:root {
  --bg-cream: #FAF5ED;
  --bg-card: rgba(255, 253, 249, 0.88);
  --sage-primary: #657E53;
  --sage-dark: #3F5944;
  --sage-light: #DDE7D8;
  --cocoa-dark: #3E2D23;
  --cocoa-mid: #685141;
  --cocoa-light: #9C8775;
  --emergency-coral: #D9532B;
  --gold-accent: #E4B869;
  
  font-family: Inter, "Noto Sans Thai", "Tahoma", system-ui, -apple-system, sans-serif;
  color: var(--cocoa-dark);
  background: #EDE8DE;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at 10% 10%, #FAF6EE 0%, transparent 40%),
    radial-gradient(circle at 90% 25%, #E5ECE0 0%, transparent 35%),
    #ECE6DC;
}

button, input, textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.appShell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
}

.phone {
  width: min(430px, 100vw);
  height: min(920px, calc(100vh - 30px));
  height: min(920px, calc(100dvh - 30px));
  border-radius: 44px;
  overflow: hidden;
  position: relative;
  background: var(--bg-cream);
  box-shadow:
    0 40px 95px rgba(58, 44, 32, 0.22),
    0 10px 24px rgba(58, 44, 32, 0.12);
  border: 10px solid #181818;
}

.screen {
  position: absolute;
  inset: 0;
  background: var(--bg-cream);
  display: flex;
  flex-direction: column;
}

.scrollArea {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 160px;
  box-sizing: border-box;
}

.scrollArea::-webkit-scrollbar {
  display: none;
}

/* ========================================================================== */
/* Top Header (Conventional Mobile Header with 🚨 ☰)                          */
/* ========================================================================== */
.appHeader {
  height: 68px;
  padding: 12px 18px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 40;
}

.headerLeft {
  min-width: 84px;
  display: flex;
  align-items: center;
}

.headerBrand {
  color: var(--sage-dark);
  font-weight: 800;
  font-family: Georgia, "Noto Serif Thai", serif;
  font-size: 14px;
  letter-spacing: -0.2px;
}

.headerBackBtn {
  border: 0;
  background: transparent;
  color: #796552;
  font-size: 24px;
  line-height: 1;
  padding: 4px 8px 4px 0;
  display: flex;
  align-items: center;
}

.headerTitle {
  margin: 0;
  color: var(--sage-dark);
  font-size: 18.5px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  font-family: Georgia, "Noto Serif Thai", serif;
}

.headerRightActions {
  min-width: 84px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.sirenHeaderIconBtn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #DE5A35, #BA3B1C);
  color: white;
  border: 0;
  border-radius: 999px;
  padding: 5px 9px 5px 7px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 3px 9px rgba(186, 59, 28, 0.28);
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease;
}

.sirenHeaderIconBtn:active {
  transform: scale(0.95);
}

.sirenBtnText {
  letter-spacing: 0.2px;
}

.hamburgerIconBtn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #E5D9CB;
  background: rgba(255, 255, 255, 0.85);
  display: grid;
  place-items: center;
  color: var(--cocoa-dark);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: background 0.15s ease, transform 0.15s ease;
}

.hamburgerIconBtn:active {
  transform: scale(0.93);
  background: white;
}

.miniSirenBeacon {
  position: relative;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
}

.miniRotatingSweep {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 255, 220, 0.95) 0deg,
    rgba(255, 160, 50, 0.6) 40deg,
    transparent 90deg,
    transparent 270deg,
    rgba(255, 220, 100, 0.4) 320deg,
    rgba(255, 255, 220, 0.95) 360deg
  );
  animation: miniSpin 1.4s linear infinite;
  filter: blur(1px);
}

@keyframes miniSpin {
  100% { transform: rotate(360deg); }
}

/* ========================================================================== */
/* 1. Quick Chat Card (First Main Action on Home)                            */
/* ========================================================================== */
.homeQuickChatCard {
  margin: 4px 18px 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #EAE1D3;
  border-radius: 26px;
  padding: 14px 16px;
  box-shadow: 0 8px 24px rgba(70, 52, 38, 0.05);
  position: relative;
  z-index: 10;
}

.quickChatHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quickChatTitleRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quickChatIcon {
  font-size: 24px;
}

.quickChatHeading {
  margin: 0;
  font-size: 16.5px;
  color: var(--sage-dark);
  font-weight: 700;
}

.quickChatSubheading {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--cocoa-light);
}

.quickChatComposer {
  display: flex;
  align-items: center;
  background: #FFFDF9;
  border: 1.5px solid #E2D7C8;
  border-radius: 999px;
  padding: 4px 6px 4px 16px;
  margin-top: 11px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
  gap: 8px;
}

.quickChatInput {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  color: var(--cocoa-dark);
}

.quickChatSendBtn {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(135deg, var(--sage-primary), var(--sage-dark));
  display: grid;
  place-items: center;
  box-shadow: 0 3px 8px rgba(63, 89, 68, 0.28);
}

/* ========================================================================== */
/* 2. Nibbana Baby World (Nature Sanctuary)                                   */
/* ========================================================================== */
.nibbanaWorldCard {
  margin: 0 18px 14px;
  height: 195px;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
  border: 1px solid #E8DEC8;
  box-shadow: 0 10px 28px rgba(70, 52, 38, 0.07);
  background: #FBF6E9;
}

.worldBannerFrame {
  position: absolute;
  inset: 0;
}

.worldBannerImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 84% center;
  display: block;
}

.worldGlassOverlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 249, 240, 0.05) 0%,
    transparent 55%,
    rgba(221, 231, 216, 0.35) 100%
  );
  pointer-events: none;
}

.worldTextOverlay {
  position: absolute;
  left: 20px;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 5;
  pointer-events: none;
}

.worldTagline {
  font-size: 14px;
  font-weight: 700;
  color: var(--sage-dark);
}

.worldTitle {
  margin: 0;
  font-size: 18px;
  font-family: Georgia, "Noto Serif Thai", serif;
  color: var(--cocoa-dark);
}

.worldSubtitle {
  font-size: 14.5px;
  color: var(--cocoa-mid);
}

.worldAtmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.worldSunHalo {
  position: absolute;
  right: 25px;
  top: 15px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 160, 0.35), transparent 70%);
}

.worldSparkleCluster {
  position: absolute;
  right: 50px;
  top: 30px;
  font-size: 14px;
  color: #FFE69D;
}

.star1 { position: absolute; top: -10px; left: -20px; animation: starTwinkle 2s infinite alternate; }
.star2 { position: absolute; top: 15px; left: 30px; animation: starTwinkle 2.6s infinite alternate; }
.star3 { position: absolute; top: 40px; left: -10px; animation: starTwinkle 3.2s infinite alternate; }

@keyframes starTwinkle {
  0% { opacity: 0.3; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* ========================================================================== */
/* 4. Soothing Emergency / Mindful Pause Card (Gentle Sanctuary Style)        */
/* ========================================================================== */
.pauseSectionWrap {
  margin: 14px 18px 0;
}

.peacefulPauseCard {
  width: 100%;
  border-radius: 24px;
  border: 1px solid #ECD8C8;
  background: linear-gradient(135deg, #FAF2EB 0%, #F5E5D5 100%);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  text-align: left;
  box-shadow: 0 6px 20px rgba(110, 70, 45, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
  cursor: pointer;
}

.peacefulPauseCard:active {
  transform: scale(0.97);
}

.pauseBowlIconWrap {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #FCEBDC;
  border: 1px solid #F2D5BD;
  display: grid;
  place-items: center;
  position: relative;
}

.pauseBowlEmoji {
  font-size: 22px;
}

.pauseSoundRipple {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid rgba(224, 110, 70, 0.3);
  animation: soundRipple 2.5s infinite;
}

@keyframes soundRipple {
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.3); opacity: 0; }
}

.pauseCardDetails {
  flex: 1;
}

.pauseBadgeRow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(224, 90, 52, 0.12);
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 3px;
}

.pauseStatusDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #D9532B;
}

.pauseBadgeText {
  font-size: 10.5px;
  font-weight: 700;
  color: #B34420;
}

.pauseMainHeadline {
  display: block;
  font-size: 15px;
  color: #4A3326;
  font-weight: 700;
  line-height: 1.2;
}

.pauseSubHeadline {
  display: block;
  font-size: 11px;
  color: #8C6F5C;
  margin-top: 2px;
  line-height: 1.35;
}

.pauseActionArrow {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

/* ========================================================================== */
/* 4. Quick Tools Grid                                                        */
/* ========================================================================== */
.sectionCategoryTitle {
  margin: 8px 24px 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--cocoa-dark);
}

.toolGrid {
  margin: 0 18px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quickToolCard {
  min-height: 130px;
  border: 1px solid #EBE2D4;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--cocoa-dark);
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 12px 8px;
  box-shadow: 0 6px 18px rgba(70, 52, 38, 0.04);
  transition: transform 0.15s ease;
}

.quickToolCard:active {
  transform: scale(0.96);
}

.toolIconCircle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #E5EEDF;
  font-size: 22px;
  margin-bottom: 6px;
}

.toolTitle {
  color: var(--sage-dark);
  font-size: 15px;
  margin-top: 2px;
}

.toolSubtitle {
  font-size: 10.5px;
  margin-top: 3px;
  color: var(--cocoa-light);
  text-align: center;
  line-height: 1.3;
}

/* ========================================================================== */
/* 5. Future Self & Growth Cards                                              */
/* ========================================================================== */
.futureSelfWellnessCard {
  width: calc(100% - 36px);
  margin: 14px 18px 0;
  border-radius: 26px;
  border: 1px solid #ECE1D4;
  background: rgba(255, 255, 255, 0.85);
  min-height: 84px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  text-align: left;
  box-shadow: 0 8px 22px rgba(70, 52, 38, 0.05);
}

.futureSelfIcon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #DEE8D6;
}

.futureSelfLabel {
  display: block;
  font-size: 11px;
  color: var(--cocoa-light);
}

.futureSelfTrait {
  display: block;
  font-size: 16.5px;
  color: var(--sage-dark);
  margin: 2px 0;
}

.futureSelfEvidence {
  display: block;
  font-size: 11px;
  color: var(--cocoa-mid);
}

.growthReflectionCard {
  margin: 12px 18px 0;
  border-radius: 26px;
  border: 1px solid #ECE1D4;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  box-shadow: 0 8px 22px rgba(70, 52, 38, 0.05);
}

.growthBabyAvatar {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(70, 52, 38, 0.12);
}

.growthBabyImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.growthContent {
  flex: 1;
}

.growthHeaderLabel {
  display: block;
  font-size: 11px;
  color: var(--cocoa-light);
}

.growthFocusTopic {
  display: block;
  font-size: 14.5px;
  color: var(--sage-dark);
  margin-top: 1px;
}

.growthProgressBar {
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  background: #E8E5D7;
  overflow: hidden;
}

.growthProgressFill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #A2B685, var(--sage-primary));
}

.growthPercentage {
  font-size: 26px;
  color: #7B9557;
  font-weight: 700;
}

.bottomSpacer {
  height: 140px;
  width: 100%;
  flex-shrink: 0;
  display: block;
}

/* Official Nibbana Baby Mascot Styles */
.officialBabyContainer {
  position: relative;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.babyAuraPulse {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 170, 0.45), transparent 70%);
  animation: babyAuraPulse 3s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes babyAuraPulse {
  0% { transform: scale(0.95); opacity: 0.5; }
  100% { transform: scale(1.1); opacity: 0.9; }
}

.officialBabyImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 4px 14px rgba(79, 94, 66, 0.18);
  position: relative;
  z-index: 2;
  display: block;
}

.officialBabyDark .officialBabyImg {
  box-shadow: 0 0 22px rgba(255, 225, 130, 0.55);
}

/* ========================================================================== */
/* Bottom Navigation                                                          */
/* ========================================================================== */
.bottomNav {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 84px;
  background: rgba(255, 252, 247, 0.96);
  border-top: 1px solid #EBE2D5;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  z-index: 60;
  backdrop-filter: blur(20px);
}

.navItem {
  border: 0;
  background: transparent;
  color: #8A7868;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-direction: column;
  font-size: 11.5px;
  transition: color 0.15s ease;
}

.navIconWrap {
  display: grid;
  place-items: center;
}

.navActive {
  color: var(--sage-dark);
  font-weight: 600;
  background: linear-gradient(to top, rgba(221, 231, 216, 0.75), transparent);
}

/* ========================================================================== */
/* Chat Screen                                                                */
/* ========================================================================== */
.chatScreen {
  overflow: hidden;
}

.chatSubHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px 10px;
  background: linear-gradient(to right, #FBF6EB, #E5EEDB);
  border-bottom: 1px solid #EAE0D1;
}

.chatSubHeaderCopy b {
  display: block;
  font-size: 14.5px;
  color: var(--sage-dark);
}

.chatSubHeaderCopy span {
  display: block;
  font-size: 11.5px;
  color: var(--cocoa-light);
}

.chatBody {
  height: calc(100% - 68px - 62px - 84px - 62px);
  overflow-y: auto;
  padding: 12px 20px 20px;
}

.dateLabel {
  text-align: center;
  color: var(--cocoa-light);
  margin: 4px 0 16px;
  font-size: 12.5px;
}

.messageTurnWrapper {
  margin-bottom: 14px;
}

.userBubble {
  max-width: 78%;
  margin-left: auto;
  background: #DEE7D4;
  padding: 13px 16px;
  border-radius: 20px 20px 6px 20px;
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--cocoa-dark);
  box-shadow: 0 2px 8px rgba(70, 52, 38, 0.04);
}

.userBubble small,
.aiBubble small {
  display: block;
  opacity: 0.55;
  margin-top: 5px;
  font-size: 10.5px;
}

.aiRow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 14px;
}

.aiAvatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 3px 8px rgba(70, 52, 38, 0.15);
}

.aiAvatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aiBubble {
  max-width: 82%;
  background: #FFFFFF;
  border: 1px solid #EBE2D4;
  padding: 14px;
  border-radius: 6px 22px 22px 22px;
  line-height: 1.5;
  font-size: 14.5px;
  color: var(--cocoa-dark);
  box-shadow: 0 3px 12px rgba(70, 52, 38, 0.04);
}

.aiTextContent p {
  margin: 0 0 8px;
}

.aiTextContent p:last-child {
  margin-bottom: 0;
}

.streamingDots {
  opacity: 0.6;
  font-style: italic;
}

.exerciseConsentCard {
  margin-top: 10px;
  background: linear-gradient(135deg, #F6FAF2, #EAF1E4);
  border: 1px solid #C8DABF;
  border-radius: 16px;
  padding: 12px 14px;
}

.exerciseConsentHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--sage-dark);
  font-size: 13.5px;
  margin-bottom: 4px;
}

.exerciseConsentCard p {
  font-size: 12px;
  color: #526B3E;
  margin: 0 0 10px;
  line-height: 1.4;
}

.launchExerciseBtn {
  background: linear-gradient(135deg, var(--sage-primary), var(--sage-dark));
  color: white;
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: 0 3px 8px rgba(63, 89, 68, 0.25);
  cursor: pointer;
}

.consentQuestion {
  font-weight: 600;
  color: var(--sage-dark) !important;
  margin: 6px 0 8px !important;
}

.consentBtnGroup {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.consentDeclineBtn {
  background: white;
  border: 1px solid #C8DABF;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11.5px;
  color: #526B3E;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.errorRetryWrap {
  margin-top: 8px;
}

.retryMessageBtn {
  background: #FFF1F0;
  border: 1px solid #FFCCC7;
  color: #D9363E;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.quickReplies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
}

.quickReplies button {
  border: 1px solid #E8DDCF;
  border-radius: 999px;
  background: white;
  padding: 7px 13px;
  color: var(--cocoa-dark);
  font-size: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
}

.agencyRow {
  border: 1px solid #EAE0D3;
  background: rgba(255,255,255,0.72);
  padding: 10px 4px;
  border-radius: 20px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin-top: 8px;
}

.agencyRow button {
  border: 0;
  background: transparent;
  color: var(--sage-dark);
}

.agencyRow span {
  width: 36px;
  height: 36px;
  border: 1px solid #E5DCCE;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: auto;
  font-size: 15px;
  background: #FFFDF9;
}

.agencyRow small {
  display: block;
  margin-top: 4px;
  font-size: 10px;
}

.composer {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 92px;
  height: 56px;
  background: rgba(255,255,255,0.98);
  border: 1px solid #E5DACC;
  border-radius: 999px;
  display: flex;
  align-items: center;
  padding: 5px 6px;
  gap: 8px;
  z-index: 70;
  box-shadow: 0 6px 20px rgba(64, 56, 44, 0.09);
}

.composer input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--cocoa-dark);
  font-size: 14px;
}

.plusButton,
.sendButton {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.plusButton {
  background: transparent;
  border: 1px solid #E4D7C8;
}

.sendButton {
  border: 0;
  background: linear-gradient(135deg, var(--sage-primary), var(--sage-dark));
}

/* ========================================================================== */
/* Detail Screens (Before Speak, Perspective, Journey, Profile)               */
/* ========================================================================== */
.detailScreen {
  padding: 0 20px 140px;
  box-sizing: border-box;
}

.detailIntro {
  text-align: center;
  margin: 6px 0 18px;
  line-height: 1.6;
  font-size: 14.5px;
  color: var(--cocoa-mid);
}

.detailIntro p {
  margin: 0;
}

.paperCard {
  border: 1px solid #E8DDCF;
  border-radius: 24px;
  padding: 16px;
  background: rgba(255,255,255,0.85);
  box-shadow: 0 8px 20px rgba(70,60,50,0.04);
}

.paperCard h3 {
  color: var(--sage-dark);
  margin: 0 0 12px;
  font-size: 15px;
}

.paperCard label {
  display: block;
  margin-bottom: 6px;
  font-size: 12.5px;
  color: var(--cocoa-light);
}

.paperCard textarea {
  width: 100%;
  min-height: 110px;
  border: 1px solid #E0D4C5;
  border-radius: 16px;
  resize: vertical;
  padding: 12px;
  outline: 0;
  background: #FFFDF8;
  font-size: 15px;
  line-height: 1.5;
  color: var(--cocoa-dark);
}

.paperCard > small {
  display: block;
  text-align: right;
  color: var(--cocoa-light);
  margin-top: -22px;
  padding-right: 12px;
  position: relative;
}

.downArrow {
  text-align: center;
  font-size: 32px;
  color: #9D896D;
  margin: 2px 0;
}

.refinedBox {
  min-height: 140px !important;
}

.muted {
  color: var(--cocoa-light);
  font-size: 12.5px;
  margin: -6px 0 10px;
}

.reasonChips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.reasonChips span {
  border: 1px solid #E5DACA;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  background: #FFFDF9;
}

.babyTip {
  margin-top: 14px;
  background: rgba(221,231,216,0.4);
  border: 1px solid #E5DCCE;
  border-radius: 20px;
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.babyTip p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.actionPair {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 10px;
  margin-top: 16px;
}

.actionPair button {
  border-radius: 999px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13.5px;
}

.secondary {
  border: 1px solid #E4D9CC;
  background: white;
  color: var(--cocoa-dark);
}

.primary {
  border: 0;
  color: white;
  background: linear-gradient(135deg, var(--sage-primary), var(--sage-dark));
  box-shadow: 0 4px 12px rgba(63, 89, 68, 0.25);
}

.perspectiveIntro {
  text-align: center;
  font-size: 16.5px;
  line-height: 1.6;
  margin: 10px auto 16px;
  color: var(--cocoa-mid);
}

.perspectiveColumns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.perspectiveCard {
  background: rgba(255,255,255,0.85);
  border: 1px solid #E7DCCE;
  border-radius: 22px;
  padding: 14px;
  min-height: 260px;
}

.perspectiveCard h3 {
  color: var(--sage-dark);
  font-size: 15px;
  margin-top: 0;
}

.perspectiveCard ul {
  padding-left: 16px;
  line-height: 1.8;
  font-size: 13px;
}

.perspectiveBaby {
  display: grid;
  place-items: center;
  margin: 16px auto 4px;
}

.perspectiveQuote {
  text-align: center;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 14px;
}

.perspectiveQuote b {
  color: var(--sage-dark);
}

.journeyHero {
  position: relative;
  height: 240px;
  margin: 0 18px;
  background: linear-gradient(to bottom, #FBF6E9, #E4E9D5);
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid #EAE0D1;
}

.journeyIntro {
  position: absolute;
  left: 20px;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 14px;
}

.journeyCircle {
  position: absolute;
  left: 24px;
  bottom: 24px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  border: 9px solid #CAD6B2;
  border-top-color: var(--sage-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.6);
}

.journeyCircle strong {
  font-size: 34px;
  color: var(--sage-dark);
}

.journeyCircle span {
  font-size: 10px;
}

.journeyBabySpot {
  position: absolute;
  right: 20px;
  bottom: 14px;
}

.stageRow {
  margin: 10px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.stage span {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #F6F2E8;
  display: grid;
  place-items: center;
  border: 1px solid #E5DDCF;
  font-size: 18px;
}

.stage small {
  margin-top: 5px;
  font-size: 11px;
}

.stageActive span {
  background: #E7B85F;
}

.stageLine {
  color: #9F9A74;
  margin: 0 1px 16px;
}

.evidencePanel {
  margin: 0 18px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid #E8DECF;
  background: rgba(255,255,255,0.85);
}

.evidencePanel h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.statGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.statGrid div {
  display: grid;
  justify-items: center;
  text-align: center;
  padding: 4px;
}

.statGrid div + div {
  border-left: 1px solid #E5DCCE;
}

.statGrid span {
  font-size: 20px;
  color: #849868;
}

.statGrid b {
  font-size: 10.5px;
  margin: 4px 0;
}

.statGrid strong {
  font-size: 22px;
  color: var(--sage-dark);
}

.statGrid small {
  font-size: 9.5px;
}

.journeyMessage {
  margin: 14px 18px;
  border: 1px solid #E5DACA;
  border-radius: 20px;
  min-height: 80px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  background: rgba(255,255,255,0.8);
}

.journeyMessage p {
  line-height: 1.5;
  margin: 0;
  font-size: 13.5px;
}

.profileCard {
  text-align: center;
  padding: 16px;
}

.profileCard h2 {
  color: var(--sage-dark);
  margin-top: 8px;
}

.profileCard p {
  line-height: 1.5;
  color: var(--cocoa-mid);
}

.traitCard {
  min-height: 68px;
  margin: 8px 18px;
  border: 1px solid #E7DCCE;
  border-radius: 20px;
  background: white;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(70,52,38,0.03);
}

.traitCard > span {
  width: 34px;
  height: 34px;
  background: #DAE4CC;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--sage-dark);
  font-weight: bold;
}

/* ========================================================================== */
/* Peaceful Emergency Pause Screen                                            */
/* ========================================================================== */
.pauseScreen {
  position: absolute;
  inset: 0;
  z-index: 200;
  overflow-y: auto;
  padding: 24px 20px 40px;
  text-align: center;
  color: #F8F5EA;
  background:
    radial-gradient(circle at 50% 30%, rgba(245, 218, 150, 0.16), transparent 45%),
    radial-gradient(circle at 20% 80%, rgba(110, 140, 110, 0.15), transparent 40%),
    linear-gradient(170deg, #3A473D 0%, #202D26 60%, #17211C 100%);
}

.ambientGlow1 {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 170, 0.12), transparent 70%);
  pointer-events: none;
}

.ambientGlow2 {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(160, 190, 150, 0.1), transparent 70%);
  pointer-events: none;
}

.pauseTopBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 10;
}

.closePause {
  border: 1px solid rgba(255,255,255,.25);
  color: white;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,.08);
  font-size: 24px;
  display: grid;
  place-items: center;
}

.soundToggleBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.25);
  color: #FFF6DB;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11.5px;
  backdrop-filter: blur(8px);
}

.pauseHeaderArea {
  margin-top: 10px;
}

.pauseHeaderArea h2 {
  font-size: 22px;
  margin: 0;
  color: #FFF6DD;
}

.pauseSubtext {
  font-size: 12.5px;
  color: #D3DAC9;
  margin: 4px 0 14px;
  line-height: 1.4;
}

.breathRing {
  width: 200px;
  height: 200px;
  margin: 8px auto 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 3px solid rgba(255, 246, 196, 0.85);
  box-shadow:
    0 0 16px #FFE599,
    0 0 38px rgba(255, 230, 140, 0.35),
    inset 0 0 24px rgba(255, 240, 190, 0.15);
  position: relative;
  transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 4s ease;
}

.breathRing.phase-0,
.breathRing.phase-1 {
  transform: scale(1.12);
  box-shadow: 0 0 28px #FFE8A3, 0 0 65px rgba(255, 235, 150, 0.45);
}

.breathRing.phase-2,
.breathRing.phase-3 {
  transform: scale(0.88);
  box-shadow: 0 0 10px #B8D8BA, 0 0 25px rgba(184, 216, 186, 0.2);
}

.ringRinging {
  animation: bowlVibration 0.8s ease-in-out;
}

@keyframes bowlVibration {
  0%, 100% { filter: drop-shadow(0 0 10px #FFE082); }
  50% { filter: drop-shadow(0 0 30px #FFF9C4); }
}

.breathRingCore small,
.breathRingCore strong,
.breathRingCore span {
  display: block;
}

.breathRingCore small {
  font-size: 16px;
  color: #FFF2C6;
}

.breathRingCore strong {
  font-size: 52px;
  line-height: 1;
  margin: 2px 0;
  color: #FFFFFF;
}

.breathRingCore span {
  font-size: 13.5px;
  opacity: 0.85;
}

.phasePrompt {
  font-size: 14px;
  color: #FFF5D8;
  margin: 4px 0 14px;
  min-height: 20px;
}

.bowlArea {
  width: 200px;
  height: 105px;
  margin: 0 auto 4px;
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bowlBody {
  width: 165px;
  height: 74px;
  border-radius: 0 0 85px 85px;
  background: radial-gradient(circle at 50% 0%, #FFE082 0%, #D4A038 35%, #7B4B18 80%, #3D2208 100%);
  border-top: 9px solid #EDB84E;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
  position: relative;
  z-index: 2;
  transition: transform 0.2s ease;
}

.bowlRim {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 13px;
  border-radius: 50%;
  background: radial-gradient(ellipse, #FFF3C4 0%, #D8A23D 70%, #8A561D 100%);
}

.bowlShine {
  position: absolute;
  top: 8px;
  left: 18px;
  width: 26px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.4), transparent);
  transform: rotate(-15deg);
}

.bowlStick {
  width: 90px;
  height: 15px;
  border-radius: 999px;
  position: absolute;
  right: 10px;
  top: 16px;
  transform: rotate(48deg);
  background: linear-gradient(180deg, #A86B38, #5A3515);
  box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
  z-index: 4;
}

.bowlStriking .bowlStick {
  transform: rotate(28deg) translate(-6px, 12px);
}

.bowlRipple {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 75px;
  border-radius: 50%;
  border: 2px solid rgba(255, 235, 160, 0.7);
  opacity: 0;
  pointer-events: none;
}

.bowlStriking .bowlRipple {
  animation: bowlWave 1.8s ease-out;
}

@keyframes bowlWave {
  0% { transform: translateX(-50%) scale(0.8); opacity: 0.9; }
  100% { transform: translateX(-50%) scale(1.5); opacity: 0; }
}

.bowlTapHint {
  margin-top: 6px;
  font-size: 11.5px;
  color: #FFECA8;
  opacity: 0.9;
}

.pauseTime {
  font-size: 14px;
  color: #E2EAD8;
  margin: 10px 0 14px;
}

.pauseTime b {
  font-size: 18px;
  color: #FFF6DD;
}

.pauseButtons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pauseButtons button {
  border: 1px solid rgba(255,255,255,.24);
  color: white;
  background: rgba(255,255,255,.09);
  min-width: 95px;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  backdrop-filter: blur(6px);
}

.pauseButtons .strikeBtn {
  background: rgba(237, 184, 78, 0.25);
  border-color: rgba(237, 184, 78, 0.5);
  color: #FFF8E1;
}

.afterPauseButton {
  display: block;
  width: calc(100% - 20px);
  margin: 16px auto 0;
  background: linear-gradient(135deg, #7A9062, #556B42);
  color: white;
  border: 0;
  border-radius: 999px;
  padding: 13px 18px;
  font-size: 14.5px;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}

/* ========================================================================== */
/* Modals & Evidence Overlay                                                  */
/* ========================================================================== */
.modalBackdrop,
.exerciseModalBackdrop {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: rgba(37, 44, 38, 0.45);
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(4px);
}

.exerciseModalCard {
  width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 20px 20px 24px;
  background: #FFFDF9;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -8px 32px rgba(44, 38, 30, 0.18);
  border: 1px solid #EAE0D1;
  display: flex;
  flex-direction: column;
}

.exerciseModalHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.exerciseCategoryBadge {
  display: inline-block;
  background: #E8F0DF;
  color: #4A6337;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
}

.exerciseModalHeader h3 {
  margin: 2px 0 0;
  font-size: 18px;
  color: var(--cocoa-dark);
}

.exerciseSubtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--cocoa-light);
}

.exerciseModalClose {
  background: transparent;
  border: 0;
  font-size: 26px;
  color: var(--cocoa-light);
  cursor: pointer;
  padding: 0 4px;
}

.exerciseModalBody {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exerciseDesc {
  font-size: 13px;
  color: var(--cocoa-mid);
  line-height: 1.5;
  margin: 0;
}

.exerciseFormGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exerciseFormGroup label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--cocoa-dark);
}

.exerciseFormGroup input,
.exerciseFormGroup textarea {
  width: 100%;
  border: 1px solid #E5D9CB;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 13px;
  background: #FFFFFF;
  color: var(--cocoa-dark);
  font-family: inherit;
}

.exerciseFormGroup textarea {
  min-height: 64px;
  resize: vertical;
}

.refinedBox {
  background: #F4F8EE !important;
  border-color: #BED4AB !important;
  color: #385025 !important;
  font-weight: 500;
}

.downArrow {
  text-align: center;
  font-size: 18px;
  color: var(--sage-dark);
  margin: -2px 0;
}

.aiRefineMiniBtn {
  background: linear-gradient(135deg, #E6F0DC, #D4E5C4);
  border: 1px solid #BED4AB;
  color: #385025;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.chipSelectionGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chipOption {
  background: #FFFFFF;
  border: 1px solid #E5D9CB;
  color: var(--cocoa-dark);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chipSelected {
  background: #4B6B38 !important;
  border-color: #3F592F !important;
  color: #FFFFFF !important;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(75, 107, 56, 0.3);
}

.compassionBox {
  background: #FAF5EA;
  border: 1px solid #EBDCC6;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: #695133;
  line-height: 1.45;
}

.interactivePauseBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 8px;
}

.modalBreathRing {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 6px solid #D6E3CB;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 1s ease-in-out, border-color 0.5s ease;
}

.phase-0 { transform: scale(1.15); border-color: #6C8E53; }
.phase-1 { transform: scale(1.15); border-color: #A3BF8D; }
.phase-2 { transform: scale(0.9); border-color: #C8DABF; }
.phase-3 { transform: scale(0.9); border-color: #DDE8D5; }

.modalBreathCore {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modalBreathCore small {
  font-size: 12px;
  color: var(--sage-dark);
  font-weight: 600;
}

.modalBreathCore strong {
  font-size: 32px;
  color: var(--cocoa-dark);
  line-height: 1.1;
}

.modalBreathCore span {
  font-size: 10px;
  color: var(--cocoa-light);
}

.modalPhaseSub {
  font-size: 13px;
  color: var(--cocoa-mid);
  margin: 12px 0 10px;
  text-align: center;
}

.pauseControlsRow {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.bowlStrikeBtn {
  background: #FFF6E5;
  border: 1px solid #F0D5A3;
  color: #8C651E;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.fullscreenPauseBtn {
  background: #FFFFFF;
  border: 1px solid #D5E0CC;
  color: var(--sage-dark);
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.exerciseStepList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exerciseStepItem {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #FFFFFF;
  border: 1px solid #EAE0D3;
  border-radius: 12px;
  padding: 8px 12px;
}

.exerciseStepItem .stepNum {
  background: #E8F0DF;
  color: #4A6337;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.exerciseStepItem p {
  margin: 0;
  font-size: 12.5px;
  color: var(--cocoa-dark);
  line-height: 1.45;
}

.exerciseModalFooter {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  margin-top: 6px;
}

.exerciseCancelBtn {
  background: #FFFFFF;
  border: 1px solid #E5D9CB;
  color: var(--cocoa-mid);
  border-radius: 999px;
  padding: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.exerciseCompleteBtn {
  background: linear-gradient(135deg, var(--sage-primary), var(--sage-dark));
  border: 0;
  color: #FFFFFF;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(63, 89, 68, 0.25);
}

.evidenceModal {
  width: 100%;
  padding: 22px 20px 30px;
  background: var(--bg-cream);
  border-radius: 32px 32px 0 0;
  position: relative;
  text-align: center;
}

.modalClose {
  position: absolute;
  right: 18px;
  top: 16px;
  border: 0;
  background: transparent;
  font-size: 26px;
  color: #816E5A;
}

.modalBaby {
  width: 60px;
  margin: -24px auto -4px;
}

.evidenceModal h2 {
  color: var(--sage-dark);
  margin-bottom: 3px;
  font-size: 20px;
}

.evidenceModal p {
  color: var(--cocoa-light);
  font-size: 13px;
  margin-top: 2px;
}

.evidenceOptions {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}

.evidenceOptions button {
  min-height: 48px;
  border-radius: 16px;
  border: 1px solid #E5D9CB;
  background: white;
  color: var(--cocoa-dark);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  text-align: left;
  font-size: 14px;
}

.evidenceOptions .alreadyEvidence {
  background: #E2EAD6;
}

.evidenceModal > small {
  color: var(--cocoa-light);
  line-height: 1.4;
  font-size: 11.5px;
}

/* ========================================================================== */
/* Dev Debug HUD Panel                                                        */
/* ========================================================================== */
.devDebugPanel {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  background: rgba(24, 30, 26, 0.92);
  color: #E0E7DD;
  border: 1px solid #4D6144;
  border-radius: 16px;
  padding: 10px 14px;
  font-family: monospace;
  font-size: 11px;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
}

.devDebugHeader {
  font-weight: bold;
  color: #FFE082;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.15);
  padding-bottom: 3px;
}

.devDebugRow {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
}

.devDebugRow span {
  opacity: 0.75;
}

.debugTag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.tag-normal { background: #2E7D32; color: #FFF; }
.tag-concern { background: #E65100; color: #FFF; }
.tag-crisis { background: #C62828; color: #FFF; }
.tag-mode { background: #1565C0; color: #FFF; }

@media (max-width: 480px) {
  .appShell {
    padding: 0;
  }
  .phone {
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    border: 0;
  }
}
`;
