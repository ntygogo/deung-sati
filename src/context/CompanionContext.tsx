import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { validateLoopForConfirmation } from '../shared/chat-protocol';

export interface GrowthDnaData {
  primary_pink_shade: string;
  secondary_color: string;
  gill_type: string;
  cheek_feeler_type: string;
  head_light_type: string;
  head_light_tip: string;
  tail_type: string;
  body_pattern: string;
  movement_personality: string;
  safe_space_theme: string;
}

export interface CompanionData {
  id: string;
  user_id?: string;
  seed: number | string;
  name: string;
  stage: number; // 0 = Egg, 1 = Hatchling, 2 = Adolescent, 3 = Mature
  unlocked_max_stage: number;
  mood_state: string;
  last_interacted_at: string;
  dna?: GrowthDnaData;
  /** Immutable birth record returned by the hatch endpoint; used for stable DNA projection. */
  snapshot?: { dna_json?: unknown; skillsSummary?: unknown; seed?: number | string } | unknown;
  equippedItems?: Record<string, string>;
}

export interface LoopTraceItem {
  id: string;
  trace_category: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at?: string;
  trigger?: string;
  emotion_or_body?: string;
  automatic_story?: string;
  thoughts_or_fears?: string;
  facts?: string;
  desires?: string;
  old_response?: string;
  new_choice?: string;
  insights?: string;
  emotion_tags?: string[];
  growth_event?: any;
  xp_awarded?: boolean;
  is_confirmed?: boolean;
  source_session_id?: string;
  conversationId?: string;
  raw_data_json?: any;
}

export interface WalletData {
  xp: number;
  level: number;
  shells: number;
  memory_crystals: number;
}

interface CompanionContextType {
  companion: CompanionData | null;
  traceCount: number;
  traces: LoopTraceItem[];
  wallet: WalletData;
  isLoading: boolean;
  isHydrated: boolean;
  companionLoading: boolean;
  needsOnboarding: boolean;
  createCompanionFromOnboarding: (answers: {
    toneStyle: string;
    focusArea: string;
    safeSpace: string;
    companionName: string;
  }) => Promise<CompanionData>;
  recordTrace: (
    category: string,
    title: string,
    summary: string,
    rawData?: any
  ) => Promise<{ success: boolean; traceCount: number; newlyHatchable?: boolean }>;
  completeLoop: (data: {
    conversationId: string;
    idempotencyKey: string;
    trigger: string;
    emotionOrBody: string;
    automaticStory: string;
    facts: string;
    oldResponse: string;
    newChoice: string;
    emotionTag: string;
    learningTypes: string[];
    isReview?: boolean;
    isCrisis?: boolean;
  }) => Promise<{
    success: boolean;
    isDuplicateCandidate?: boolean;
    message?: string;
    progressCount?: number;
    newlyHatchable?: boolean;
    reward?: any;
    eggFeedback?: any;
    error?: string;
  }>;
  isLoggedIn: boolean;
  saveDraft: (data: {
    conversationId: string;
    trigger?: string;
    emotionOrBody?: string;
    automaticStory?: string;
    facts?: string;
    oldResponse?: string;
    newChoice?: string;
  }) => Promise<{ success: boolean }>;
  createDraftTrace: (data: {
    id?: string;
    conversationId: string;
    trigger?: string;
    emotionOrBody?: string;
    automaticStory?: string;
    desires?: string;
    facts?: string;
    oldResponse?: string;
    newChoice?: string;
    insights?: string;
    emotionTags?: string[];
    skills?: any;
  }) => Promise<{ success: boolean; trace?: any; traceId?: string; error?: string }>;
  updateTrace: (
    traceId: string,
    data: {
      title?: string;
      summary?: string;
      thoughtsOrFears?: string;
      desires?: string;
      oldResponse?: string;
      newChoice?: string;
      insights?: string;
      emotionTags?: string[];
      practicedSkills?: string[];
      trigger?: string;
      emotionOrBody?: string;
      automaticStory?: string;
      facts?: string;
    }
  ) => Promise<{ success: boolean; trace?: any; error?: string }>;
  confirmTrace: (
    traceId: string,
    data: {
      conversationId: string;
      idempotencyKey: string;
      trigger: string;
      emotionOrBody?: string;
      automaticStory?: string;
      facts?: string;
      oldResponse?: string;
      newChoice?: string;
      desires?: string;
      insights?: string;
      emotionTags?: string[];
      skills: {
        emotional_awareness?: number;
        somatic_awareness?: number;
        cognitive_clarity?: number;
        conscious_action?: number;
      };
      isReview?: boolean;
      isCrisis?: boolean;
    }
  ) => Promise<{
    success: boolean;
    alreadyProcessed?: boolean;
    growthEvent?: any;
    progressCount?: number;
    reward?: any;
    newlyHatched?: boolean;
    hatchUnavailable?: string;
    hatchMilestoneReward?: any;
    companion?: any;
    error?: string;
  }>;
  petCompanion: () => Promise<void>;
  hatchCompanion: () => Promise<{ success: boolean; companion?: CompanionData; snapshot?: any; error?: string }>;
  refreshCompanion: () => Promise<void>;
}

