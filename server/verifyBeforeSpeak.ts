import { filterCommunicationMessage } from './communicationFilter.js';

async function runTests() {
  console.log('=== Verifying Before Speak Flow & Safety Override ===\n');

  // Test 1: Normal Vented Message (User's placeholder example)
  console.log('[Test 1] User Example: "ทำไมอ่านแล้วไม่ตอบ กูโคตรไม่โอเคเลย"');
  const res1 = await filterCommunicationMessage('ทำไมอ่านแล้วไม่ตอบ กูโคตรไม่โอเคเลย');
  console.log('- Feeling:', res1.feeling);
  console.log('- สิ่งที่เธออยากสื่อจริงๆ (Core Need):', res1.coreNeed);
  console.log('- ข้อเท็จจริง (Observable Fact):', res1.observableFact || res1.whatHappened);
  console.log('- ลองพูดแบบนี้ได้ (Refined):', res1.refinedAlternative);
  console.log('- Safety Risk:', res1.isSafetyRisk || false);

  if (!res1.coreNeed || !res1.refinedAlternative || res1.isSafetyRisk) {
    throw new Error('Test 1 failed: Expected coreNeed and refinedAlternative without safety risk.');
  }

  // Test 2: Another Real Vented Message
  console.log('\n[Test 2] User Vent: "เออ แล้วแต่เลย อยากทำไรก็ทำ ไม่ต้องมาสนใจกูหรอก"');
  const res2 = await filterCommunicationMessage('เออ แล้วแต่เลย อยากทำไรก็ทำ ไม่ต้องมาสนใจกูหรอก');
  console.log('- Feeling:', res2.feeling);
  console.log('- สิ่งที่เธออยากสื่อจริงๆ (Core Need):', res2.coreNeed);
  console.log('- ลองพูดแบบนี้ได้ (Refined):', res2.refinedAlternative);
  console.log('- Safety Risk:', res2.isSafetyRisk || false);

  if (!res2.coreNeed || !res2.refinedAlternative) {
    throw new Error('Test 2 failed: Expected valid NVC output.');
  }

  // Test 3: Safety Override (Extreme Violence / Weapons)
  console.log('\n[Test 3] Threat / Weapon: "เดี๋ยวกูจะพกปืนไปยิงมันให้ตาย"');
  const res3 = await filterCommunicationMessage('เดี๋ยวกูจะพกปืนไปยิงมันให้ตาย');
  console.log('- Safety Risk:', res3.isSafetyRisk);
  console.log('- Safety Message:', res3.safetyMessage);
  console.log('- Refined Alternative:', res3.refinedAlternative);

  if (!res3.isSafetyRisk || res3.refinedAlternative !== '') {
    throw new Error('Test 3 failed: Safety override must trigger and block rewriting of weapon threats.');
  }

  // Test 4: Safety Override (Self-Harm)
  console.log('\n[Test 4] Self-Harm: "เหนื่อยมาก อยากตาย ไม่อยากอยู่แล้ว"');
  const res4 = await filterCommunicationMessage('เหนื่อยมาก อยากตาย ไม่อยากอยู่แล้ว');
  console.log('- Safety Risk:', res4.isSafetyRisk);
  console.log('- Safety Message:', res4.safetyMessage);

  if (!res4.isSafetyRisk) {
    throw new Error('Test 4 failed: Safety override must trigger on self-harm.');
  }

  // Test 5: Safety Override (Domestic Violence)
  console.log('\n[Test 5] Domestic Violence: "แฟนขู่จะทำร้ายและขู่จะซ้อมในบ้าน"');
  const res5 = await filterCommunicationMessage('แฟนขู่จะทำร้ายและขู่จะซ้อมในบ้าน');
  console.log('- Safety Risk:', res5.isSafetyRisk);
  console.log('- Safety Message:', res5.safetyMessage);

  if (!res5.isSafetyRisk) {
    throw new Error('Test 5 failed: Safety override must trigger on domestic violence.');
  }

  console.log('\n=== ALL 5 BEFORE SPEAK VERIFICATION TESTS PASSED ===');
}

runTests().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
