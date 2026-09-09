import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

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
  seed: number;
  name: string;
  stage: number; // 0 = Egg, 1 = Hatchling, 2 = Adolescent, 3 = Mature
  unlocked_max_stage: number;
  mood_state: string;
  last_interacted_at: string;
  dna?: GrowthDnaData;
  equippedItems?: Record<string, string>;
}

export interface LoopTraceItem {
  id: string;
  trace_category: string;
  title: string;
  summary: string;
  created_at: string;
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
  saveDraft: (data: {
    conversationId: string;
    trigger?: string;
    emotionOrBody?: string;
    automaticStory?: string;
    facts?: string;
    oldResponse?: string;
    newChoice?: string;
  }) => Promise<{ success: boolean }>;
  petCompanion: () => Promise<void>;
  hatchCompanion: () => Promise<{ success: boolean; companion?: CompanionData; snapshot?: any; error?: string }>;
  refreshCompanion: () => Promise<void>;
}

const LOCAL_STORAGE_COMPANION_KEY = 'deung_sati_companion_v2';
const LOCAL_STORAGE_TRACES_KEY = 'deung_sati_traces_v2';
const LOCAL_STORAGE_WALLET_KEY = 'deung_sati_wallet_v2';

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
          setCompanion(data.companion || null);
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

          const savedTraces = localStorage.getItem(LOCAL_STORAGE_TRACES_KEY);
          if (savedTraces) {
            const parsed = JSON.parse(savedTraces);
            setTraces(parsed);
            setTraceCount(parsed.length);
          }

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
          if (data.companion) setCompanion(data.companion);
        }
      } catch (e) {
        console.warn('Pet interaction sync:', e);
      }
    }
  };

  // 5. Hatch Egg (when traceCount >= 20)
  const hatchCompanion = async (): Promise<{ success: boolean; companion?: CompanionData; snapshot?: any; error?: string }> => {
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
      if (!companion) return { success: false, error: 'No companion found' };
      const hatchedComp: CompanionData = {
        ...companion,
        stage: 1, // Hatchling
        unlocked_max_stage: 1,
        mood_state: 'excited',
      };
      setCompanion(hatchedComp);
      localStorage.setItem(LOCAL_STORAGE_COMPANION_KEY, JSON.stringify(hatchedComp));
      setWallet((prev) => ({
        ...prev,
        xp: prev.xp + 50,
        shells: prev.shells + 30,
        memory_crystals: prev.memory_crystals + 1,
      }));
      return { success: true, companion: hatchedComp };
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
        completeLoop,
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
