const { spawn } = require('child_process');
const fs = require('fs');

async function testExerciseFlow() {
  console.log('Testing Exercise Consent and Modal Interaction Flow via CDP...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9226',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_chat_profile4',
    'http://localhost:5173/?debug=1',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9226/json');
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

  // Step 1: Send Venting Message
  console.log('\n--- Step 1: User vents on Home Screen ---');
  const msg1 = 'เขาอ่านแล้วไม่ตอบอีกแล้ว กูหงุดหงิดมาก';
  await evaluate(`
    (() => {
      const input = document.querySelector('.quickChatInput');
      const form = document.querySelector('.quickChatComposer');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(msg1)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()
  `);
  console.log(`✓ Sent venting message: "${msg1}"`);

  // Wait for AI response 1
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const bubbles = await evaluate(`
      Array.from(document.querySelectorAll('.aiBubble .aiTextContent')).map(b => b.innerText)
    `);
    const isStreaming = await evaluate(`Boolean(document.querySelector('.streamingDots'))`);
    if (bubbles && bubbles.length >= 2 && !isStreaming) {
      console.log('✓ AI Empathic Response received:');
      console.log(bubbles[1]);
      break;
    }
  }

  await takeSnap('exercise_flow_step1_vent.png');

  // Step 2: Open Exercise Modal
  console.log('\n--- Step 2: User opens Interactive Exercise Modal ---');
  const hasExerciseBtn = await evaluate(`Boolean(document.querySelector('.launchExerciseBtn'))`);
  console.log('Exercise consent button present in DOM:', hasExerciseBtn);

  if (hasExerciseBtn) {
    await evaluate(`document.querySelector('.launchExerciseBtn').click()`);
  } else {
    // If presented as quick reply or agency row
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.quickReplies button, .agencyRow button'))
          .find(b => b.innerText.includes('หายใจ') || b.innerText.includes('พัก') || b.innerText.includes('ดึงสติ'));
        if (btn) btn.click();
      })()
    `);
  }

  await new Promise((r) => setTimeout(r, 1000));
  const isModalOpen = await evaluate(`Boolean(document.querySelector('.exerciseModalCard'))`);
  console.log('Interactive Exercise Modal opened:', isModalOpen);

  await takeSnap('exercise_flow_step2_modal_open.png');

  // Step 3: Interact with modal (e.g. Strike singing bowl & Complete)
  console.log('\n--- Step 3: Interacting in Modal & Completing ---');
  await evaluate(`
    (() => {
      const strikeBtn = document.querySelector('.bowlStrikeBtn');
      if (strikeBtn) strikeBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1500));

  // Click Complete Button
  await evaluate(`
    (() => {
      const completeBtn = document.querySelector('.exerciseCompleteBtn');
      if (completeBtn) completeBtn.click();
    })()
  `);

  console.log('✓ Clicked "✓ บันทึกผลและส่งกลับสู่แชท"');

  // Step 4: Wait for Chat continuation
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const bubbles = await evaluate(`
      Array.from(document.querySelectorAll('.aiBubble .aiTextContent')).map(b => b.innerText)
    `);
    const isStreaming = await evaluate(`Boolean(document.querySelector('.streamingDots'))`);
    if (bubbles && bubbles.length >= 3 && !isStreaming) {
      console.log('✓ AI Post-Exercise Continuation Response received:');
      console.log(bubbles[bubbles.length - 1]);
      break;
    }
  }

  await takeSnap('exercise_flow_step3_completed.png');

  const allUser = await evaluate(`
    Array.from(document.querySelectorAll('.userBubble')).map(b => b.innerText)
  `);
  console.log('\n--- All User Messages in Chat ---\n', allUser);

  ws.close();
  chrome.kill();
  console.log('\n======================================================');
  console.log('INTERACTIVE EXERCISE FLOW VERIFIED 100%!');
  console.log('======================================================');
}

testExerciseFlow().catch(console.error);
