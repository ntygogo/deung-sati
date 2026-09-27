import { lazy, Suspense, useState, type Ref } from 'react';
import type { CompanionCaptureHandle } from './AxolotlWaterPreview';
import { collectionPreview } from '../shared/companionArtDirection';
import { resolveCompanionAppearance } from '../shared/companionAppearance';
const Model = lazy(() => import('./AxolotlWaterPreview').then(m => ({ default: m.AxolotlWaterPreview })));
// This collection activates the corrected topology AND replacement gills.
const CURRENT_APPEARANCE = collectionPreview(resolveCompanionAppearance(), 'flower');
export function CurrentCompanion({ captureRef, controls = false }: { captureRef?: Ref<CompanionCaptureHandle>; controls?: boolean }) {
  const [ready, setReady] = useState(false);
  return <div className="current-companion" data-model-version="corrected-gills-2026-09-26">
    {!ready && <img className="current-companion-poster" src="/images/deung-sati-selfie.webp" alt="น้องดึงสติ" />}
    <Suspense fallback={null}><Model ref={captureRef} appearance={CURRENT_APPEARANCE} showControls={controls} autoGreet onReady={() => setReady(true)} /></Suspense>
  </div>;
}
