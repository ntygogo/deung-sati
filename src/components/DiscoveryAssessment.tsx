import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssessmentAnswer, AssessmentData, DiscoveryExerciseId, DiscoveryLocale } from '../shared/discovery';
import { ANSWER_OPTIONS, answerLabel, calculateAssessment, interpretAssessment, textFor } from '../shared/discoveryAssessments';
import type { AssessmentDefinition } from '../shared/discoveryAssessments';

export interface DiscoveryAssessmentProps {
  definition: AssessmentDefinition;
  locale: DiscoveryLocale;
  initial?: AssessmentData;
  initialSaved?: boolean;
  onDraftChange?: (data: AssessmentData) => void;
  onSave: (data: AssessmentData) => Promise<boolean>;
  onPractice: (id: DiscoveryExerciseId, sourceLabel: string) => void;
  onBack: () => void;
  saving: boolean;
  saveLabel: string;
}

/** Mount with an assessment/record key. Answers stay in memory until explicit consent to save. */
export function DiscoveryAssessment({ definition, locale, initial, initialSaved = Boolean(initial), onDraftChange, onSave, onPractice, onBack, saving, saveLabel }: DiscoveryAssessmentProps) {
  const L = (th: string, en: string) => locale === 'th' ? th : en;
  const [view, setView] = useState<'intro' | 'questions' | 'result'>(initial ? 'result' : 'intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>(() => ({ ...initial?.answers }));
  const [feedback, setFeedback] = useState<AssessmentData['feedback']>(initial?.feedback ?? '');
  const [focus, setFocus] = useState(initial?.focus ?? '');
  const [dirty, setDirty] = useState(Boolean(initial) && !initialSaved);
  const [confirmExit, setConfirmExit] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial && initialSaved ? 'saved' : 'idle');
  const heading = useRef<HTMLHeadingElement>(null);
  const result = useMemo(() => calculateAssessment(definition, answers), [definition, answers]);
  const interpretation = useMemo(() => interpretAssessment(definition, answers), [definition, answers]);
  const selectedFocus = definition.dimensions.find(item => item.id === focus)
    ?? definition.dimensions.find(item => item.id === interpretation.suggestedDimensionIds[0]);
  const busy = saving || saveState === 'saving';
  const item = definition.items[index];
  const answered = answers[item.id] != null;

  useEffect(() => {
    onDraftChange?.({
      assessmentId: definition.id,
      answers: Object.fromEntries(definition.items.map(question => [question.id, answers[question.id] ?? null])),
      feedback, focus: selectedFocus?.id ?? '',
    });
  }, [definition, answers, feedback, selectedFocus?.id, onDraftChange]);

  useEffect(() => { heading.current?.focus(); }, [view, index]);
  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty]);

  function markChanged() { setDirty(true); setSaveState('idle'); }
  function chooseAnswer(value: Exclude<AssessmentAnswer, null>) {
    if (answers[item.id] === value) return;
    setAnswers(current => ({ ...current, [item.id]: value }));
    setFeedback('');
    setFocus('');
    markChanged();
  }
  function back() {
    if (dirty) setConfirmExit(true);
    else onBack();
  }
  async function save() {
    if (busy || !dirty) return;
    setSaveState('saving');
    try {
      const saved = await onSave({
        assessmentId: definition.id,
        answers: Object.fromEntries(definition.items.map(question => [question.id, answers[question.id] ?? null])),
        feedback,
        focus: selectedFocus?.id ?? '',
      });
      if (saved) { setSaveState('saved'); setDirty(false); }
      else setSaveState('error');
    } catch { setSaveState('error'); }
  }

  return (
    <div className="sd-stack">
      <div className="sd-row">
        <button type="button" className="sd-quiet" onClick={back} disabled={busy}>
          {L('← กลับไปเลือกเรื่อง', '← Back to topics')}
        </button>
        <span className="sd-chip">{L('แบบสำรวจรุ่นทดลอง', 'Exploratory draft')}</span>
      </div>
      {confirmExit && (
        <section className="sd-panel sd-stack" aria-labelledby="sd-exit-title">
          <h3 id="sd-exit-title">{L('มีคำตอบที่ยังไม่ได้บันทึก', 'You have unsaved answers')}</h3>
          <p>{L('ถ้าออกตอนนี้ คำตอบที่ยังไม่บันทึกในหน้านี้จะหาย คุณอยู่ต่อเพื่อดูผลหรือบันทึกได้', 'Leaving now will discard unsaved answers on this screen. Stay to see your result or save it.')}</p>
          <div className="sd-row">
            <button type="button" className="sd-primary" onClick={() => setConfirmExit(false)}>{L('อยู่ต่อ', 'Stay here')}</button>
            <button type="button" className="sd-secondary" onClick={onBack}>{L('ออกโดยไม่บันทึก', 'Leave without saving')}</button>
          </div>
        </section>
      )}

      {view === 'intro' && (
        <section className="sd-panel sd-stack">
          <h2 ref={heading} tabIndex={-1}>{textFor(definition.title, locale)}</h2>
          <p>{textFor(definition.description, locale)}</p>
          <p><strong>{L('นึกถึง 14 วันที่ผ่านมา', 'Think about the past 14 days')}</strong>{L(' เมื่อมีสถานการณ์นั้น พฤติกรรมที่ถามเกิดขึ้นบ่อยแค่ไหน?', ' When the situation came up, how often did each behavior happen?')}</p>
          <p>{L('12 ข้อ · ข้ามได้ทุกข้อ · ดูผลและเลือกแบบฝึกได้ทันที', '12 questions · Every question is optional · See your result and choose a practice')}</p>
          <p className="sd-note">{L('ชุดนี้ออกแบบเพื่อสำรวจตนเอง ยังไม่ผ่านการตรวจสอบคุณภาพการวัด คะแนนเป็นผลรวมคำตอบ ไม่ใช่คำวินิจฉัยหรือคำตัดสินตัวตน ข้อจำกัดในชีวิตอาจมีผลต่อคำตอบ', 'This is an exploratory self-reflection tool, not a validated assessment. Scores add up your answers; they are not a diagnosis or a verdict about who you are. Life constraints may affect your responses.')}</p>
          <button type="button" className="sd-primary" onClick={() => setView('questions')}>{L('เริ่มสำรวจตัวเอง', 'Start exploring')}</button>
        </section>
      )}

      {view === 'questions' && (
        <section className="sd-panel sd-stack">
          <div className="sd-row">
            <span>{L(`ข้อ ${index + 1} จาก ${definition.items.length}`, `Question ${index + 1} of ${definition.items.length}`)}</span>
            <span>{textFor(definition.dimensions.find(dimension => dimension.id === item.dimensionId)!.title, locale)}</span>
          </div>
          <progress className="sd-progress" max={definition.items.length} value={index + 1} aria-label={L('ตำแหน่งข้อคำถาม', 'Question progress')} />
          <p className="sd-note">{L('ใน 14 วันที่ผ่านมา เมื่อมีสถานการณ์นี้…', 'In the past 14 days, when the situation came up…')}</p>
          <h2 id="sd-question-title" ref={heading} tabIndex={-1}>{textFor(item.text, locale)}</h2>
          <div className="sd-options" role="group" aria-labelledby="sd-question-title">
            {ANSWER_OPTIONS.map(option => (
              <button type="button" key={option.value} className={answers[item.id] === option.value ? 'sd-primary' : 'sd-secondary'} aria-pressed={answers[item.id] === option.value} onClick={() => chooseAnswer(option.value)} disabled={busy}>
                {textFor(option.label, locale)}
              </button>
            ))}
          </div>
          <p className="sd-note">{L('“ไม่มีสถานการณ์นี้” “ไม่แน่ใจ” และ “ข้าม” ไม่ถูกนับเป็นศูนย์', '“No such situation”, “unsure” and “skip” are not counted as zero.')}</p>
          <div className="sd-row">
            <button type="button" className="sd-secondary" disabled={index === 0} onClick={() => setIndex(current => current - 1)}>{L('ก่อนหน้า', 'Previous')}</button>
            <button type="button" className="sd-primary" disabled={!answered} onClick={() => index === definition.items.length - 1 ? setView('result') : setIndex(current => current + 1)}>
              {index === definition.items.length - 1 ? L('ดูผลของฉัน', 'See my result') : L('ถัดไป', 'Next')}
            </button>
          </div>
          <button type="button" className="sd-quiet" onClick={() => setView('result')}>{L('ดูผลจากคำตอบเท่าที่มี', 'See results from the answers so far')}</button>
        </section>
      )}

      {view === 'result' && (
        <>
          <section className="sd-panel sd-stack">
            <p className="sd-note">{textFor(definition.title, locale)} · {L('ช่วง 14 วันที่ผ่านมา', 'Past 14 days')}</p>
            <h2 ref={heading} tabIndex={-1}>{textFor(interpretation.title, locale)}</h2>
            <div className="sd-result-score" aria-label={result.total === null ? L('ยังไม่มีคะแนนรวม', 'No total score') : L(`คะแนนรวม ${result.total} จาก ${result.max}`, `Total score ${result.total} out of ${result.max}`)}>
              {result.total === null ? '—' : result.total}<span> / {result.max}</span>
            </div>
            <p>{L(`คำตอบที่ใช้คำนวณ ${result.answeredCount}/${definition.items.length} ข้อ`, `${result.answeredCount}/${definition.items.length} scored answers`)}</p>
            <p>{textFor(interpretation.description, locale)}</p>
            <p className="sd-note">{L('คะแนนคือผลรวมความถี่ที่คุณเลือก ยังไม่ใช่มาตรวัดทักษะที่ผ่านการตรวจสอบ ไม่ใช้แบ่งดี–แย่หรือเปรียบเทียบกับคนอื่น', 'Scores add up the frequencies you selected. This is not a validated skill measure and does not rank you as good or bad or compare you with others.')}</p>
          </section>

          <section className="sd-panel sd-stack" aria-labelledby="sd-focus-title">
            <h3 id="sd-focus-title">{L('คะแนนรายด้าน · เลือกเรื่องที่อยากฝึก', 'Scores by area · Choose what to practice')}</h3>
            <p className="sd-note">{L('เลือกด้านที่เหมาะกับชีวิตตอนนี้ได้ แม้ไม่ได้มีคะแนนน้อยที่สุด', 'Choose what fits your life now, even if it is not your lowest-scoring area.')}</p>
            <div className="sd-stack">
              {definition.dimensions.map(dimension => {
                const score = result.dimensions.find(value => value.id === dimension.id)!;
                const suggested = interpretation.suggestedDimensionIds.includes(dimension.id);
                return (
                  <button type="button" key={dimension.id} className={selectedFocus?.id === dimension.id ? 'sd-primary sd-stack' : 'sd-secondary sd-stack'} aria-pressed={selectedFocus?.id === dimension.id} disabled={busy} onClick={() => { setFocus(dimension.id); markChanged(); }}>
                    <span className="sd-row"><strong>{textFor(dimension.title, locale)}</strong><strong>{score.score === null ? '—' : score.score} / {score.max}</strong></span>
                    <span>{textFor(dimension.description, locale)}</span>
                    {score.score === null && <span>{L(`คำตอบที่ใช้คำนวณ ${score.answeredCount}/3 ข้อ · ยังไม่รวมคะแนนด้านนี้`, `${score.answeredCount}/3 scored answers · no area total yet`)}</span>}
                    {suggested && <span>{L('หนึ่งในด้านที่คะแนนน้อยที่สุดครั้งนี้', 'One of the lowest-scoring areas this time')}</span>}
                  </button>
                );
              })}
            </div>
            <button type="button" className="sd-primary" disabled={!selectedFocus || busy} onClick={() => selectedFocus && onPractice(selectedFocus.exerciseId, `${textFor(definition.title, locale)} · ${textFor(selectedFocus.title, locale)}`)}>
              {selectedFocus ? L(`ลองฝึก: ${textFor(selectedFocus.title, locale)}`, `Practice: ${textFor(selectedFocus.title, locale)}`) : L('เลือกเรื่องที่อยากฝึกด้านบน', 'Choose an area above to practice')}
            </button>
          </section>

          <section className="sd-panel sd-stack">
            <h3>{L('คำอธิบายนี้ตรงกับคุณแค่ไหน?', 'How well does this description fit?')}</h3>
            <div className="sd-row" role="group" aria-label={L('ความตรงของคำอธิบาย', 'How well the description fits')}>
              {([
                { value: 'yes', th: 'ตรง', en: 'Fits' },
                { value: 'partly', th: 'ตรงบางส่วน', en: 'Partly fits' },
                { value: 'no', th: 'ไม่ตรง', en: 'Does not fit' },
              ] as const).map(option => (
                <button type="button" key={option.value} className={feedback === option.value ? 'sd-primary' : 'sd-secondary'} aria-pressed={feedback === option.value} disabled={busy} onClick={() => { setFeedback(option.value); markChanged(); }}>{L(option.th, option.en)}</button>
              ))}
            </div>
            {(feedback === 'partly' || feedback === 'no') && <p className="sd-note">{L('คุณแก้คำตอบหรือเลือกเรื่องฝึกใหม่ได้ คำอธิบายนี้ไม่จำเป็นต้องนิยามตัวคุณ', 'You can edit your answers or choose a different practice. This description does not have to define you.')}</p>}
            <button type="button" className="sd-secondary" disabled={busy} onClick={() => { setIndex(0); setView('questions'); }}>{L('แก้คำตอบของฉัน', 'Edit my answers')}</button>
            <details>
              <summary>{L('ดูคำตอบที่ใช้คำนวณทุกข้อ', 'Review every answer behind the scores')}</summary>
              <ol className="sd-stack">
                {definition.items.map(question => (
                  <li key={question.id}>
                    <p><strong>{question.id}</strong> · {textFor(question.text, locale)}</p>
                    <p>{answerLabel(answers[question.id], locale)}{typeof answers[question.id] === 'number' ? ` (${answers[question.id]}/3)` : ''}</p>
                  </li>
                ))}
              </ol>
            </details>
          </section>

          <section className="sd-panel sd-stack">
            <h3>{L('เก็บไว้กลับมาทบทวน', 'Keep this for reflection')}</h3>
            <p className="sd-note">{L('บันทึกเฉพาะเมื่อคุณกดปุ่มด้านล่าง ผลนี้ไม่เพิ่มจำนวนลูปหรือคะแนนการเติบโตของเพื่อนร่วมทาง', 'Saved only when you choose the button below. This result does not add loops or companion growth rewards.')}</p>
            <button type="button" className="sd-primary" onClick={() => void save()} disabled={busy || !dirty}>
              {busy ? L('กำลังบันทึก…', 'Saving…') : saveState === 'saved' ? L('บันทึกแล้ว', 'Saved') : saveLabel}
            </button>
            <p role="status" aria-live="polite">{saveState === 'saved' ? L('บันทึกผลนี้แล้ว แก้คำตอบแล้วบันทึกใหม่ได้', 'This result is saved. You can edit your answers and save again.') : ''}</p>
            {saveState === 'error' && <p className="sd-error" role="alert">{L('ยังบันทึกไม่สำเร็จ คำตอบยังอยู่ในหน้านี้ ลองบันทึกอีกครั้งได้', 'Saving did not finish. Your answers are still on this screen; you can try again.')}</p>}
          </section>
        </>
      )}
    </div>
  );
}

export default DiscoveryAssessment;
