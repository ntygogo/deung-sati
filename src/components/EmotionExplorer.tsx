import { useEffect, useId, useState } from 'react';
import type { DiscoveryExerciseId, DiscoveryLocale, EmotionData } from '../shared/discovery';
import { EMOTIONS, NEEDS, getDiscoveryExercise } from '../shared/discoveryEmotionCatalog';

export interface EmotionExplorerProps {
    locale: DiscoveryLocale;
    initial?: EmotionData;
    initialSaved?: boolean;
    onSave: (data: EmotionData) => Promise<boolean>;
    onPractice: (id: DiscoveryExerciseId, sourceLabel: string) => void;
    onDraftChange?: (data: EmotionData) => void;
    onBack: () => void;
    saving: boolean;
    saveLabel: string;
}

const emptyEmotionData = (): EmotionData => ({
    context: '', story: '', emotions: [], customEmotion: '', intensity: null,
    body: '', needs: [], customNeed: '', goal: null,
});

const copyData = (value: EmotionData): EmotionData => ({
    ...value, emotions: [...value.emotions], needs: [...value.needs],
});

const GOALS: Array<{ id: DiscoveryExerciseId; th: string; en: string }> = [
    { id: 'grounding', th: 'อยากตั้งหลักก่อน', en: 'Find my footing' },
    { id: 'name-emotion', th: 'อยากหาคำให้ความรู้สึก', en: 'Find words for my feelings' },
    { id: 'facts-story', th: 'อยากแยกเหตุการณ์กับความคิด', en: 'Separate facts and thoughts' },
    { id: 'check-capacity', th: 'อยากเช็กกำลังก่อนตอบรับ', en: 'Check my capacity' },
    { id: 'boundary', th: 'อยากรักษาพื้นที่ของตัวเอง', en: 'Protect my space' },
    { id: 'kind-self-talk', th: 'อยากคุยกับตัวเองดีขึ้น', en: 'Speak to myself more kindly' },
    { id: 'savor', th: 'อยากเก็บสิ่งดี ๆ นี้ไว้', en: 'Notice what feels good' },
    { id: 'tiny-step', th: 'อยากเลือกสิ่งที่จะทำต่อ', en: 'Choose a next step' },
];

