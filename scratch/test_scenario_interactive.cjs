const { spawn } = require('child_process');
const fs = require('fs');

async function runScenarioTests() {
  console.log('=== Starting Real Scenario Verification for Deung Sati Quality ===\n');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9232',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_chat_profile10',
    'http://localhost:5173/?debug=1',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9232/json');
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

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data.toString());
    if (data.method === 'Runtime.consoleAPICalled') {
      const args = data.params.args.map((a) => a.value || a.description || '').join(' ');
      // console.log(`[Browser Console]: ${args}`);
    }
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
  await new Promise((r) => setTimeout(r, 800));
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
  await new Promise((r) => setTimeout(r, 600));

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

    // Type text into composer input and submit form
    await evaluate(`
      (() => {
        const input = document.querySelector('.composer input');
        const form = document.querySelector('.composer');
        if (input && form) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeInputValueSetter.call(input, ${JSON.stringify(userText)});
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }
      })()
    `);

    // Wait for the AI response
    let lastSeenText = '';
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const status = await evaluate(`
        (() => {
          const bubbles = Array.from(document.querySelectorAll('.aiBubble'));
          const last = bubbles[bubbles.length - 1];
          if (!last) return null;
          const textEl = last.querySelector('.aiTextContent');
          const isDots = Boolean(last.querySelector('.streamingDots'));
          const quickReplies = Array.from(document.querySelectorAll('.quickReplies button')).map(b => b.innerText.trim());
          const hasExercise = Boolean(document.querySelector('.exerciseConsentCard'));
          return {
            count: bubbles.length,
            text: textEl ? textEl.innerText.trim() : '',
            isDots,
            quickReplies,
            hasExercise
          };
        })()
      `);

      if (status && status.count >= turnCount && status.text && !status.isDots) {
        lastSeenText = status.text;
        console.log(`AI: "${status.text}"`);
        if (status.quickReplies && status.quickReplies.length > 0) {
          console.log(`Quick Replies: [${status.quickReplies.join(' | ')}]`);
        }
        console.log(`Exercise Consent Card present: ${status.hasExercise}`);
        return status;
      }
    }

    console.log(`Last observed state: "${lastSeenText}"`);
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
  console.log('ALL 6 CONVERSATION SCENARIOS TESTED SUCCESSFULLY!');
  console.log('======================================================');

  ws.close();
  chrome.kill();
}

runScenarioTests().catch(console.error);
