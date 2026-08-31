import React, { useState, useEffect } from 'react';
import {
  EXERCISE_REGISTRY,
  type ExerciseId,
  type ExerciseResultPayload,
} from '../shared/chat-protocol/index.ts';
import { playDeepTibetanSingingBowl } from '../utils/tibetanBowlAudio.ts';

interface InteractiveExerciseModalProps {
  exerciseId: ExerciseId;
  onComplete: (payload: ExerciseResultPayload) => void;
  onClose: () => void;
  onOpenFullscreenPause?: () => void;
}

export const InteractiveExerciseModal: React.FC<InteractiveExerciseModalProps> = ({
  exerciseId,
  onComplete,
  onClose,
  onOpenFullscreenPause,
}) => {
  const def = EXERCISE_REGISTRY[exerciseId];

  // Specific state fields for exercises
  const [factText, setFactText] = useState('');
  const [storyText, setStoryText] = useState('');
  const [unknownText, setUnknownText] = useState('');

  const [rawText, setRawText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [isRefiningAI, setIsRefiningAI] = useState(false);

  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [customFeeling, setCustomFeeling] = useState('');

  const [selectedBodyPart, setSelectedBodyPart] = useState('');

  const [ifCondition, setIfCondition] = useState('');
  const [thenAction, setThenAction] = useState('');

  const [futureTrait, setFutureTrait] = useState('');
  const [repairAction, setRepairAction] = useState('');

  const [perspectiveKnown, setPerspectiveKnown] = useState('');
  const [perspectiveInferred, setPerspectiveInferred] = useState('');
  const [perspectiveOthers, setPerspectiveOthers] = useState('');
  const [perspectiveChoice, setPerspectiveChoice] = useState('');
  const [isAnalyzingPerspectiveAI, setIsAnalyzingPerspectiveAI] = useState(false);

  // 5 Senses Grounding Checklist
  const [senses5, setSenses5] = useState({
    see: 'สิ่งที่เห็นรอบตัว 5 อย่าง (โต๊ะ, แสงไฟ, แก้วน้ำ, ผนัง, มือตัวเอง)',
    touch: 'สิ่งที่สัมผัสได้ 4 อย่าง (เท้าแตะพื้น, พนักเก้าอี้, เสื้อผ้า, ลมหายใจ)',
    hear: 'เสียงที่ได้ยิน 3 เสียง (เสียงแอร์, เสียงภายนอก, เสียงลมหายใจ)',
    smell: 'กลิ่นที่ได้กลิ่น 2 อย่าง (กลิ่นห้อง, กลิ่นอากาศสะอาด)',
    taste: 'รสชาติที่รับรู้ 1 อย่าง (รสน้ำเปล่า / ในปาก)',
  });

  // Breathing Pacer State for emergency_pause
  const [breathingPhase, setBreathingPhase] = useState<0 | 1 | 2 | 3>(0);
  const [phaseSeconds, setPhaseSeconds] = useState(4);
  const [breathCyclesCompleted, setBreathCyclesCompleted] = useState(0);

  const breathingPhases = [
    { label: 'หายใจเข้า', sub: 'สูดลมหายใจเข้าช้าๆ... เติมความสงบ' },
    { label: 'ค้างไว้', sub: 'พักใจให้นิ่ง... ผ่อนคลาย' },
    { label: 'หายใจออก', sub: 'ค่อยๆ ผ่อนลมหายใจออก... ปล่อยความตึง' },
    { label: 'หยุดพัก', sub: 'อยู่กับปัจจุบัน... สบายใจ' },
  ];

  // Breathing Timer for emergency_pause
  useEffect(() => {
    if (exerciseId !== 'emergency_pause') return;

    const timer = setInterval(() => {
      setPhaseSeconds((prev) => {
        if (prev <= 1) {
          setBreathingPhase((p) => {
            const next = ((p + 1) % 4) as 0 | 1 | 2 | 3;
            if (next === 0) {
              setBreathCyclesCompleted((c) => c + 1);
              playDeepTibetanSingingBowl({ baseFreq: 216, volume: 0.6, decayTime: 8.0 });
            }
            return next;
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exerciseId]);

  // AI helper for Before Speak
  const handleRefineBeforeSpeakAI = async () => {
    if (!rawText.trim()) return;
    setIsRefiningAI(true);
    try {
      const res = await fetch('/api/filter-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMessage: rawText.trim() }),
      });
      const data = await res.json();
      if (data.refinedAlternative) {
        setRefinedText(data.refinedAlternative);
      }
    } catch (err) {
      console.warn('AI Refine error:', err);
    } finally {
      setIsRefiningAI(false);
    }
  };

  // AI helper for Perspective Lens
  const handleAnalyzePerspectiveAI = async () => {
    const textToAnalyze = perspectiveKnown.trim() || 'สถานการณ์ที่กำลังกวนใจ';
    setIsAnalyzingPerspectiveAI(true);
    try {
      const res = await fetch('/api/analyze-empathy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipType: 'คนสำคัญ',
          situation: textToAnalyze,
        }),
      });
      const data = await res.json();
      if (data.otherPerspectives && Array.isArray(data.otherPerspectives)) {
        const othersList = data.otherPerspectives.map((p: any) => `${p.title}: ${p.explanation}`).join(' | ');
        setPerspectiveOthers(othersList);
      }
    } catch (err) {
      console.warn('AI Perspective error:', err);
    } finally {
      setIsAnalyzingPerspectiveAI(false);
    }
  };

  const handleFinish = () => {
    let result: Record<string, any> = {};
    let summary_text = `ฉันได้ทำแบบฝึกหัด "${def?.title || exerciseId}" เรียบร้อยแล้ว`;

    switch (exerciseId) {
      case 'emergency_pause':
        result = {
          cyclesCompleted: breathCyclesCompleted,
          status: 'calmed_down',
        };
        summary_text = `ฉันได้ลองฝึก [พักใจฉุกเฉิน 1 นาที] และหายใจตามจังหวะแล้ว รู้สึกใจนิ่งขึ้น พร้อมคุยต่อแล้ว 🌱`;
        break;

      case 'grounding_5_senses':
        result = senses5;
        summary_text = `ฉันได้ลองฝึก [ดึงสติตาม 5 สัมผัส (5-4-3-2-1)] แล้ว รู้สึกกลับมาอยู่กับปัจจุบันมากขึ้น 🌿`;
        break;

      case 'name_the_feeling': {
        const allFeelings = [...selectedFeelings];
        if (customFeeling.trim()) allFeelings.push(customFeeling.trim());
        result = { feelings: allFeelings };
        summary_text = `ฉันได้ลองสำรวจอารมณ์ข้างในแล้ว ตอนนี้รู้สึก: [${allFeelings.join(', ') || 'สับสน / บอกไม่ถูก'}] 🌱`;
        break;
      }

      case 'body_signal':
        result = { bodyPart: selectedBodyPart || 'บริเวณร่างกาย' };
        summary_text = `ฉันได้ลองสำรวจสัญญาณร่างกายแล้ว ตอนนี้รู้สึกตึงแน่นตรง: [${selectedBodyPart || 'ร่างกาย'}] 🌿`;
        break;

      case 'before_speak':
        result = { raw: rawText, refined: refinedText };
        summary_text = `ฉันได้ลองเกลาคำพูดก่อนส่งแล้ว:\n- ข้อความเดิม: "${rawText || 'คำพูดตอนอารมณ์แรง'}"\n- ข้อความที่เกลาแล้ว: "${refinedText || 'คำพูดที่ชัดเจนและสันติ'}" 🌱`;
        break;

      case 'perspective_lens':
        result = {
          known: perspectiveKnown,
          inferred: perspectiveInferred,
          otherExplanations: perspectiveOthers,
          myChoice: perspectiveChoice,
        };
        summary_text = `ฉันได้ลองมองอีกมุมแล้ว:\n- สิ่งที่รู้จริง: "${perspectiveKnown || '-'}"\n- สิ่งที่อาจเป็นไปได้: "${perspectiveOthers || '-'}"\n- สิ่งที่ฉันเลือกได้: "${perspectiveChoice || '-'}" 🌿`;
        break;

      case 'fact_story_unknown':
        result = { fact: factText, story: storyText, unknown: unknownText };
        summary_text = `ฉันได้ลองแยกความจริงออกจากความคิดแล้ว:\n- ข้อเท็จจริง (Fact): "${factText || '-'}"\n- ความคิดปรุงแต่ง (Story): "${storyText || '-'}"\n- สิ่งที่ยังไม่รู้ (Unknown): "${unknownText || '-'}" 🌱`;
        break;

      case 'future_self_choice':
        result = { chosenTrait: futureTrait };
        summary_text = `ฉันได้เลือกตัวตนที่อยากเป็นในอนาคตคือ: "${futureTrait || 'คนที่เลือกตอบสนองอย่างมีสติ'}" 🌿`;
        break;

      case 'if_then_plan':
        result = { if: ifCondition, then: thenAction };
        summary_text = `ฉันได้วางแผนรับมือล่วงหน้า:\n- ถ้า: "${ifCondition || '-'}"\n- แล้วจะ: "${thenAction || '-'}" 🌱`;
        break;

      case 'repair_after_loop':
        result = { repairStep: repairAction, status: 'self_compassion' };
        summary_text = `ฉันได้ให้อภัยตัวเอง และเลือก 1 การกระทำเพื่อซ่อมแซมใจคือ: "${repairAction || 'ขอเวลาพักใจและดูแลตัวเอง'}" 🌿`;
        break;

      default:
        result = { status: 'completed', timestamp: new Date().toISOString() };
        summary_text = `ฉันได้ฝึกฝนเครื่องมือ "${def?.title || exerciseId}" เรียบร้อยแล้ว 🌱`;
    }

    onComplete({
      type: 'exercise_result',
      exercise_id: exerciseId,
      result,
      summary_text,
    });
  };

  if (!def) return null;

  return (
    <div className="exerciseModalBackdrop">
      <div className="exerciseModalCard">
        <div className="exerciseModalHeader">
          <div>
            <span className="exerciseCategoryBadge">{def.category}</span>
            <h3>{def.title}</h3>
            <p className="exerciseSubtitle">{def.subtitle}</p>
          </div>
          <button className="exerciseModalClose" onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </div>

        <div className="exerciseModalBody">
          <p className="exerciseDesc">{def.description}</p>

          {/* 1. Emergency Pause - Live Breathing Circle & Singing Bowl */}
          {exerciseId === 'emergency_pause' && (
            <div className="interactivePauseBox">
              <div className={`modalBreathRing phase-${breathingPhase}`}>
                <div className="modalBreathCore">
                  <small>{breathingPhases[breathingPhase].label}</small>
                  <strong>{phaseSeconds}</strong>
                  <span>วินาที</span>
                </div>
              </div>
              <p className="modalPhaseSub">{breathingPhases[breathingPhase].sub}</p>

              <div className="pauseControlsRow">
                <button
                  type="button"
                  className="bowlStrikeBtn"
                  onClick={() => playDeepTibetanSingingBowl({ baseFreq: 216, volume: 0.8, decayTime: 12.0 })}
                >
                  🔔 แตะฟังเสียงขันธิเบต
                </button>
                {onOpenFullscreenPause && (
                  <button
                    type="button"
                    className="fullscreenPauseBtn"
                    onClick={() => {
                      onClose();
                      onOpenFullscreenPause();
                    }}
                  >
                    ↗ ขยายเต็มจอ
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Grounding 5 Senses */}
          {exerciseId === 'grounding_5_senses' && (
            <div className="exerciseFormGroup">
              <label>👁️ 5 สิ่งที่สายตาเห็นในตอนนี้:</label>
              <input
                value={senses5.see}
                onChange={(e) => setSenses5({ ...senses5, see: e.target.value })}
              />

              <label>✋ 4 สิ่งที่ผิวสัมผัสรู้สึกได้:</label>
              <input
                value={senses5.touch}
                onChange={(e) => setSenses5({ ...senses5, touch: e.target.value })}
              />

              <label>👂 3 เสียงที่กำลังได้ยิน:</label>
              <input
                value={senses5.hear}
                onChange={(e) => setSenses5({ ...senses5, hear: e.target.value })}
              />

              <label>👃 2 กลิ่นที่รับรู้ได้:</label>
              <input
                value={senses5.smell}
                onChange={(e) => setSenses5({ ...senses5, smell: e.target.value })}
              />

              <label>👅 1 รสชาติในปาก:</label>
              <input
                value={senses5.taste}
                onChange={(e) => setSenses5({ ...senses5, taste: e.target.value })}
              />
            </div>
          )}

          {/* 3. Name The Feeling */}
          {exerciseId === 'name_the_feeling' && (
            <div className="exerciseFormGroup">
              <label>แตะเลือกคำที่ตรงกับความรู้สึกข้างใน (เลือกได้หลายคำ):</label>
              <div className="chipSelectionGrid">
                {[
                  'โกรธ',
                  'น้อยใจ',
                  'กังวล',
                  'เสียใจ',
                  'ผิดหวัง',
                  'สับสน',
                  'กลัวถูกทิ้ง',
                  'ไม่ปลอดภัย',
                  'เหนื่อยล้า',
                  'อึดอัด',
                  'โดดเดี่ยว',
                  'ว่างเปล่า',
                ].map((f) => {
                  const selected = selectedFeelings.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      className={`chipOption ${selected ? 'chipSelected' : ''}`}
                      onClick={() => {
                        setSelectedFeelings((prev) =>
                          selected ? prev.filter((item) => item !== f) : [...prev, f]
                        );
                      }}
                    >
                      {selected ? '✓ ' : '+ '}
                      {f}
                    </button>
                  );
                })}
              </div>

              <label style={{ marginTop: '10px' }}>หรือพิมพ์ความรู้สึกของคุณเอง:</label>
              <input
                placeholder="เช่น รู้สึกเหมือนไม่มีใครเข้าใจเราเลย..."
                value={customFeeling}
                onChange={(e) => setCustomFeeling(e.target.value)}
              />
            </div>
          )}

          {/* 4. Body Signal */}
          {exerciseId === 'body_signal' && (
            <div className="exerciseFormGroup">
              <label>ร่างกายกำลังส่งสัญญาณตึงแน่นตรงไหนชัดที่สุด?</label>
              <div className="chipSelectionGrid">
                {[
                  'หน้าอกแน่น / หายใจไม่อิ่ม',
                  'ลำคอตึง / จุกคอ',
                  'ท้องเกร็ง / ปั่นป่วน',
                  'หัวตื้อ / มึนขมับ',
                  'หัวไหล่ / คอบ่าเกร็ง',
                  'มือสั่น / ตัวสั่น',
                  'รู้สึกชา / ไร้เรี่ยวแรง',
                ].map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`chipOption ${selectedBodyPart === b ? 'chipSelected' : ''}`}
                    onClick={() => setSelectedBodyPart(b)}
                  >
                    {selectedBodyPart === b ? '✓ ' : ''}
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Before Speak - Live AI Refinement */}
          {exerciseId === 'before_speak' && (
            <div className="exerciseFormGroup">
              <label>ข้อความดิบที่อยากส่งตอนอารมณ์แรง:</label>
              <textarea
                placeholder="เช่น เออ ไม่ต้องตอบแล้วก็ได้ จะไปไหนก็ไป!"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 8px' }}>
                <button
                  type="button"
                  className="aiRefineMiniBtn"
                  onClick={handleRefineBeforeSpeakAI}
                  disabled={isRefiningAI || !rawText.trim()}
                >
                  {isRefiningAI ? 'กำลังเกลาคำด้วย AI...' : '✨ เกลาคำด้วย AI'}
                </button>
              </div>

              <div className="downArrow">↓</div>

              <label>🌱 ข้อความที่เกลาแล้ว (บอกความรู้สึก + ความต้องการโดยไม่ประชด):</label>
              <textarea
                placeholder="ข้อความที่เรียบเรียงอย่างสันติ..."
                value={refinedText}
                onChange={(e) => setRefinedText(e.target.value)}
                className="refinedBox"
              />
            </div>
          )}

          {/* 6. Perspective Lens - Live 4-Dimension Framing */}
          {exerciseId === 'perspective_lens' && (
            <div className="exerciseFormGroup">
              <label>1. สิ่งที่เรารู้ (พฤติกรรมจริงที่เกิดขึ้น):</label>
              <input
                placeholder="เช่น เขาอ่านข้อความตอน 9:00 แล้วยังไม่ตอบ"
                value={perspectiveKnown}
                onChange={(e) => setPerspectiveKnown(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 8px' }}>
                <button
                  type="button"
                  className="aiRefineMiniBtn"
                  onClick={handleAnalyzePerspectiveAI}
                  disabled={isAnalyzingPerspectiveAI || !perspectiveKnown.trim()}
                >
                  {isAnalyzingPerspectiveAI ? 'กำลังวิเคราะห์มุมมอง...' : '✨ มองอีกมุมด้วย AI'}
                </button>
              </div>

              <label>2. สิ่งที่เราแอบคิด/กังวล (แต่ยังไม่ใช่ข้อเท็จจริง):</label>
              <input
                placeholder="เช่น เขาต้องรำคาญเราแน่ๆ หรือแอบคุยกับคนอื่น"
                value={perspectiveInferred}
                onChange={(e) => setPerspectiveInferred(e.target.value)}
              />

              <label>3. ความเป็นไปได้อื่นที่ไม่เกี่ยวกับเรา:</label>
              <input
                placeholder="เช่น เขากำลังติดงานด่วน หรือแบตหมด"
                value={perspectiveOthers}
                onChange={(e) => setPerspectiveOthers(e.target.value)}
              />

              <label>4. สิ่งที่ฉันต้องการและเลือกได้ตอนนี้:</label>
              <input
                placeholder="เช่น พักวางมือถือ 30 นาที แล้วค่อยทักถามอย่างสุภาพ"
                value={perspectiveChoice}
                onChange={(e) => setPerspectiveChoice(e.target.value)}
              />
            </div>
          )}

          {/* 7. Fact / Story / Unknown */}
          {exerciseId === 'fact_story_unknown' && (
            <div className="exerciseFormGroup">
              <label>1. ข้อเท็จจริง (Fact - บันทึกวิดีโอได้):</label>
              <textarea
                placeholder="เช่น เขาอ่านข้อความแล้วยังไม่ตอบ"
                value={factText}
                onChange={(e) => setFactText(e.target.value)}
              />

              <label>2. สิ่งที่ใจปรุงแต่ง / แอบกลัว (Story):</label>
              <textarea
                placeholder="เช่น เขาไม่แคร์เราแล้ว"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
              />

              <label>3. สิ่งที่เรายังไม่รู้แน่ชัด (Unknown):</label>
              <textarea
                placeholder="เช่น เขาอาจกำลังขับรถ หรือติดธุระสำคัญ"
                value={unknownText}
                onChange={(e) => setUnknownText(e.target.value)}
              />
            </div>
          )}

          {/* 8. Future Self Choice */}
          {exerciseId === 'future_self_choice' && (
            <div className="exerciseFormGroup">
              <label>เลือกตัวตนที่คุณค่าและความภาคภูมิใจของคุณเลือกเป็น:</label>
              <div className="chipSelectionGrid">
                {[
                  'พูดตรงโดยไม่ทำร้ายความสัมพันธ์',
                  'รักษาขอบเขตตัวเองอย่างมั่นคง',
                  'ใจเย็นแต่ไม่กดทับความรู้สึก',
                  'ให้เกียรติตัวเองและไม่ลดคุณค่าตัวเอง',
                  'กล้าขอเวลาพักเมื่อใจยังไม่พร้อม',
                ].map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    className={`chipOption ${futureTrait === trait ? 'chipSelected' : ''}`}
                    onClick={() => setFutureTrait(trait)}
                  >
                    {futureTrait === trait ? '✓ ' : ''}
                    {trait}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 9. If-Then Plan */}
          {exerciseId === 'if_then_plan' && (
            <div className="exerciseFormGroup">
              <label>ถ้า (เมื่อเกิดสิ่งเร้า):</label>
              <input
                placeholder="เช่น ครั้งหน้าถ้าเขาอ่านแล้วไม่ตอบอีก..."
                value={ifCondition}
                onChange={(e) => setIfCondition(e.target.value)}
              />

              <label>แล้วจะ (พฤติกรรมหยุดสติอัตโนมัติ):</label>
              <input
                placeholder="เช่น ฉันจะวางมือถือลง หายใจลึกๆ 3 ครั้ง แล้วดื่มน้ำ 1 แก้ว ก่อนตอบ"
                value={thenAction}
                onChange={(e) => setThenAction(e.target.value)}
              />
            </div>
          )}

          {/* 10. Repair After Loop */}
          {exerciseId === 'repair_after_loop' && (
            <div className="exerciseFormGroup">
              <div className="compassionBox">
                🌱 <b>เมตตาตัวเอง:</b> พลาดแล้วรู้ตัวคือการเติบโต ไม่ใช่ความล้มเหลว
                คะแนนความพยายามไม่ได้หายไปไหน
              </div>

              <label>1 การกระทำเล็กๆ เพื่อซ่อมแซมและดูแลใจตัวเองตอนนี้:</label>
              <input
                placeholder="เช่น พิมพ์ขอโทษสั้นๆ, ขอเวลาพักใจ, ดื่มน้ำอุ่นสักแก้ว"
                value={repairAction}
                onChange={(e) => setRepairAction(e.target.value)}
              />
            </div>
          )}

          {/* 11. Generic Steps for other grounding/observer exercises */}
          {['contact_grounding', 'loop_snapshot', 'observer_view'].includes(exerciseId) && (
            <div className="exerciseStepList">
              {def.steps.map((s, idx) => (
                <div key={idx} className="exerciseStepItem">
                  <span className="stepNum">{idx + 1}</span>
                  <p>{s}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="exerciseModalFooter">
          <button type="button" className="exerciseCancelBtn" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="exerciseCompleteBtn" onClick={handleFinish}>
            ✓ บันทึกผลและส่งกลับสู่แชท
          </button>
        </div>
      </div>
    </div>
  );
};