/** Owns a session draft only. The parent owns explicit account/local saving. */
export function EmotionExplorer({ locale, initial, initialSaved = false, onSave, onPractice, onDraftChange, onBack, saving, saveLabel }: EmotionExplorerProps) {
    const t = (th: string, en: string) => locale === 'th' ? th : en;
    const formId = useId();
    const [data, setData] = useState<EmotionData>(() => initial ? copyData(initial) : emptyEmotionData());
    const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial ?? emptyEmotionData()));
    const [hasSaved, setHasSaved] = useState(initialSaved);
    const [step, setStep] = useState(initial ? 3 : 0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const busy = saving || submitting;
    const hasReport = Boolean(
        data.context.trim() || data.story.trim() || data.emotions.length || data.customEmotion.trim()
        || data.intensity !== null || data.body.trim() || data.needs.length || data.customNeed.trim() || data.goal,
    );
    const dirty = JSON.stringify(data) !== savedSnapshot || (!hasSaved && hasReport);
    const exercise = data.goal ? getDiscoveryExercise(data.goal) : undefined;
    const missing = t('ยังไม่ได้ระบุ', 'Not specified yet');
    const steps = [t('เหตุการณ์', 'Situation'), t('ความรู้สึก', 'Feelings'), t('สิ่งสำคัญ', 'What matters'), t('ทบทวน', 'Review')];

    useEffect(() => {
        onDraftChange?.(copyData(data));
    }, [data, onDraftChange]);

    useEffect(() => {
        if (!dirty) return;
        const preventLosingDraft = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', preventLosingDraft);
        return () => window.removeEventListener('beforeunload', preventLosingDraft);
    }, [dirty]);

    function update<K extends keyof EmotionData>(key: K, value: EmotionData[K]) {
        setData(previous => ({ ...previous, [key]: value }));
        setSaved(false);
        setError('');
    }

    function toggle(key: 'emotions' | 'needs', id: string) {
        const values = data[key];
        if (values.includes(id)) update(key, values.filter(value => value !== id));
        else if (values.length < 8) update(key, [...values, id]);
    }

    function canLeave() {
        return !dirty || window.confirm(t(
            'คำตอบที่แก้ไขยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?',
            'Your changes have not been saved. Leave this page?',
        ));
    }

    async function saveCurrent() {
        if (busy) return;
        if (!hasReport) {
            setError(t('เพิ่มสิ่งที่อยากเก็บไว้อย่างน้อยหนึ่งอย่าง หรือเลือก “ยังหาคำไม่ได้” หากตรงกับตอนนี้', 'Add at least one thing you want to keep, or choose “Cannot name it yet” if that fits.'));
            return;
        }
        setError('');
        setSubmitting(true);
        const snapshot = copyData(data);
        try {
            if (await onSave(snapshot)) {
                setSavedSnapshot(JSON.stringify(snapshot));
                setHasSaved(true);
                setSaved(true);
            } else {
                setError(t('ยังบันทึกไม่สำเร็จ คำตอบยังอยู่ในหน้านี้ ลองอีกครั้งได้', 'Saving did not finish. Your answers are still on this page; you can try again.'));
            }
        } catch {
            setError(t('ยังบันทึกไม่สำเร็จ คำตอบยังอยู่ในหน้านี้ ลองอีกครั้งได้', 'Saving did not finish. Your answers are still on this page; you can try again.'));
        } finally {
            setSubmitting(false);
        }
    }

    function openPractice() {
        if (busy || !data.goal || (!onDraftChange && !canLeave())) return;
        onPractice(data.goal, t('สำรวจอารมณ์ตอนนี้', 'Explore my emotions now'));
    }

    const emotionLabels = data.emotions.map(id => EMOTIONS.find(item => item.id === id)?.label[locale]).filter(Boolean);
    if (data.customEmotion.trim()) emotionLabels.push(data.customEmotion.trim());
    const needLabels = data.needs.map(id => NEEDS.find(item => item.id === id)?.label[locale]).filter(Boolean);
    if (data.customNeed.trim()) needLabels.push(data.customNeed.trim());

    return (
        <section className="sd-panel sd-stack" aria-labelledby={`${formId}-title`}>
            <div className="sd-row">
                <button type="button" className="sd-quiet" disabled={busy} onClick={() => { if (canLeave()) onBack(); }}>
                    {t('← กลับหน้าสำรวจตัวเอง', '← Back to self-discovery')}
                </button>
                <span className="sd-note">{t('สำรวจได้ทั้งวันที่ดีและวันที่ยาก', 'For good days and difficult ones')}</span>
            </div>
            <header>
                <h2 id={`${formId}-title`}>{t('ตอนนี้ฉันรู้สึกอะไร', 'What am I feeling right now?')}</h2>
                <p>{t('ค่อย ๆ สำรวจสิ่งที่เกิดขึ้น แล้วเลือกสิ่งที่อยากลองต่อ ข้ามข้อที่ยังตอบไม่ได้ได้เลย', 'Explore what happened, then choose what to try next. Skip anything you cannot answer yet.')}</p>
            </header>
            <nav className="sd-progress" aria-label={t('ขั้นตอนสำรวจอารมณ์', 'Emotion exploration steps')}>
                {steps.map((label, index) => (
                    <span key={label} aria-current={step === index ? 'step' : undefined} className={step === index ? 'is-active' : ''}>
                        {index + 1}. {label}
                    </span>
                ))}
            </nav>

            <fieldset className="sd-stack" disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <legend className="sd-note">{t(`ขั้นที่ ${step + 1} จาก 4 · ${steps[step]}`, `Step ${step + 1} of 4 · ${steps[step]}`)}</legend>

                {step === 0 && <>
                    <label className="sd-field" htmlFor={`${formId}-context`}>
                        <strong>{t('เกิดอะไรขึ้น — สิ่งที่คุณเห็นหรือได้ยินโดยตรง?', 'What happened — what did you directly see or hear?')}</strong>
                        <textarea id={`${formId}-context`} rows={3} maxLength={1000} value={data.context} onChange={event => update('context', event.target.value)} placeholder={t('เช่น มีคนชมงานฉัน / ฉันตอบรับงานเพิ่มทั้งที่มีงานค้างอยู่', 'For example, someone praised my work / I accepted another task while others were unfinished.')} />
                    </label>
                    <label className="sd-field" htmlFor={`${formId}-story`}>
                        <strong>{t('คุณกำลังตีความเรื่องนี้ว่าอย่างไร?', 'What meaning are you giving this?')}</strong>
                        <textarea id={`${formId}-story`} rows={3} maxLength={1000} value={data.story} onChange={event => update('story', event.target.value)} placeholder={t('เช่น ฉันคิดว่าเขาเห็นความตั้งใจของฉัน / ฉันกลัวว่าถ้าปฏิเสธเขาจะผิดหวัง', 'For example, I think they noticed my effort / I worry they will be disappointed if I decline.')} />
                    </label>
                    <p className="sd-note">{t('ยังไม่ต้องตัดสินว่าความคิดถูกหรือผิด ถ้ายังตอบไม่ได้ ข้ามไปก่อนได้', 'You do not need to decide whether your interpretation is right or wrong. You can skip for now.')}</p>
                </>}

                {step === 1 && <>
                    <div className="sd-stack">
                        <h3 id={`${formId}-feelings-label`}>{t('คำไหนใกล้เคียงกับตอนนี้?', 'Which words come close right now?')}</h3>
                        <div className="sd-options" role="group" aria-labelledby={`${formId}-feelings-label`}>
                            {EMOTIONS.map(item => <button type="button" key={item.id} className={`sd-chip${data.emotions.includes(item.id) ? ' is-selected' : ''}`} aria-pressed={data.emotions.includes(item.id)} disabled={!data.emotions.includes(item.id) && data.emotions.length >= 8} onClick={() => toggle('emotions', item.id)}>{item.label[locale]}</button>)}
                        </div>
                        <span className="sd-note">{t(`เลือกได้หลายคำ สูงสุด 8 คำ · เลือกแล้ว ${data.emotions.length}`, `Choose up to 8 words · ${data.emotions.length} selected`)}</span>
                    </div>
                    <label className="sd-field" htmlFor={`${formId}-custom-emotion`}>
                        <strong>{t('อยากใช้คำอื่นไหม? (ข้ามได้)', 'Would you use another word? (Optional)')}</strong>
                        <input id={`${formId}-custom-emotion`} type="text" maxLength={120} value={data.customEmotion} onChange={event => update('customEmotion', event.target.value)} />
                    </label>
                    <label className="sd-field" htmlFor={`${formId}-intensity`}>
                        <strong>{t('โดยรวม ความรู้สึกตอนนี้แรงแค่ไหน? (ข้ามได้)', 'Overall, how strong are your feelings? (Optional)')}</strong>
                        <input id={`${formId}-intensity`} type="number" min={0} max={10} step={1} inputMode="numeric" value={data.intensity ?? ''} placeholder={t('ยังไม่ได้ระบุ', 'Not specified')} aria-describedby={`${formId}-intensity-help`} onChange={event => {
                            if (event.target.value === '') update('intensity', null);
                            else {
                                const value = Number(event.target.value);
                                if (Number.isInteger(value) && value >= 0 && value <= 10) update('intensity', value);
                            }
                        }} />
                        <span id={`${formId}-intensity-help`} className="sd-note">{t('0 = แทบไม่รู้สึก · 10 = แรงมาก เป็นระดับความแรงของอารมณ์ ไม่ใช่คะแนนดีหรือแย่', '0 = barely noticeable · 10 = very strong. This is intensity, not a good-or-bad score.')}</span>
                    </label>
                    <label className="sd-field" htmlFor={`${formId}-body`}>
                        <strong>{t('สังเกตอะไรในร่างกายไหม? (ข้ามได้)', 'Do you notice anything in your body? (Optional)')}</strong>
                        <textarea id={`${formId}-body`} rows={2} maxLength={500} value={data.body} onChange={event => update('body', event.target.value)} placeholder={t('เช่น ตึง หนัก อุ่น เบาสบาย หรือยังไม่สังเกต', 'For example, tense, heavy, warm, light, or not sure.')} />
                        <span className="sd-note">{t('ข้ามการสังเกตร่างกายได้ ถ้าตอนนี้ไม่สะดวก', 'You can skip noticing your body if it does not feel comfortable.')}</span>
                    </label>
                </>}

                {step === 2 && <>
                    <div className="sd-stack">
                        <h3 id={`${formId}-needs-label`}>{t('เรื่องนี้อาจเกี่ยวกับสิ่งสำคัญข้อไหนสำหรับคุณ?', 'What might matter to you in this situation?')}</h3>
                        <p className="sd-note">{t('เลือกสิ่งที่คุณคิดว่าอาจเกี่ยวข้อง อารมณ์หนึ่งอย่างไม่ได้บอกสาเหตุหรือความต้องการแทนคุณ', 'Choose possibilities that fit for you. A feeling alone does not tell us its cause or what you need.')}</p>
                        <div className="sd-options" role="group" aria-labelledby={`${formId}-needs-label`}>
                            {NEEDS.map(item => <button type="button" key={item.id} className={`sd-chip${data.needs.includes(item.id) ? ' is-selected' : ''}`} aria-pressed={data.needs.includes(item.id)} disabled={!data.needs.includes(item.id) && data.needs.length >= 8} onClick={() => toggle('needs', item.id)}>{item.label[locale]}</button>)}
                        </div>
                        <span className="sd-note">{t(`เลือกได้สูงสุด 8 ข้อ · เลือกแล้ว ${data.needs.length}`, `Choose up to 8 · ${data.needs.length} selected`)}</span>
                    </div>
                    <label className="sd-field" htmlFor={`${formId}-custom-need`}>
                        <strong>{t('มีสิ่งอื่นที่สำคัญไหม? (ข้ามได้)', 'Does something else matter? (Optional)')}</strong>
                        <input id={`${formId}-custom-need`} type="text" maxLength={120} value={data.customNeed} onChange={event => update('customNeed', event.target.value)} />
                    </label>
                    <div className="sd-stack">
                        <h3 id={`${formId}-goal-label`}>{t('ตอนนี้อยากลองอะไร?', 'What would you like to try now?')}</h3>
                        <div className="sd-options" role="group" aria-labelledby={`${formId}-goal-label`}>
                            {GOALS.map(goal => <button type="button" key={goal.id} className={`sd-chip${data.goal === goal.id ? ' is-selected' : ''}`} aria-pressed={data.goal === goal.id} onClick={() => update('goal', data.goal === goal.id ? null : goal.id)}>{goal[locale]}</button>)}
                            <button type="button" className="sd-quiet" onClick={() => update('goal', null)}>{t('ยังไม่เลือกแบบฝึก / ล้างที่เลือก', 'No exercise for now / clear selection')}</button>
                        </div>
                    </div>
                </>}

                {step === 3 && <>
                    <div className="sd-stack">
                        <h3>{t('ภาพร่างจากสิ่งที่คุณเล่าครั้งนี้', 'A snapshot of what you shared')}</h3>
                        <p className="sd-note">{t('นี่คือคำตอบของคุณในครั้งนี้ แก้ไขได้ก่อนบันทึก ไม่ใช่คำตัดสินตัวตนหรือการวินิจฉัย', 'These are your answers this time. You can edit them before saving. They are not a personality verdict or diagnosis.')}</p>
                        <dl className="sd-stack">
                            <div><dt><strong>{t('สิ่งที่เกิดขึ้น', 'What happened')}</strong></dt><dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.context.trim() || missing}</dd></div>
                            <div><dt><strong>{t('สิ่งที่ฉันตีความ', 'My interpretation')}</strong></dt><dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.story.trim() || missing}</dd></div>
                            <div><dt><strong>{t('ความรู้สึก', 'Feelings')}</strong></dt><dd style={{ margin: 0 }}>{emotionLabels.join(' · ') || missing}</dd></div>
                            <div><dt><strong>{t('ระดับความแรงของความรู้สึก', 'Intensity')}</strong></dt><dd style={{ margin: 0 }}>{data.intensity === null ? missing : `${data.intensity}/10`}</dd></div>
                            <div><dt><strong>{t('สิ่งที่สังเกตในร่างกาย', 'Body observations')}</strong></dt><dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.body.trim() || missing}</dd></div>
                            <div><dt><strong>{t('สิ่งที่ฉันคิดว่าอาจสำคัญ', 'What I think might matter')}</strong></dt><dd style={{ margin: 0 }}>{needLabels.join(' · ') || missing}</dd></div>
                        </dl>
                        <button type="button" className="sd-secondary" onClick={() => { setStep(0); setError(''); }}>{t('กลับไปแก้คำตอบ', 'Edit my answers')}</button>
                    </div>
                    <div className="sd-panel sd-stack">
                        <h3>{exercise?.title[locale] ?? t('ยังไม่ได้เลือกแบบฝึก', 'No exercise selected')}</h3>
                        <p>{exercise?.description[locale] ?? t('คุณเก็บสิ่งที่สังเกตไว้ได้ แม้ยังไม่ได้เลือกแบบฝึก', 'You can keep what you noticed, even without choosing an exercise.')}</p>
                        {exercise && <>
                            <ol>{exercise.steps.map((instruction, index) => <li key={index}>{instruction[locale]}</li>)}</ol>
                            <button type="button" className="sd-secondary" onClick={openPractice}>{t('เปิดแบบฝึกนี้', 'Open this exercise')}</button>
                            <p className="sd-note">{t('การเปิดแบบฝึกจะไม่บันทึกคำตอบหน้านี้ให้อัตโนมัติ', 'Opening the exercise does not automatically save these answers.')}</p>
                        </>}
                        <button type="button" className="sd-quiet" onClick={() => setStep(2)}>{t('เลือกหรือเปลี่ยนแบบฝึก', 'Choose or change an exercise')}</button>
                    </div>
                    {!hasReport && <p className="sd-note">{t('ยังไม่มีคำตอบให้เก็บไว้ คุณย้อนกลับไปเติมภายหลังได้', 'There are no answers to keep yet. You can go back and add something when you are ready.')}</p>}
                    <button type="button" className="sd-primary" disabled={!hasReport || busy || (saved && !dirty)} onClick={() => { void saveCurrent(); }}>
                        {busy ? t('กำลังบันทึก…', 'Saving…') : saved && !dirty ? t('บันทึกแล้ว', 'Saved') : saveLabel}
                    </button>
                    <p className="sd-note">{t('บันทึกเมื่อคุณกดปุ่มยืนยันเท่านั้น การสำรวจนี้ไม่เพิ่มจำนวนลูปหรือรางวัลของน้อง', 'Save only when you confirm. This reflection does not add companion loops or rewards.')}</p>
                </>}
            </fieldset>

            {error && <p className="sd-error" role="alert">{error}</p>}
            {saved && <p className="sd-note" role="status">{t('เก็บสิ่งที่คุณยืนยันไว้แล้ว', 'Your confirmed reflection has been saved.')}</p>}
            {step < 3 && <div className="sd-row">
                {step > 0 && <button type="button" className="sd-secondary" disabled={busy} onClick={() => { setStep(step - 1); setError(''); }}>{t('ย้อนกลับ', 'Back')}</button>}
                <button type="button" className="sd-primary" disabled={busy} onClick={() => { setStep(step + 1); setError(''); }}>{step === 2 ? t('ดูสรุปก่อนบันทึก', 'Review before saving') : t('ต่อไป · ข้ามข้อที่ยังตอบไม่ได้', 'Next · skip anything unanswered')}</button>
            </div>}
        </section>
    );
}

export default EmotionExplorer;
