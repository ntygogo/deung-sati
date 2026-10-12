export const lineLoopFields = ['trigger','emotion_or_body','automatic_story','facts','needs','options','micro_action','reflection'] as const;
export type LineLoopFields = Partial<Record<typeof lineLoopFields[number], string>>;
export const lineLoopLabels = ['เหตุการณ์ที่กระทบใจ','ความรู้สึกหรือร่างกาย','ความคิดที่แวบขึ้นมา','สิ่งที่เกิดขึ้นจริง','สิ่งที่ต้องการ','ทางเลือกที่มองไว้','ก้าวเล็ก ๆ ที่เลือก','สิ่งที่สังเกตได้'];
export function lineNotebookText(fields: LineLoopFields) {
  return 'ลูปจากแชท LINE\n\n' + lineLoopFields.map((key,i)=>`${i+1}. ${lineLoopLabels[i]}: ${fields[key]?.trim() || 'ยังไม่ได้สำรวจ'}`).join('\n\n');
}
