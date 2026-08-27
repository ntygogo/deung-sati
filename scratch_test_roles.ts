import { GoogleGenAI } from '@google/genai';

const apiKey = 'AQ.Ab8RN6JhTEr6m7dIHU_Siox8oRpZJyzGe-Mg8phiX15TSROG3g';
const ai = new GoogleGenAI({ apiKey });

async function testRoles() {
  const badMessages = [
    { role: 'assistant', parts: [{ text: 'สวัสดีครับ มีอะไรให้ช่วยไหม' }] },
    { role: 'user', parts: [{ text: 'แฟนไม่สนใจ' }] },
  ];

  console.log('Testing with initial assistant message...');
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: badMessages,
    });
    console.log('Success:', res.text);
  } catch (e: any) {
    console.log('Failed as expected with initial assistant message:', e?.message || e);
  }
}

testRoles();
