import { useMemo } from 'react';
import { AxolotlWaterPreview } from './AxolotlWaterPreview';
import { CompanionEgg } from './CompanionEgg';
import { resolveCompanionAppearance, type CompanionAppearanceSource } from '../shared/companionAppearance';

export interface GrowthDnaProps {
  primary_pink_shade?: string;
  secondary_color?: string;
  gill_type?: string;
  cheek_feeler_type?: string;
  head_light_type?: string;
  head_light_tip?: string;
  tail_type?: string;
  body_pattern?: string;
  movement_personality?: string;
  safe_space_theme?: string;
}

interface CompanionRendererProps {
  stage: number; traceCount?: number; dna?: GrowthDnaProps | null; moodState?: string;
  isInteracting?: boolean; onPet?: () => void; size?: number; paused?: boolean;
  source?: CompanionAppearanceSource;
}
export function CompanionRenderer({stage, traceCount = 0, dna, isInteracting = false, onPet, size = 280, paused = false, source}: CompanionRendererProps) {
  const appearance = useMemo(() => resolveCompanionAppearance(source ?? {dna}), [source, dna]);
  return stage === 0 ? <CompanionEgg traceCount={traceCount} size={size} onPet={onPet} isInteracting={isInteracting} paused={paused} variant="room" appearance={appearance} /> :
    <div style={{width:size,maxWidth:'100%',height:size * 1.12,position:'relative'}}>
      <AxolotlWaterPreview appearance={appearance} paused={paused} onPet={onPet} activityVersion={traceCount} showControls={size >= 250}/>
    </div>;
}
