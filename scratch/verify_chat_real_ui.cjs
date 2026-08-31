const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testRealChat() {
  console.log('Starting Real Chat Browser UI verification test...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 440, height: 900, deviceScaleFactor: 2 });

  // 1. Open Home page with ?debug=1
  await page.goto('http://localhost:5173/?debug=1', { waitUntil: 'networkidle0' });
  console.log('✓ Page loaded with ?debug=1');

  // 2. Locate Home quick chat input
  const homeInputSelector = '.quickChatCard input';
  await page.waitForSelector(homeInputSelector);
  console.log('✓ Found Home quick chat input');

  // 3. Type Message 1
  const message1 = 'เขาอ่านแล้วไม่ตอบอีกแล้ว กูหงุดหงิดมาก';
  await page.type(homeInputSelector, message1, { delay: 30 });
  console.log(`✓ Typed Message 1: "${message1}"`);

  // 4. Press Enter to submit
  await page.keyboard.press('Enter');
  console.log('✓ Pressed Enter on Home screen');

  // 5. Wait for Chat screen to appear
  await page.waitForSelector('.chatScreen', { timeout: 5000 });
  console.log('✓ Navigated to Chat screen');

  // 6. Verify user bubble appears immediately
  await page.waitForSelector('.userBubble');
  const userBubbles1 = await page.$$eval('.userBubble', (els) => els.map((e) => e.innerText));
  console.log('✓ User bubbles found:', userBubbles1);

  // 7. Wait for assistant response to stream and finish
  console.log('Waiting for AI Assistant response...');
  await page.waitForFunction(
    () => {
      const bubbles = document.querySelectorAll('.aiBubble .aiTextContent p');
      return bubbles.length > 0 && Array.from(bubbles).some((p) => p.innerText.length > 10);
    },
    { timeout: 15000 }
  );

  const aiBubbles1 = await page.$$eval('.aiBubble .aiTextContent', (els) => els.map((e) => e.innerText));
  console.log('✓ AI Assistant Response 1:\n', aiBubbles1[aiBubbles1.length - 1]);

  // Take screenshot 1
  const outDir = path.resolve('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2');
  await page.screenshot({ path: path.join(outDir, 'real_chat_message1.png') });
  console.log('✓ Screenshot 1 captured: real_chat_message1.png');

  // 8. Type Message 2 in Chat Screen Composer
  const chatInputSelector = '.composer input';
  await page.waitForSelector(chatInputSelector);
  const message2 = 'กูควรทำยังไงดี';
  await page.type(chatInputSelector, message2, { delay: 30 });
  console.log(`✓ Typed Message 2 in Chat Screen: "${message2}"`);

  // 9. Click Send button in Chat Screen
  await page.click('.composer .sendButton');
  console.log('✓ Clicked Send button in Chat Screen');

  // 10. Wait for second user bubble
  await page.waitForFunction(
    () => {
      const userEls = document.querySelectorAll('.userBubble');
      return userEls.length >= 2;
    },
    { timeout: 5000 }
  );
  console.log('✓ Second user message bubble appeared in UI');

  // 11. Wait for second AI Assistant response
  console.log('Waiting for second AI response (with multi-turn context)...');
  await page.waitForFunction(
    () => {
      const aiEls = document.querySelectorAll('.aiBubble .aiTextContent');
      return aiEls.length >= 3; // initial + response 1 + response 2
    },
    { timeout: 15000 }
  );

  const allAiBubbles = await page.$$eval('.aiBubble .aiTextContent', (els) => els.map((e) => e.innerText));
  console.log('✓ AI Assistant Response 2 (Multi-turn Contextual):\n', allAiBubbles[allAiBubbles.length - 1]);

  // Check Debug HUD state
  const debugText = await page.$eval('.devDebugPanel', (el) => el.innerText);
  console.log('✓ DEV DEBUG HUD Content:\n', debugText);

  // Take screenshot 2
  await page.screenshot({ path: path.join(outDir, 'real_chat_message2.png') });
  console.log('✓ Screenshot 2 captured: real_chat_message2.png');

  await browser.close();
  console.log('\n========================================');
  console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

testRealChat().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
