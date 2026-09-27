import { lazy, Suspense, type Ref } from 'react';
import type { CompanionCaptureHandle } from './AxolotlWaterPreview';
import { collectionPreview } from '../shared/companionArtDirection';
import { resolveCompanionAppearance } from '../shared/companionAppearance';
const Model = lazy(() => import('./AxolotlWaterPreview').then(m => ({ default: m.AxolotlWaterPreview })));
// This collection activates the corrected topology AND replacement gills.
const CURRENT_APPEARANCE = collectionPreview(resolveCompanionAppearance(), 'flower');
export function CurrentCompanion({ captureRef, controls = false, paused = false, onReady, onError }: { captureRef?: Ref<CompanionCaptureHandle>; controls?: boolean; paused?: boolean; onReady?: () => void; onError?: () => void }) {
  return <div className="current-companion" data-model-version="corrected-gills-2026-09-26">
    <Suspense fallback={<span className="current-companion-loading" role="status">กำลังพาน้องมาหา…</span>}>
      <Model ref={captureRef} appearance={CURRENT_APPEARANCE} showControls={controls} paused={paused} onReady={onReady} onError={onError} />
    </Suspense>
  </div>;
}
