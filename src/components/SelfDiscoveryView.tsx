import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Compass, Download, Heart, RefreshCw, Shield, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDiscovery } from '../hooks/useDiscovery';
import type { AssessmentData, AssessmentId, DiscoveryExerciseId, DiscoveryLocale, DiscoveryRecord, EmotionData, PracticeData, SavedDiscoveryRecord } from '../shared/discovery';
import { ASSESSMENTS, calculateAssessment, getAssessment } from '../shared/discoveryAssessments';
import { DISCOVERY_EXERCISES, getDiscoveryExercise } from '../shared/discoveryEmotionCatalog';
import { DiscoveryAssessment } from './DiscoveryAssessment';
import { EmotionExplorer } from './EmotionExplorer';
import { DiscoveryPractice } from './DiscoveryPractice';
import './SelfDiscovery.css';

type Session = { id: string; createdAt: string; locale: DiscoveryLocale; revision?: number };
type AssessmentRoute = { screen: 'assessment'; session: Session; assessmentId: AssessmentId; initial?: AssessmentData; initialSaved?: boolean };
type EmotionRoute = { screen: 'emotion'; session: Session; initial?: EmotionData; initialSaved?: boolean };
type PracticeRoute = { screen: 'practice'; session: Session; exerciseId: DiscoveryExerciseId; sourceLabel: string; initial?: PracticeData; returnTo?: AssessmentRoute | EmotionRoute };
type Route = { screen: 'hub' } | AssessmentRoute | EmotionRoute | PracticeRoute;
type Props = { onBack: () => void; onEmergency: () => void };

export function SelfDiscoveryView({ onBack, onEmergency }: Props) {
  const { currentUser } = useAuth();
  return <SelfDiscoveryAccount key={currentUser?.id || 'guest'} onBack={onBack} onEmergency={onEmergency} />;
}

