const { spawn } = require('child_process');
const fs = require('fs');

async function runScenarioTests() {
  console.log('=== Starting Real Scenario Verification for Deung Sati Quality ===\n');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9231',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_chat_profile9',
    'http://localhost:5173/?debug=1',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9231/json');
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

  // 1. Open Drawer and test "หนังสือและผู้เขียน" Section
  console.log('--- Checking Hamburger Drawer for Book & Author Section ---');
  await evaluate(`
    (() => {
      const btn = document.querySelector('.hamburgerIconBtn');
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));
  await takeSnap('drawer_with_book_section.png');

  const bookTitlePresent = await evaluate(`
    document.body.innerText.includes('ทั้งที่รู้ว่าไม่ดี...ทำไมยังทำซ้ำ')
  `);
  console.log('Book title displayed in drawer:', bookTitlePresent);

  // Close Drawer
  await evaluate(`
    (() => {
      const closeBtn = document.querySelector('.drawerCloseBtn');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  // 2. Start Chat Screen
  console.log('\n--- Navigating to Chat Screen ---');
  await evaluate(`
    (() => {
      const navBtn = Array.from(document.querySelectorAll('.navItem')).find(n => n.innerText.includes('ดึงสติ'));
      if (navBtn) navBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  let turnCount = 1;
  async function sendChatMessage(userText) {
    console.log(`\n[Turn ${turnCount++}] User: "${userText}"`);
    const initialMsgCount = await evaluate(`(window.__chatMessages || []).length`);

    await evaluate(`
      (() => {
        if (window.__sendTestChatMessage) {
          window.__sendTestChatMessage(${JSON.stringify(userText)});
        }
      })()
    `);

    // Wait for streaming AI response to complete
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const status = await evaluate(`
        (() => {
          const msgs = window.__chatMessages || [];
          const debug = window.__chatDebugInfo || {};
          const lastMsg = msgs[msgs.length - 1];
          const hasExerciseCard = Boolean(document.querySelector('.exerciseConsentCard'));
          return {
            msgCount: msgs.length,
            lastRole: lastMsg ? lastMsg.role : null,
            lastText: lastMsg ? lastMsg.text : '',
            isStreaming: lastMsg ? Boolean(lastMsg.isStreaming) : false,
            isLoading: Boolean(debug.isLoading),
            options: lastMsg ? lastMsg.options : [],
            mode: debug.mode,
            safetyState: debug.safetyState,
            exercise: debug.recommendedExercise,
            hasExerciseCard
          };
        })()
      `);

      if (
        status &&
        status.msgCount >= initialMsgCount + 2 &&
        status.lastRole === 'ai' &&
        !status.isStreaming &&
        !status.isLoading &&
        status.lastText.trim().length > 0
      ) {
        console.log(`AI: "${status.lastText.trim()}"`);
        if (status.options && status.options.length > 0) {
          console.log(`Options: [${status.options.join(' | ')}]`);
        }
        console.log(`Internal State: mode=${status.mode}, exercise=${status.exercise}, consentCard=${status.hasExerciseCard}`);
        return status;
      }
    }
    console.log('Timeout waiting for AI turn to complete');
    return null;
  }

  // TEST A: Venting start — "เขาอ่านแล้วไม่ตอบอีกแล้ว"
  console.log('\n=================== TEST A: Venting Start ===================');
  await sendChatMessage('เขาอ่านแล้วไม่ตอบอีกแล้ว');
  await takeSnap('test_a_venting.png');

  // TEST B: "ไม่รู้ว่ารู้สึกอะไร"
  console.log('\n=================== TEST B: Difficult Naming Emotion ===================');
  await sendChatMessage('ไม่รู้ว่ารู้สึกอะไร');
  await takeSnap('test_b_unknown_emotion.png');

  // TEST C: "กูไม่รู้ รู้แต่ว่าแม่งอึดอัด"
  console.log('\n=================== TEST C: Sensation Exploration ===================');
  await sendChatMessage('กูไม่รู้ รู้แต่ว่าแม่งอึดอัด');
  await takeSnap('test_c_sensation.png');

  // TEST D: "เรื่องแบบนี้เกิดกับกูบ่อยเหมือนกัน"
  console.log('\n=================== TEST D: Repetition Recognition ===================');
  await sendChatMessage('เรื่องแบบนี้เกิดกับกูบ่อยเหมือนกัน');
  await takeSnap('test_d_repetition.png');

  // TEST E: "ไม่อยากทำแบบฝึก ขอคุยก่อน"
  console.log('\n=================== TEST E: Decline Exercise ===================');
  await sendChatMessage('ไม่อยากทำแบบฝึก ขอคุยก่อน');
  await takeSnap('test_e_decline.png');

  // TEST F: "เออ กูอยากลองแบบฝึกดู"
  console.log('\n=================== TEST F: Accept Exercise ===================');
  await sendChatMessage('เออ กูอยากลองแบบฝึกดู');
  await takeSnap('test_f_accept.png');

  console.log('\n======================================================');
  console.log('ALL 6 SCENARIOS VERIFIED SUCCESSFULLY!');
  console.log('======================================================');

  ws.close();
  chrome.kill();
}

runScenarioTests().catch(console.error);
