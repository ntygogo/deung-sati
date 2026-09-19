import { useEffect, useRef, useState } from 'react';
import type { DiscoveryExerciseId, DiscoveryLocale, PracticeData } from '../shared/discovery';
import { getDiscoveryExercise } from '../shared/discoveryEmotionCatalog';

type Props = { exerciseId: DiscoveryExerciseId; locale: DiscoveryLocale; sourceLabel: string; initial?: PracticeData; onSave: (data: PracticeData) => Promise<boolean>; onDraftChange?: (data: PracticeData) => void; onBack: () => void; saving: boolean; saveLabel: string };
export function DiscoveryPractice({ exerciseId, locale, sourceLabel, initial, onSave, onDraftChange, onBack, saving, saveLabel }: Props) {
  const choose = (th: string, en: string) => locale === 'th' ? th : en;
  const exercise = getDiscoveryExercise(exerciseId);
  const [data, setData] = useState<PracticeData>(() => initial || { exerciseId, sourceLabel, fields: {}, obstacle: '', status: 'planned', outcome: null, reflection: '', nextStep: '' });
  const baseline = useRef(JSON.stringify(initial || data));
  const dirty = JSON.stringify(data) !== baseline.current;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = (patch: Partial<PracticeData>) => { setData(current => ({ ...current, ...patch })); setNotice(''); };
  useEffect(() => { onDraftChange?.(data); }, [data, onDraftChange]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  if (!exercise) return <p role="alert">{choose('เปิดแบบฝึกนี้ไม่ได้', 'This exercise is unavailable.')}</p>;
  const back = () => { if (!dirty || window.confirm(choose('ข้อความที่ยังไม่ได้บันทึกจะหาย กลับไปเลือกเรื่องไหม?', 'Unsaved changes will be lost. Return to discovery?'))) onBack(); };
  const submit = async () => {
    if (saving) return;
    if (data.status === 'tried' && exercise.fields.some(field => field.required && !data.fields[field.id]?.trim())) { setError(choose('เติมช่องหลักเพื่อบอกว่าได้ลองอะไร หรือเลือกเก็บเป็นร่างไว้ก่อน', 'Fill in the main fields to describe what you tried, or save this as a draft.')); return; }
    if (!Object.values(data.fields).some(value => value.trim()) && !data.obstacle.trim() && !data.reflection.trim() && !data.nextStep.trim()) { setError(choose('เพิ่มสิ่งที่อยากเก็บไว้สักอย่างก่อนบันทึก', 'Add something you want to keep before saving.')); return; }
    if (data.status === 'tried' && data.outcome === null) { setError(choose('เลือกผลที่สังเกตหลังลองก่อนนะ ไม่จำเป็นต้องดีขึ้น', 'Choose what you noticed after trying. Improvement is not required.')); return; }
    setError('');
    if (await onSave(data)) { baseline.current = JSON.stringify(data); setNotice(choose('เก็บแบบฝึกนี้แล้ว กลับมาทบทวนหรือปรับได้', 'Saved. You can return to reflect or adjust this practice.')); }
  };
  return <fieldset className="sd-stack sd-fieldset" disabled={saving} aria-labelledby="sd-practice-title">
    <button type="button" className="sd-quiet" onClick={back}>← {choose('เลือกเรื่องอื่น', 'Choose another topic')}</button>
    <div><span className="sd-eyebrow">{choose('ลองทีละก้าว', 'ONE SMALL PRACTICE')}</span><h1 id="sd-practice-title">{exercise.title[locale]}</h1><p>{exercise.description[locale]}</p>{sourceLabel && <p className="sd-note">{choose('จากเรื่องที่คุณเลือก: ', 'From your chosen focus: ')}{sourceLabel}</p>}</div>
    <section className="sd-panel"><ol className="sd-steps">{exercise.steps.map((step, i) => <li key={i}>{step[locale]}</li>)}</ol><p className="sd-note">{choose('หยุดหรือเปลี่ยนวิธีได้ ถ้าวิธีนี้ไม่เข้ากับคุณตอนนี้', 'You can stop or switch if this does not fit you right now.')}</p></section>
    <label className="sd-field">{choose('อะไรทำให้เรื่องนี้ยาก? (เว้นได้)', 'What makes this difficult? (optional)')}<textarea maxLength={1000} value={data.obstacle} onChange={e => update({ obstacle: e.target.value })} placeholder={choose('เช่น ลืม รู้สึกผิด หรือมีภาระที่เลื่อนไม่ได้', 'Forgetting, feeling guilty, or responsibilities you cannot postpone')} /></label>
    {data.obstacle.trim() && <p className="sd-note">{choose('ลองเลือกส่วนที่คุณมีอำนาจเปลี่ยนได้ ลดขนาดก้าว หรือขอความช่วยเหลือ ไม่จำเป็นต้องฝืนข้อจำกัดจริง', 'Choose something within your control, make the step smaller, or ask for support. You do not have to push past real constraints.')}</p>}
    {exercise.fields.map(field => <label key={field.id} className="sd-field">{field.label[locale]}{!field.required && <span className="sd-note"> {choose('(เว้นได้)', '(optional)')}</span>}<textarea maxLength={1000} value={data.fields[field.id] || ''} onChange={e => update({ fields: { ...data.fields, [field.id]: e.target.value } })} placeholder={field.placeholder[locale]} /></label>)}
    <fieldset className="sd-fieldset"><legend>{choose('ตอนนี้อยู่ตรงไหน?', 'Where are you with this practice?')}</legend><div className="sd-options">{([
      ['planned', choose('ร่างไว้ลอง', 'A plan to try')], ['tried', choose('ได้ลองแล้ว', 'I have tried it')], ['not-yet', choose('ยังไม่ได้ลอง / ยังไม่เหมาะ', 'Not yet / not right now')],
    ] as const).map(([value, label]) => <button key={value} type="button" className="sd-chip" aria-pressed={data.status === value} onClick={() => update({ status: value, outcome: value === 'tried' ? data.outcome : null })}>{label}</button>)}</div></fieldset>
    {data.status === 'tried' && <fieldset className="sd-fieldset"><legend>{choose('หลังลอง คุณสังเกตว่า…', 'After trying, you noticed…')}</legend><div className="sd-options">{([
      ['helpful', choose('ช่วยได้บ้าง', 'Somewhat helpful')], ['same', choose('ยังไม่เห็นความต่าง', 'No difference yet')], ['harder', choose('ยากขึ้น / ไม่เหมาะตอนนี้', 'Harder / not a good fit')],
    ] as const).map(([value, label]) => <button key={value} type="button" className="sd-chip" aria-pressed={data.outcome === value} onClick={() => update({ outcome: value })}>{label}</button>)}</div></fieldset>}
    <label className="sd-field">{choose('สิ่งที่ได้เรียนรู้หรือข้อจำกัดที่พบ (เว้นได้)', 'What you learned or what got in the way (optional)')}<textarea maxLength={2000} value={data.reflection} onChange={e => update({ reflection: e.target.value })} /></label>
    <label className="sd-field">{choose('ครั้งหน้าจะปรับอะไร หรือพอแค่นี้ก่อน? (เว้นได้)', 'What would you adjust next time, or stop here? (optional)')}<textarea maxLength={1000} value={data.nextStep} onChange={e => update({ nextStep: e.target.value })} /></label>
    {error && <p role="alert" className="sd-error">{error}</p>}{notice && <p role="status" className="sd-notice">{notice}</p>}
    <button type="button" className="sd-primary" disabled={saving} onClick={() => void submit()}>{saving ? choose('กำลังบันทึก…', 'Saving…') : saveLabel}</button>
    <p className="sd-note">{choose('การร่างแผนยังไม่ใช่การลงมือ คุณกลับมาระบุผลภายหลังได้', 'Planning is separate from trying. You can return to record what happened.')}</p>
  </fieldset>;
}