const LOCAL_STORAGE_COMPANION_KEY = 'deung_sati_companion_v2';
const LOCAL_STORAGE_TRACES_KEY = 'deung_sati_traces_v2';
const LOCAL_STORAGE_WALLET_KEY = 'deung_sati_wallet_v2';
const LOCAL_STORAGE_COMPLETED_LOOPS_KEY = 'deung_sati_completed_loops_v2';

const CompanionContext = createContext<CompanionContextType | undefined>(undefined);

export const CompanionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [companion, setCompanion] = useState<CompanionData | null>(null);
  const [traceCount, setTraceCount] = useState<number>(0);
  const [traces, setTraces] = useState<LoopTraceItem[]>([]);
  const [wallet, setWallet] = useState<WalletData>({ xp: 0, level: 1, shells: 0, memory_crystals: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Helper to fetch headers
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-DeungSati-Client': 'true',
    };
    const token = localStorage.getItem('deung_sati_session_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // 1. Fetch live data from server or local fallback
  const refreshCompanion = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isLoggedIn) {
        // Fetch companion
        const compRes = await fetch('/api/companion/me', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (compRes.ok) {
          const data = await compRes.json();
          setCompanion(data.companion ? { ...data.companion, snapshot: data.snapshot ?? data.companion.snapshot } : null);
        }

        // Fetch traces
        const traceRes = await fetch('/api/loops/traces', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (traceRes.ok) {
          const traceData = await traceRes.json();
          setTraces(traceData.traces || []);
          setTraceCount(Number(traceData.totalCount || 0));
        }

        // Fetch wallet
        const walletRes = await fetch('/api/wallet/me', {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (walletRes.ok) {
          const wData = await walletRes.json();
          if (wData.wallet) {
            setWallet({
              xp: wData.wallet.xp,
              level: wData.wallet.level,
              shells: wData.wallet.shells,
              memory_crystals: wData.wallet.memory_crystals,
            });
          }
        }
      } else {
        // Guest local storage fallback
        try {
          const savedComp = localStorage.getItem(LOCAL_STORAGE_COMPANION_KEY);
          if (savedComp) setCompanion(JSON.parse(savedComp));

          let loadedTraces: LoopTraceItem[] = [];
          const savedTraces = localStorage.getItem(LOCAL_STORAGE_TRACES_KEY);
          if (savedTraces) {
            try {
              const parsed = JSON.parse(savedTraces);
              if (Array.isArray(parsed)) {
                loadedTraces = parsed;
                setTraces(loadedTraces);
              }
            } catch (e) {
              console.warn('Failed to parse local traces', e);
            }
          }

          // Authoritative count is the number of confirmed completed loops ONLY (never unconfirmed drafts)
          let canonicalCount = 0;
          const savedCompleted = localStorage.getItem(LOCAL_STORAGE_COMPLETED_LOOPS_KEY);
          if (savedCompleted) {
            try {
              const parsedCompleted = JSON.parse(savedCompleted);
              if (Array.isArray(parsedCompleted)) {
                canonicalCount = parsedCompleted.filter((cl: any) => cl.progress_counted !== false).length;
              }
            } catch {}
          } else {
            // Backward-compat fallback: filter traces that are confirmed
            canonicalCount = loadedTraces.filter((t) => Boolean(t.growth_event || t.xp_awarded || (t as any).is_confirmed)).length;
          }
          setTraceCount(canonicalCount);

          const savedWallet = localStorage.getItem(LOCAL_STORAGE_WALLET_KEY);
          if (savedWallet) setWallet(JSON.parse(savedWallet));
        } catch (e) {
          console.warn('Failed to parse local companion data', e);
        }
      }
    } catch (err) {
      console.warn('Error fetching companion data:', err);
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refreshCompanion();
  }, [refreshCompanion]);

  // 2. Create companion from conversational onboarding
  const createCompanionFromOnboarding = async (answers: {
    toneStyle: string;
    focusArea: string;
    safeSpace: string;
    companionName: string;
  }): Promise<CompanionData> => {
    // Generate deterministic Growth DNA based on mindful choices
    let primaryPink = 'soft_sakura';
    let secondary = '#8BD3DD';
    let gill = 'feathery_wave';
    let feeler = 'soft_droplet';
    let headLight = 'lantern';
    let pattern = 'ripples';
    let movement = 'calm_float';

    // Tone influences hue and gills
    if (answers.toneStyle === 'direct') {
      primaryPink = 'electric_rose';
      secondary = '#FFD166';
      gill = 'crown_spire';
      feeler = 'crystal_point';
      movement = 'alert_dash';
    } else if (answers.toneStyle === 'quiet') {
      primaryPink = 'coral_pastel';
      secondary = '#A8DADC';
      gill = 'feather_drift';
      feeler = 'mist_tendril';
      movement = 'gentle_hover';
    }

    // Focus influences head light & pattern
    if (answers.focusArea === 'anxiety') {
      headLight = 'lantern';
      pattern = 'ripples';
    } else if (answers.focusArea === 'anger') {
      headLight = 'ember_orb';
      pattern = 'stars';
    } else if (answers.focusArea === 'patience') {
      headLight = 'droplet';
      pattern = 'gradient';
    } else if (answers.focusArea === 'compassion') {
      headLight = 'lotus';
      pattern = 'blossoms';
    }

    const dna: GrowthDnaData = {
      primary_pink_shade: primaryPink,
      secondary_color: secondary,
      gill_type: gill,
      cheek_feeler_type: feeler,
      head_light_type: headLight,
      head_light_tip: 'warm_glow',
      tail_type: 'broad_fin',
      body_pattern: pattern,
      movement_personality: movement,
      safe_space_theme: answers.safeSpace || 'moonlit_pond',
    };

    const seed = Date.now();
    const name = answers.companionName.trim() || 'น้องดึงสติ';

    if (isLoggedIn) {
      const res = await fetch('/api/companion/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ seed, dna, name }),
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to create companion on server');
      }
      const data = await res.json();
      setCompanion(data.companion);
      return data.companion;
    } else {
      // Local guest creation
      const localComp: CompanionData = {
        id: `local_cmp_${Date.now()}`,
        seed,
        name,
        stage: 0, // Egg
        unlocked_max_stage: 0,
        mood_state: 'calm',
        last_interacted_at: new Date().toISOString(),
        dna,
        equippedItems: {},
      };
      localStorage.setItem(LOCAL_STORAGE_COMPANION_KEY, JSON.stringify(localComp));
      setCompanion(localComp);
      return localComp;
    }
  };

  // 3. Record Loop Trace & Progress Egg
  const recordTrace = async (
    category: string,
    title: string,
    summary: string,
    rawData?: any
  ): Promise<{ success: boolean; traceCount: number; newlyHatchable?: boolean }> => {
    let newCount = traceCount + 1;
    let createdTrace: LoopTraceItem;

    if (isLoggedIn) {
      const res = await fetch('/api/loops/traces', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category, title, summary, rawTurnData: rawData || {} }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to save trace to server');
      const data = await res.json();
      newCount = Number(data.totalCount || newCount);
      createdTrace = {
        id: data.trace.id,
        trace_category: data.trace.trace_category,
        title: data.trace.title,
        summary: data.trace.summary,
        created_at: data.trace.created_at,
      };

      // Award reward via server ledger
      try {
        await fetch('/api/wallet/reward', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            eventType: 'trace_recorded',
            eventId: createdTrace.id,
          }),
          credentials: 'include',
        });
      } catch (e) {
        console.warn('Trace reward trigger:', e);
      }
    } else {
      createdTrace = {
        id: `local_trc_${Date.now()}`,
        trace_category: category,
        title,
        summary,
        created_at: new Date().toISOString(),
      };
      const updatedTraces = [createdTrace, ...traces];
      setTraces(updatedTraces);
      localStorage.setItem(LOCAL_STORAGE_TRACES_KEY, JSON.stringify(updatedTraces));
    }

    setTraceCount(newCount);
    setTraces((prev) => [createdTrace, ...prev]);

    // Update wallet state
    setWallet((prev) => ({
      ...prev,
      xp: prev.xp + 15,
      shells: prev.shells + 10,
    }));

    const newlyHatchable = traceCount < 20 && newCount >= 20 && companion?.stage === 0;
    return { success: true, traceCount: newCount, newlyHatchable };
  };

  // 3. Complete Loop (6-Part Validated with Anti-Farming & Server-Authoritative Ledger)
  const completeLoop = async (data: {
    conversationId: string;
    idempotencyKey: string;
    trigger: string;
    emotionOrBody: string;
    automaticStory: string;
    facts: string;
    oldResponse: string;
    newChoice: string;
    emotionTag: string;
    learningTypes: string[];
    isReview?: boolean;
    isCrisis?: boolean;
  }) => {
    if (isLoggedIn) {
      const res = await fetch('/api/loops/complete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to complete loop' };
      }
      if (result.isDuplicateCandidate) {
        return { success: false, isDuplicateCandidate: true, message: result.message };
      }

      if (result.progressCount !== undefined) {
        setTraceCount(result.progressCount);
      }
      if (result.updatedDna && companion) {
        setCompanion((prev) => (prev ? { ...prev, dna: result.updatedDna } : prev));
      }
      if (result.reward?.wallet) {
        setWallet(result.reward.wallet);
      }
      return result;
    } else {
      // Local guest fallback
      const newCount = traceCount + 1;
      setTraceCount(newCount);
      const localTrace: LoopTraceItem = {
        id: `local_loop_${Date.now()}`,
        trace_category: 'Completed Loop',
        title: data.trigger.slice(0, 35),
        summary: `${data.trigger} -> ${data.newChoice}`,
        created_at: new Date().toISOString(),
      };
      setTraces((prev) => [localTrace, ...prev]);
      setWallet((prev) => ({
        ...prev,
        xp: prev.xp + 20,
        shells: prev.shells + 10,
      }));
      return {
        success: true,
        progressCount: newCount,
        newlyHatchable: newCount >= 20 && companion?.stage === 0,
        reward: { xp: 20, shells: 10 },
        eggFeedback: {
          emotionColor: '#FFB7C5',
          message: 'น้องได้รับสีของความรู้ตัว',
          quote: 'สีเหล่านี้คือสิ่งที่เราเคยผ่าน ไม่ใช่สิ่งที่นิยามว่าเราเป็นใคร',
        },
      };
    }
  };

  // Save Draft (does NOT increase progress, awards 0 points, does NOT change DNA)
  const saveDraft = async (draftData: {
    conversationId: string;
    trigger?: string;
    emotionOrBody?: string;
    automaticStory?: string;
    facts?: string;
    oldResponse?: string;
    newChoice?: string;
  }) => {
    if (isLoggedIn) {
      const res = await fetch('/api/loops/draft', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(draftData),
        credentials: 'include',
      });
      return { success: res.ok };
    }
    return { success: true };
  };

  const createDraftTrace = async (data: {
    id?: string;
    conversationId: string;
    trigger?: string;
    emotionOrBody?: string;
    automaticStory?: string;
    desires?: string;
    facts?: string;
    oldResponse?: string;
    newChoice?: string;
    insights?: string;
    emotionTags?: string[];
    skills?: any;
  }): Promise<{ success: boolean; trace?: any; traceId?: string; error?: string }> => {
    if (isLoggedIn) {
      try {
        const res = await fetch('/api/loops/traces', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) {
          return { success: false, error: json.error || 'Failed to create trace draft' };
        }
        if (json.trace) {
          setTraces((prev) => {
            const exists = prev.some((t) => t.id === json.trace.id);
            if (exists) {
              return prev.map((t) => (t.id === json.trace.id ? { ...t, ...json.trace } : t));
            }
            return [json.trace, ...prev];
          });
        }
        return { success: true, trace: json.trace, traceId: json.trace?.id };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    } else {
      // Guest local draft with stable conversation ID
      const guestTraceId = data.id || `guest_trc_${data.conversationId}`;
      const rawTurnData = {
        trigger: data.trigger || '',
        emotionOrBody: data.emotionOrBody || '',
        automaticStory: data.automaticStory || '',
        facts: data.facts || '',
        desires: data.desires || '',
        oldResponse: data.oldResponse || '',
        newChoice: data.newChoice || '',
        insights: data.insights || '',
        emotionTags: data.emotionTags || [],
      };
      const localDraftItem: LoopTraceItem = {
        id: guestTraceId,
        source_session_id: data.conversationId,
        conversationId: data.conversationId,
        trace_category: 'mindful_loop',
        title: data.trigger || 'แบบร่างลูปสติ',
        summary: data.emotionOrBody || '',
        trigger: data.trigger || '',
        emotion_or_body: data.emotionOrBody || '',
        automatic_story: data.automaticStory || '',
        facts: data.facts || '',
        desires: data.desires || '',
        old_response: data.oldResponse || '',
        new_choice: data.newChoice || '',
        insights: data.insights || '',
        emotion_tags: data.emotionTags || [],
        growth_event: null,
        xp_awarded: false,
        is_confirmed: false,
        raw_data_json: rawTurnData,
        created_at: new Date().toISOString(),
      };
      setTraces((prev) => {
        const exists = prev.some((t) => t.id === guestTraceId);
        const next = exists
          ? prev.map((t) => (t.id === guestTraceId ? { ...t, ...localDraftItem } : t))
          : [localDraftItem, ...prev];
        localStorage.setItem(LOCAL_STORAGE_TRACES_KEY, JSON.stringify(next));
        return next;
      });
      return { success: true, trace: localDraftItem, traceId: guestTraceId };
    }
  };

  const updateTrace = async (
    traceId: string,
    data: {
      title?: string;
      summary?: string;
      thoughtsOrFears?: string;
      desires?: string;
      oldResponse?: string;
      newChoice?: string;
      insights?: string;
      emotionTags?: string[];
      practicedSkills?: string[];
      trigger?: string;
      emotionOrBody?: string;
      automaticStory?: string;
      facts?: string;
    }
  ): Promise<{ success: boolean; trace?: any; error?: string }> => {
    if (isLoggedIn) {
      const res = await fetch(`/api/loops/traces/${traceId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error || 'Failed to update trace' };
      }
      const resData = await res.json();
      setTraces((prev) =>
        prev.map((t) => (t.id === traceId ? { ...t, ...data, ...(resData.trace || {}), updated_at: new Date().toISOString() } : t))
      );
      return { success: true, trace: resData.trace };
    } else {
      // Guest local storage
      const updatedTraces = traces.map((t) => {
        if (t.id !== traceId) return t;
        const currentRaw = (typeof t.raw_data_json === 'object' && t.raw_data_json !== null) ? { ...t.raw_data_json } : {};
        const nextTrigger = data.trigger !== undefined ? data.trigger : (data.title !== undefined ? data.title : t.trigger);
        const nextEmotion = data.emotionOrBody !== undefined ? data.emotionOrBody : (data.summary !== undefined ? data.summary : t.emotion_or_body);
        const nextStory = data.automaticStory !== undefined ? data.automaticStory : (data.thoughtsOrFears !== undefined ? data.thoughtsOrFears : t.automatic_story);
        const nextFacts = data.facts !== undefined ? data.facts : t.facts;
        const nextDesires = data.desires !== undefined ? data.desires : t.desires;
        const nextOldResponse = data.oldResponse !== undefined ? data.oldResponse : t.old_response;
        const nextNewChoice = data.newChoice !== undefined ? data.newChoice : t.new_choice;
        const nextInsights = data.insights !== undefined ? data.insights : t.insights;
        const nextTags = data.emotionTags !== undefined ? data.emotionTags : t.emotion_tags;

        const nextRaw = {
          ...currentRaw,
          trigger: nextTrigger || '',
          emotionOrBody: nextEmotion || '',
          automaticStory: nextStory || '',
          facts: nextFacts || '',
          desires: nextDesires || '',
          oldResponse: nextOldResponse || '',
          newChoice: nextNewChoice || '',
          insights: nextInsights || '',
          emotionTags: nextTags || [],
        };

        return {
          ...t,
          title: nextTrigger || t.title,
          summary: nextEmotion || t.summary,
          trigger: nextTrigger,
          emotion_or_body: nextEmotion,
          automatic_story: nextStory,
          facts: nextFacts,
          desires: nextDesires,
          old_response: nextOldResponse,
          new_choice: nextNewChoice,
          insights: nextInsights,
          emotion_tags: nextTags,
          raw_data_json: nextRaw,
          updated_at: new Date().toISOString(),
        };
      });
      setTraces(updatedTraces);
      localStorage.setItem(LOCAL_STORAGE_TRACES_KEY, JSON.stringify(updatedTraces));
      return { success: true, trace: updatedTraces.find((t) => t.id === traceId) };
    }
  };

  const confirmTrace = async (
    traceId: string,
    data: {
      conversationId: string;
      idempotencyKey: string;
      trigger: string;
      emotionOrBody?: string;
      automaticStory?: string;
      facts?: string;
      oldResponse?: string;
      newChoice?: string;
      desires?: string;
      insights?: string;
      emotionTags?: string[];
      skills: {
        emotional_awareness?: number;
        somatic_awareness?: number;
        cognitive_clarity?: number;
        conscious_action?: number;
      };
      isReview?: boolean;
      isCrisis?: boolean;
    }
  ) => {
    if (isLoggedIn) {
      const res = await fetch(`/api/loops/traces/${traceId}/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to confirm trace' };
      }
      if (result.progressCount !== undefined) {
        setTraceCount(result.progressCount);
      }
      if (result.reward?.wallet) {
        setWallet(result.reward.wallet);
      }
      if (result.companion) {
        setCompanion(previous => ({ ...result.companion, snapshot: result.snapshot ?? (previous?.id === result.companion.id ? previous?.snapshot : undefined) }));
      }
      setTraces((prev) =>
        prev.map((t) =>
          t.id === traceId
            ? {
                ...t,
                title: data.trigger.trim() || t.title,
                summary: (data.emotionOrBody || '').trim() || t.summary,
                trigger: data.trigger.trim(),
                emotion_or_body: (data.emotionOrBody || '').trim(),
                automatic_story: (data.automaticStory || '').trim(),
                facts: (data.facts || '').trim(),
                desires: (data.desires || '').trim(),
                old_response: (data.oldResponse || '').trim(),
                new_choice: (data.newChoice || '').trim(),
                insights: (data.insights || '').trim(),
                emotion_tags: data.emotionTags || [],
                growth_event: result.growthEvent,
                xp_awarded: true,
                is_confirmed: true,
                updated_at: new Date().toISOString(),
              }
            : t
        )
      );
      return result;
    } else {
      // Guest Local Storage with local idempotency key (Directive 6)
      const IDEMP_STORE_KEY = 'deung_sati_idemp_keys_v2';
      let idempKeys: string[] = [];
      try {
        const stored = localStorage.getItem(IDEMP_STORE_KEY);
        if (stored) idempKeys = JSON.parse(stored);
      } catch {}

      let savedCompleted: any[] = [];
      try {
        const sc = localStorage.getItem(LOCAL_STORAGE_COMPLETED_LOOPS_KEY);
        if (sc) savedCompleted = JSON.parse(sc);
      } catch {}

      const existingRecord = savedCompleted.find(
        (cl: any) => cl.loop_trace_id === traceId || cl.idempotency_key === data.idempotencyKey
      );
      const currentConfirmedCount = savedCompleted.filter((cl: any) => cl.progress_counted !== false).length;

      if (idempKeys.includes(data.idempotencyKey) || idempKeys.includes(traceId) || existingRecord) {
        return {
          success: true,
          alreadyProcessed: true,
          progressCount: currentConfirmedCount,
          growthEvent: existingRecord,
        };
      }

      const validation = validateLoopForConfirmation({
        trigger: data.trigger,
        emotionOrBody: data.emotionOrBody,
        automaticStory: data.automaticStory,
        facts: data.facts,
        newChoice: data.newChoice,
        insights: data.insights,
        desires: data.desires,
        oldResponse: data.oldResponse,
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: `ข้อมูลไม่ครบถ้วนสำหรับการยืนยัน Growth Event (ยังขาด: ${validation.missingFields.join(', ')}) กรุณาระบุข้อมูลให้ครบถ้วน หรือบันทึกเป็นแบบร่างไว้ก่อน`,
          missingFields: validation.missingFields,
        };
      }

      idempKeys.push(data.idempotencyKey);
      idempKeys.push(traceId);
      localStorage.setItem(IDEMP_STORE_KEY, JSON.stringify(idempKeys));

      // Authoritative count is based strictly on completed loops count + 1 (never unconfirmed drafts)
      const newCount = currentConfirmedCount + 1;
      setTraceCount(newCount);

      const completedLoopId = `guest_cloop_${Date.now()}`;
      const completedLoopRecord = {
        emotional_awareness: data.skills?.emotional_awareness ? 1 : 0,
        somatic_awareness: data.skills?.somatic_awareness ? 1 : 0,
        cognitive_clarity: data.skills?.cognitive_clarity ? 1 : 0,
        conscious_action: data.skills?.conscious_action ? 1 : 0,
        id: completedLoopId,
        user_id: 'guest',
        conversation_id: data.conversationId,
        loop_trace_id: traceId,
        idempotency_key: data.idempotencyKey,
        trigger: data.trigger.trim(),
        emotion_or_body: (data.emotionOrBody || '').trim(),
        automatic_story: (data.automaticStory || '').trim(),
        facts: (data.facts || '').trim(),
        old_response: (data.oldResponse || '').trim(),
        new_choice: (data.newChoice || '').trim(),
        desires: (data.desires || '').trim(),
        insights: (data.insights || '').trim(),
        emotion_tags: data.emotionTags || [],
        progress_counted: !data.isReview,
        reward_xp: 15,
        reward_shells: 10,
        created_at: new Date().toISOString(),
      };
      savedCompleted.unshift(completedLoopRecord);
      localStorage.setItem(LOCAL_STORAGE_COMPLETED_LOOPS_KEY, JSON.stringify(savedCompleted));

      const rawTurnData = {
        trigger: data.trigger.trim(),
        emotionOrBody: (data.emotionOrBody || '').trim(),
        automaticStory: (data.automaticStory || '').trim(),
        facts: (data.facts || '').trim(),
        desires: (data.desires || '').trim(),
        oldResponse: (data.oldResponse || '').trim(),
        newChoice: (data.newChoice || '').trim(),
        insights: (data.insights || '').trim(),
        emotionTags: data.emotionTags || [],
      };

      // Save confirmed trace with full fields preserved and is_confirmed = true
      let existingTrace: LoopTraceItem | undefined;
      try {
        const savedTraces = localStorage.getItem(LOCAL_STORAGE_TRACES_KEY);
        const parsedSaved: LoopTraceItem[] = savedTraces ? JSON.parse(savedTraces) : [];
        existingTrace = parsedSaved.find((t) => t.id === traceId);
      } catch {}

      const confirmedTraceItem: LoopTraceItem = {
        id: traceId,
        trace_category: 'mindful_loop',
        title: data.trigger.trim() || 'วงจรสติ',
        summary: (data.emotionOrBody || '').trim(),
        trigger: data.trigger.trim(),
        emotion_or_body: (data.emotionOrBody || '').trim(),
        automatic_story: (data.automaticStory || '').trim(),
        facts: (data.facts || '').trim(),
        desires: (data.desires || '').trim(),
        old_response: (data.oldResponse || '').trim(),
        new_choice: (data.newChoice || '').trim(),
        insights: (data.insights || '').trim(),
        emotion_tags: data.emotionTags || [],
        growth_event: completedLoopRecord,
        xp_awarded: true,
        is_confirmed: true,
        raw_data_json: rawTurnData,
        created_at: existingTrace?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTraces((prev) => {
        const exists = prev.some((t) => t.id === traceId);
        const next = exists
          ? prev.map((t) => (t.id === traceId ? confirmedTraceItem : t))
          : [confirmedTraceItem, ...prev];
        localStorage.setItem(LOCAL_STORAGE_TRACES_KEY, JSON.stringify(next));
        return next;
      });

      // Award +15 XP, +10 Shells per spec
      const newWallet = {
        ...wallet,
        xp: wallet.xp + 15,
        shells: wallet.shells + 10,
      };
      setWallet(newWallet);
      localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, JSON.stringify(newWallet));

      // A unique collectible may only be issued by the authenticated server.
      const newlyHatched = false;

      return {
        success: true,
        progressCount: newCount,
        reward: { xp: 15, shells: 10, wallet: newWallet },
        newlyHatched,
        growthEvent: completedLoopRecord,
      };
    }
  };

  // 4. Pet / Touch Companion (ANTI-FARMING: Zero points, zero progress granted)
  const petCompanion = async () => {
    if (isLoggedIn) {
      try {
        const res = await fetch('/api/companion/interact', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ moodState: 'calm' }),
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.companion) setCompanion(previous => ({ ...data.companion, snapshot: data.snapshot ?? (previous?.id === data.companion.id ? previous?.snapshot : undefined) }));
        }
      } catch (e) {
        console.warn('Pet interaction sync:', e);
      }
    }
  };

  // 5. Hatch Egg (when traceCount >= 20)
  const hatchCompanion = async (): Promise<{ success: boolean; companion?: CompanionData; snapshot?: any; error?: string }> => {
    if (companion && companion.stage > 0) return { success: true, companion, snapshot: companion.snapshot };
    if (traceCount < 20) {
      return { success: false, error: `สะสมบันทึกการรู้ตัวได้ ${traceCount}/20 ครั้ง ต้องครบ 20 ครั้งก่อนฟักนะ` };
    }

    if (isLoggedIn) {
      const res = await fetch('/api/companion/hatch', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || 'Failed to hatch' };
      }
      const data = await res.json();
      setCompanion({ ...data.companion, snapshot: data.snapshot });
      if (data.reward?.wallet) setWallet(data.reward.wallet);
      return { success: true, companion: data.companion, snapshot: data.snapshot };
    } else {
      return { success: false, error: 'กรุณาเข้าสู่ระบบและเชื่อมต่ออินเทอร์เน็ตเพื่อฟักน้องประจำตัว' };
    }
  };

  const companionLoading = !isHydrated || isLoading;
  const needsOnboarding = isHydrated && !companion;

  return (
    <CompanionContext.Provider
      value={{
        companion,
        traceCount,
        traces,
        wallet,
        isLoading,
        isHydrated,
        companionLoading,
        needsOnboarding,
        createCompanionFromOnboarding,
        recordTrace,
        updateTrace,
        confirmTrace,
        completeLoop,
        isLoggedIn,
        createDraftTrace,
        saveDraft,
        petCompanion,
        hatchCompanion,
        refreshCompanion,
      }}
    >
      {children}
    </CompanionContext.Provider>
  );
};

export const useCompanion = () => {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion must be used within CompanionProvider');
  return ctx;
};
