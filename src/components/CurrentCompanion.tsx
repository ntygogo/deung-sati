import type { CompanionIdleKind } from '../shared/companionIdleMotion';
import { lazy, Suspense, useMemo, type Ref } from 'react';
import type { CompanionCaptureHandle } from './AxolotlWaterPreview';
import { collectionPreview } from '../shared/companionArtDirection';
import { resolveCompanionAppearance, type CompanionAppearanceSource } from '../shared/companionAppearance';
const Model = lazy(() => import('./AxolotlWaterPreview').then(m => ({ default: m.AxolotlWaterPreview })));
// This collection activates the corrected topology AND replacement gills.
const CURRENT_APPEARANCE = collectionPreview(resolveCompanionAppearance(), 'flower');
export function CurrentCompanion({ captureRef, controls = false, paused = false, source, allowedIdleKinds, walking = false, locomotion, onPet, onReady, onError }: { source?: CompanionAppearanceSource; allowedIdleKinds?: readonly CompanionIdleKind[]; walking?: boolean; locomotion?: {phase:number;heading:number}; onPet?: () => void; captureRef?: Ref<CompanionCaptureHandle>; controls?: boolean; paused?: boolean; onReady?: () => void; onError?: () => void }) {
  const appearance = useMemo(() => source ? collectionPreview(resolveCompanionAppearance(source), 'flower') : CURRENT_APPEARANCE, [source]);
  return <div className="current-companion" data-model-version="corrected-gills-2026-09-26">
    <Suspense fallback={<span className="current-companion-loading" role="status">กำลังพาน้องมาหา…</span>}>
      <Model ref={captureRef} appearance={appearance} walking={walking} locomotion={locomotion} allowedIdleKinds={allowedIdleKinds} onPet={onPet} showControls={controls} paused={paused} onReady={onReady} onError={onError} />
    </Suspense>
  </div>;
}
