import React, { useEffect, useRef, useState } from "react";
import {
  type Screen,
  type EvidenceType,
  type ChatMessage,
  type ExerciseId,
  type ExerciseResultPayload,
  EXERCISE_REGISTRY,
  mapTurnToUserFacingStep,
  USER_FACING_CHAT_STEPS,
} from "./shared/chat-protocol";
import { InteractiveExerciseModal } from "./components/InteractiveExerciseModal";
import { GuidedExerciseCard } from "./components/GuidedExerciseCard";
import {
  AppHeader,
  AppDrawer,
  type DrawerMenuItemId,
} from "./components/Navigation";
import { DreamyHome } from "./components/DreamyHome";
import { playDeepTibetanSingingBowl } from "./utils/tibetanBowlAudio";
import { CompanionRoom } from "./components/CompanionRoom";
import { ConversationalOnboarding } from "./components/ConversationalOnboarding";
import { useCompanion } from "./context/CompanionContext";
import { LoopReviewCard } from "./components/LoopReviewCard";
import { FutureSelf } from "./components/FutureSelf";
import { useConversations } from "./hooks/useConversations";
import { traceFields, type Conversation } from "./shared/conversation";
import { TraceConversationActions } from "./components/TraceConversationActions";
import { AuthModal } from "./components/AuthModal";
import { loopChatReview, LOOP_CHAT_FIELDS, isChatWrapUpIntent } from "./shared/chat-protocol/loopChatGuide";

const SvgIcon = ({
  name,
  size = 24,
  stroke = "#3F5944",
}: {
  name:
    | "sparkle"
    | "egg"
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

  if (name === "sparkle")
    return (
      <svg {...common}>
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
      </svg>
    );

  if (name === "egg")
    return (
      <svg {...common}>
        <path d="M12 3C7.5 3 4 8.5 4 14.5C4 18.5 7.5 21 12 21C16.5 21 20 18.5 20 14.5C20 8.5 16.5 3 12 3Z" />
      </svg>
    );

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
}) => {
  const { companion, traceCount } = useCompanion();
  const eggLabel = companion?.stage === 0 ? `ไข่ (${Math.min(20, traceCount)}/20)` : (companion?.name || "สหาย");

  return (
    <div className="bottomNav">
      <NavItem
        active={screen === "home"}
        label="วันนี้"
        icon="sparkle"
        onClick={() => setScreen("home")}
      />
      <NavItem
        active={screen === "chat"}
        label="ดึงสติ"
        icon="chat"
        onClick={() => setScreen("chat")}
      />
      <NavItem
        active={screen === "companion"}
        label={eggLabel}
        icon="egg"
        onClick={() => setScreen("companion")}
      />
      <NavItem
        active={screen === "profile"}
        label="ฉัน"
        icon="user"
        onClick={() => setScreen("profile")}
      />
    </div>
  );
};

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
  <button className={`navItem ${active ? "navActive" : ""}`} onClick={onClick} aria-label={label}>
    <div className="navIconWrap">
      <SvgIcon name={icon} size={22} stroke={active ? "#7C3AED" : "#94A3B8"} />
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
