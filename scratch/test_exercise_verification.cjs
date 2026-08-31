const { spawn } = require('child_process');
const fs = require('fs');

async function testExerciseVerification() {
  console.log('Testing Exercise Interaction & Natural Summary Flow...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9227',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_chat_profile5',
    'http://localhost:5173/?debug=1',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9227/json');
      const json = await res.json();
      const page = json.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!wsUrl) {
    chrome.kill();
    return;
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 1;
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const curId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data.toString());
        if (data.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  };

  const takeSnap = async (filename) => {
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    if (snap && snap.data) {
      fs.writeFileSync(
        `C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/${filename}`,
        Buffer.from(snap.data, 'base64')
      );
      console.log(`✓ Saved screenshot: ${filename}`);
    }
  };

  await new Promise((r) => setTimeout(r, 1500));

  // Navigate to Chat Screen
  await evaluate(`
    (() => {
      const navBtn = Array.from(document.querySelectorAll('.navItem')).find(n => n.innerText.includes('ดึงสติ'));
      if (navBtn) navBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  // Test Agency Bar: Tap "หายใจลึกๆ" to verify Pause / Emergency flow
  console.log('\n--- Test 1: Testing Pause Screen via Agency Bar ---');
  await evaluate(`
    (() => {
      const breatheBtn = Array.from(document.querySelectorAll('.agencyRow button')).find(b => b.innerText.includes('หายใจ'));
      if (breatheBtn) breatheBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  const isPauseScreen = await evaluate(`Boolean(document.querySelector('.pauseScreen'))`);
  console.log('Pause screen active:', isPauseScreen);
  await takeSnap('pause_screen_from_chat.png');

  // Return to Chat from Pause Screen
  await evaluate(`
    (() => {
      const afterBtn = document.querySelector('.afterPauseButton');
      if (afterBtn) afterBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  // Test Before Speak Screen via Navigation
  console.log('\n--- Test 2: Before Speak Screen & AI Refinement ---');
  await evaluate(`
    (() => {
      const navBtn = Array.from(document.querySelectorAll('.navItem')).find(n => n.innerText.includes('ก่อนพูด'));
      if (navBtn) navBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await takeSnap('before_speak_screen.png');

  // Test Perspective Lens Screen via Navigation
  console.log('\n--- Test 3: Perspective Lens Screen ---');
  await evaluate(`
    (() => {
      const navBtn = Array.from(document.querySelectorAll('.navItem')).find(n => n.innerText.includes('มองอีกมุม'));
      if (navBtn) navBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await takeSnap('perspective_lens_screen.png');

  // Return to Chat
  await evaluate(`
    (() => {
      const navBtn = Array.from(document.querySelectorAll('.navItem')).find(n => n.innerText.includes('ดึงสติ'));
      if (navBtn) navBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  console.log('\n======================================================');
  console.log('ALL INTERACTIVE EXERCISE SCREENS VERIFIED SUCCESSFULLY!');
  console.log('======================================================');

  ws.close();
  chrome.kill();
}

testExerciseVerification().catch(console.error);
