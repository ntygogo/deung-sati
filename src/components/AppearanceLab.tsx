import { useMemo, useState } from 'react';
import { CompanionAppearance } from './CompanionAppearance';
import { DEMO_COMPANIONS, PALETTES, TRAIT_CATALOG, previewAppearance, resolveCompanionAppearance, type TraitKey } from '../shared/companionAppearance';
import './AppearanceLab.css';

/** Public, read-only sandbox for the modular companion system. It never writes score or DNA. */
export function AppearanceLab() {
  const [selected, setSelected] = useState(0);
  const [palette, setPalette] = useState<string | undefined>();
  const [motion, setMotion] = useState<string | undefined>();
  const base = useMemo(() => resolveCompanionAppearance(DEMO_COMPANIONS[selected]), [selected]);
  const appearance = useMemo(() => previewAppearance(base, { palette, motion }), [base, palette, motion]);
  return <main className="appearance-lab">
    <header><span>Deung Sati · DNA studio</span><h1>ลองลักษณะของน้อง</h1><p>ทดลองได้อิสระ การลองเล่นไม่เปลี่ยนคะแนนหรือน้องจริง</p></header>
    <div className="appearance-lab-stage"><CompanionAppearance appearance={appearance} size={290} /><div><strong>{appearance.palette.label}</strong><span>{appearance.traits.motion.label} · {appearance.traits.pattern.label}</span></div></div>
    <section className="appearance-lab-controls"><label>เลือกตัวอย่าง<select value={selected} onChange={e => setSelected(Number(e.target.value))}>{DEMO_COMPANIONS.map((_, i) => <option key={i} value={i}>น้องตัวอย่าง {i + 1}</option>)}</select></label>
      <label>สีตัว<select value={palette ?? ''} onChange={e => setPalette(e.target.value || undefined)}><option value="">ตาม DNA</option>{PALETTES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>จังหวะ<select value={motion ?? ''} onChange={e => setMotion(e.target.value || undefined)}><option value="">ตาม DNA</option>{TRAIT_CATALOG.motion.options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </section>
    <div className="appearance-lab-traits">{(Object.keys(TRAIT_CATALOG) as TraitKey[]).map(key => <span key={key}><b>{TRAIT_CATALOG[key].label}</b>{appearance.traits[key].label}</span>)}</div>
  </main>;
}