function SelfDiscoveryAccount({ onBack, onEmergency }: Props) {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const defaultLocale: DiscoveryLocale = language === 'th' ? 'th' : 'en';
  const [locale, setLocale] = useState<DiscoveryLocale>(defaultLocale);
  const [route, setRoute] = useState<Route>({ screen: 'hub' });
  const [tab, setTab] = useState<'explore' | 'history'>('explore');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [exportError, setExportError] = useState(false);
  const assessmentDraft = useRef<AssessmentData | undefined>(undefined);
  const emotionDraft = useRef<EmotionData | undefined>(undefined);
  const practiceDraft = useRef<PracticeData | undefined>(undefined);
  const keepAssessmentDraft = useCallback((data: AssessmentData) => { assessmentDraft.current = data; }, []);
  const keepEmotionDraft = useCallback((data: EmotionData) => { emotionDraft.current = data; }, []);
  const keepPracticeDraft = useCallback((data: PracticeData) => { practiceDraft.current = data; }, []);
  const sync = useDiscovery(currentUser?.id || null);
  const activeLocale = route.screen === 'hub' ? locale : route.session.locale;
  const c = (th: string, en: string) => activeLocale === 'th' ? th : en;
  const session = (): Session => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), locale });
  const saveLabel = c(currentUser ? 'ยืนยันบันทึกในบัญชีนี้' : 'ยืนยันเก็บในเบราว์เซอร์นี้', currentUser ? 'Confirm and save to this account' : 'Confirm and save in this browser');
  const toHub = () => { setRoute({ screen: 'hub' }); setNotice(''); };
  const openAssessment = (id: AssessmentId) => { assessmentDraft.current = undefined; setRoute({ screen: 'assessment', session: session(), assessmentId: id }); setNotice(''); };
  const openEmotion = () => { emotionDraft.current = undefined; setRoute({ screen: 'emotion', session: session() }); setNotice(''); };
  const practice = (id: DiscoveryExerciseId, sourceLabel = '') => {
    const returnTo = route.screen === 'assessment' ? { ...route, initial: assessmentDraft.current || route.initial, initialSaved: false } : route.screen === 'emotion' ? { ...route, initial: emotionDraft.current || route.initial, initialSaved: false } : undefined;
    setRoute({ screen: 'practice', session: { ...session(), locale: activeLocale }, exerciseId: id, sourceLabel, returnTo });
    setNotice('');
  };
  const openSaved = (record: SavedDiscoveryRecord) => {
    const meta: Session = { id: record.id, createdAt: record.createdAt, locale: record.locale, revision: record.revision };
    if (record.kind === 'assessment') { assessmentDraft.current = record.data; setRoute({ screen: 'assessment', session: meta, assessmentId: record.data.assessmentId, initial: record.data, initialSaved: true }); }
    if (record.kind === 'emotion') { emotionDraft.current = record.data; setRoute({ screen: 'emotion', session: meta, initial: record.data, initialSaved: true }); }
    if (record.kind === 'practice') setRoute({ screen: 'practice', session: meta, exerciseId: record.data.exerciseId, sourceLabel: record.data.sourceLabel, initial: record.data });
    setNotice('');
  };
  const saveData = async (data: AssessmentData | EmotionData | PracticeData): Promise<boolean> => {
    if (route.screen === 'hub') return false;
    const { session: meta } = route;
    const input = { id: meta.id, version: 1, locale: meta.locale, createdAt: meta.createdAt, kind: route.screen, data } as DiscoveryRecord;
    const saved = await sync.save(input, meta.revision);
    if (!saved) return false;
    setRoute(current => current.screen !== 'hub' && current.session.id === saved.id ? { ...current, session: { ...current.session, revision: saved.revision } } : current);
    setNotice(c(currentUser ? 'บันทึกในบัญชีแล้ว' : 'เก็บในเบราว์เซอร์นี้แล้ว', currentUser ? 'Saved to your account.' : 'Saved in this browser.'));
    return true;
  };
  const saveAsNew = async () => {
    if (route.screen === 'hub' || sync.saving) return;
    const data = route.screen === 'assessment' ? assessmentDraft.current : route.screen === 'emotion' ? emotionDraft.current : practiceDraft.current;
    if (!data) return;
    const meta = { ...session(), locale: activeLocale };
    const saved = await sync.save({ ...meta, version: 1, kind: route.screen, data } as DiscoveryRecord);
    if (!saved) return;
    const nextSession = { ...meta, revision: saved.revision };
    if (saved.kind === 'assessment') setRoute({ screen: 'assessment', session: nextSession, assessmentId: saved.data.assessmentId, initial: saved.data, initialSaved: true });
    if (saved.kind === 'emotion') setRoute({ screen: 'emotion', session: nextSession, initial: saved.data, initialSaved: true });
    if (saved.kind === 'practice') setRoute({ screen: 'practice', session: nextSession, exerciseId: saved.data.exerciseId, sourceLabel: saved.data.sourceLabel, initial: saved.data });
    setNotice(c('บันทึกร่างที่แก้เป็นรายการใหม่แล้ว รายการเดิมไม่ถูกเขียนทับ', 'Your edited draft was saved as a new reflection. The previous record was not overwritten.'));
  };
  const exportRecords = () => {
    setExportError(false);
    try {
      const blob = new Blob([JSON.stringify({ format: 'deung-sati-discovery-v1', exportedAt: new Date().toISOString(), records: sync.records }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'deung-sati-my-reflections.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError(true); }
  };
  const recordTitle = (record: SavedDiscoveryRecord) => record.kind === 'assessment' ? getAssessment(record.data.assessmentId).title[locale] : record.kind === 'emotion' ? c('สำรวจอารมณ์ของฉัน', 'My emotion check-in') : getDiscoveryExercise(record.data.exerciseId)?.title[locale] || c('แบบฝึกของฉัน', 'My practice');
  const errorMessages: Record<string, string> = {
    storage: c('เปิดหรือบันทึกข้อมูลในเบราว์เซอร์ไม่ได้ ข้อความในแบบฟอร์มยังอยู่ และข้อมูลเดิมยังไม่ถูกเขียนทับ', 'Browser storage is unavailable or unreadable. Your form is still here; previous records have not been overwritten.'),
    account: c('บัญชีเปลี่ยนไปหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก', 'Your account changed or your session expired. Sign in again before saving.'),
    conflict: c('รายการนี้เปลี่ยนจากอีกหน้า ถูกลบ หรือถึงขีดจำกัดบันทึกแล้ว ข้อความที่แก้ยังอยู่ ตรวจประวัติล่าสุดก่อนลองอีกครั้ง', 'This record changed elsewhere, was deleted, or the record limit was reached. Your edits are still here; check the latest history before retrying.'),
    invalid: c('ยังบันทึกไม่ได้ กรุณาตรวจข้อมูลและความยาวข้อความ', 'Unable to save. Check the fields and text lengths.'),
    connection: c('ยังยืนยันการบันทึกไม่ได้ ข้อความในแบบฟอร์มยังอยู่ ลองอีกครั้งเมื่อเชื่อมต่อได้', 'Saving could not be confirmed. Your form is still here; retry when connected.'),
    unsupported: c('เบราว์เซอร์นี้ไม่รองรับการป้องกันบันทึกชนกัน คุณยังสำรวจได้ ลองใช้เบราว์เซอร์รุ่นใหม่เพื่อเก็บบันทึก', 'This browser cannot coordinate safe local saves. You can still explore; use an up-to-date browser to save locally.'),
  };
  return <div className="screen scrollArea self-discovery" data-testid="self-discovery">
    <header className="sd-header"><button type="button" className="sd-icon-button" aria-label={c('กลับหน้าหลัก', 'Back to home')} disabled={sync.saving} onClick={() => { if (route.screen === 'hub' || window.confirm(c('กลับหน้าหลักไหม? ข้อความที่ยังไม่ได้บันทึกจะหาย', 'Return home? Unsaved text will be lost.'))) onBack(); }}><ArrowLeft size={21} /></button><span>{c('รู้จักตัวฉัน', 'Get to know myself')}</span><button type="button" className="sd-quiet" onClick={onEmergency}>{c('พักก่อน', 'Pause')}</button></header>
    <main className="sd-main">
      {route.screen === 'hub' && <>
        <div className="sd-row sd-hub-heading"><div><span className="sd-eyebrow">{c('ทีละเรื่อง · ในแบบของคุณ', 'ONE TOPIC AT A TIME')}</span><h1>{c('วันนี้อยากเข้าใจอะไร?', 'What would you like to understand?')}</h1></div><label className="sd-language"><span className="sd-sr-only">{c('ภาษาของแบบสำรวจ', 'Reflection language')}</span><select value={locale} onChange={e => setLocale(e.target.value as DiscoveryLocale)}><option value="th">ไทย</option><option value="en">English</option></select></label></div>
        <nav className="sd-tabs" aria-label={c('เลือกพื้นที่', 'Choose a section')}><button type="button" aria-pressed={tab === 'explore'} onClick={() => setTab('explore')}><Compass size={17} />{c('สำรวจและฝึก', 'Explore & practice')}</button><button type="button" aria-pressed={tab === 'history'} onClick={() => setTab('history')}><BookOpen size={17} />{c('บันทึกของฉัน', 'My reflections')}{sync.records.length > 0 && <span className="sd-count">{sync.records.length}</span>}</button></nav>
      </>}
      <div className="sd-privacy"><Shield size={15} aria-hidden="true" /><p>{c(currentUser ? 'ใช้ได้โดยไม่บันทึก เมื่อกดยืนยันจึงเก็บในบัญชีนี้' : 'ใช้ได้โดยไม่สมัคร เมื่อกดยืนยันจึงเก็บในเบราว์เซอร์นี้ ผู้ใช้เครื่องเดียวกันอาจเห็นได้', currentUser ? 'Explore without saving. Your answers are stored in this account only when you confirm.' : 'No account needed. Saving is optional and local to this browser, visible to others using it.')}</p></div>
      {sync.error && <div className="sd-error" role="alert"><p>{errorMessages[sync.error]}</p><button type="button" className="sd-secondary" disabled={sync.loading || sync.saving} onClick={() => void sync.refresh()}><RefreshCw size={15} />{c('ตรวจบันทึกอีกครั้ง', 'Reload saved records')}</button>{sync.error === 'conflict' && route.screen !== 'hub' && <button type="button" className="sd-secondary" disabled={sync.saving} onClick={() => void saveAsNew()}>{c('ยืนยันบันทึกร่างนี้เป็นรายการใหม่', 'Confirm and save this draft as a new reflection')}</button>}</div>}
      {notice && <p className="sd-notice" role="status">{notice}</p>}
      {route.screen === 'hub' && tab === 'explore' && <div className="sd-stack">
        <button type="button" className="sd-now-card" onClick={openEmotion}><span className="sd-card-icon"><Heart size={23} /></span><span><strong>{c('สำรวจอารมณ์ตอนนี้', 'Explore my feelings now')}</strong><small>{c('มีความสุข สับสน หรือยังเรียกไม่ถูกก็เริ่มได้', 'Happy, mixed, or hard to name — start where you are.')}</small></span><ArrowRight size={19} /></button>
        <section aria-labelledby="sd-assessments-heading"><h2 id="sd-assessments-heading">{c('ช่วงนี้ฉันเป็นอย่างไร?', 'How have I been lately?')}</h2><p className="sd-note">{c('12 ข้อ · เห็นคะแนนรายด้าน พร้อมเลือกสิ่งที่จะฝึก', '12 questions · See each area and choose what to practice.')}</p><div className="sd-stack">{ASSESSMENTS.map(def => <button type="button" className="sd-topic" key={def.id} onClick={() => openAssessment(def.id)}><span className="sd-card-icon"><Compass size={22} /></span><span><strong>{def.title[locale]}</strong><small>{def.description[locale]}</small></span><ArrowRight size={18} /></button>)}</div></section>
        <section aria-labelledby="sd-practice-heading"><h2 id="sd-practice-heading">{c('เลือกแบบฝึกได้เลย', 'Go straight to a practice')}</h2><div className="sd-exercise-grid">{DISCOVERY_EXERCISES.map(ex => <button key={ex.id} type="button" className="sd-exercise-tile" onClick={() => practice(ex.id)}><Sparkles size={17} /><span>{ex.title[locale]}</span></button>)}</div></section>
        <p className="sd-note sd-method-note">{c('แบบสำรวจเหล่านี้ออกแบบเพื่อทบทวนพฤติกรรม ยังไม่ผ่านการตรวจสอบคุณภาพการวัด ผลสะท้อนคำตอบช่วงนี้และแก้ไขได้', 'These reflection questionnaires have not been validated as measurement tools. Results describe your recent answers and can be revised.')}</p>
      </div>}
      {route.screen === 'hub' && tab === 'history' && <section className="sd-stack" aria-labelledby="sd-history-heading"><div className="sd-row"><h2 id="sd-history-heading">{c('สิ่งที่ฉันเก็บไว้', 'My saved reflections')}</h2><button type="button" className="sd-quiet" disabled={sync.loading || sync.saving} onClick={() => void sync.refresh()}><RefreshCw size={16} />{c('อัปเดต', 'Refresh')}</button></div>
        {sync.loading && <p role="status">{c('กำลังเปิดบันทึก…', 'Loading reflections…')}</p>}
        {!sync.loading && sync.records.length === 0 && <div className="sd-empty"><BookOpen size={30} /><p>{c('ยังไม่มีบันทึก เริ่มสำรวจแล้วเลือกเก็บเฉพาะสิ่งที่อยากกลับมาดูได้', 'No saved reflections yet. Explore and keep only what you want to revisit.')}</p><button type="button" className="sd-primary" onClick={() => setTab('explore')}>{c('เริ่มสำรวจ', 'Start exploring')}</button></div>}
        {sync.records.map(record => <article key={record.id} className="sd-history-card"><button type="button" className="sd-record-open" onClick={() => openSaved(record)}><span className="sd-eyebrow">{record.kind === 'assessment' ? c('แบบประเมิน', 'QUESTIONNAIRE') : record.kind === 'emotion' ? c('อารมณ์ตอนนั้น', 'EMOTION CHECK-IN') : c('แบบฝึก', 'PRACTICE')} · {record.locale === 'th' ? 'TH' : 'EN'}</span><strong>{recordTitle(record)}</strong><small>{new Date(record.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US')}</small>
          {record.kind === 'assessment' && (() => { const score = calculateAssessment(getAssessment(record.data.assessmentId), record.data.answers); return <span>{score.total === null ? c(`ตอบ ${score.answeredCount}/12 ข้อที่ให้คะแนน`, `${score.answeredCount}/12 scored answers`) : `${score.total} / ${score.max}`}</span>; })()}
          {record.kind === 'practice' && <span>{record.data.status === 'tried' ? c('ได้ลองแล้ว · กลับมาทบทวน', 'Tried · revisit your reflection') : record.data.status === 'not-yet' ? c('ยังไม่ได้ลอง · ปรับได้', 'Not yet · adjust anytime') : c('ร่างไว้ลอง · ยังไม่ลงมือ', 'A plan · not yet tried')}</span>}
        </button>{deleteId === record.id ? <div className="sd-delete-confirm"><p>{c('ลบบันทึกนี้ถาวร?', 'Permanently delete this reflection?')}</p><div className="sd-row"><button type="button" className="sd-secondary" disabled={sync.saving} onClick={() => void sync.remove(record).then(ok => { if (ok) setDeleteId(null); })}>{c('ยืนยันลบ', 'Delete')}</button><button type="button" className="sd-quiet" onClick={() => setDeleteId(null)}>{c('เก็บไว้', 'Keep it')}</button></div></div> : <button type="button" className="sd-quiet sd-delete" onClick={() => setDeleteId(record.id)}><Trash2 size={14} />{c('ลบ', 'Delete')}</button>}</article>)}
        {sync.records.length > 0 && <button type="button" className="sd-secondary" onClick={exportRecords}><Download size={17} />{c('ดาวน์โหลดบันทึกชุดนี้', 'Download these reflections')}</button>}{exportError && <p role="alert" className="sd-error">{c('ดาวน์โหลดไม่ได้ ลองอีกครั้งได้', 'Download failed. Please try again.')}</p>}
      </section>}
      {route.screen === 'assessment' && <DiscoveryAssessment key={route.session.id} definition={getAssessment(route.assessmentId)} locale={route.session.locale} initial={route.initial} initialSaved={route.initialSaved || false} onSave={saveData} onPractice={practice} onBack={toHub} saving={sync.saving || sync.loading} saveLabel={saveLabel} onDraftChange={keepAssessmentDraft} />}
      {route.screen === 'emotion' && <EmotionExplorer key={route.session.id} locale={route.session.locale} initial={route.initial} initialSaved={route.initialSaved || false} onSave={saveData} onPractice={practice} onBack={toHub} saving={sync.saving || sync.loading} saveLabel={saveLabel} onDraftChange={keepEmotionDraft} />}
      {route.screen === 'practice' && <DiscoveryPractice key={route.session.id} exerciseId={route.exerciseId} locale={route.session.locale} sourceLabel={route.sourceLabel} initial={route.initial} onSave={saveData} onDraftChange={keepPracticeDraft} onBack={() => route.returnTo ? setRoute(route.returnTo) : toHub()} saving={sync.saving || sync.loading} saveLabel={saveLabel} />}
    </main>
  </div>;
}
