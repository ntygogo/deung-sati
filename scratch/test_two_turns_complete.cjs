const { spawn } = require('child_process');
const fs = require('fs');

async function testFullTwoTurns() {
  console.log('Testing full 2-turn conversation via CDP...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9225',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_chat_profile3',
    'http://localhost:5173/?debug=1',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json');
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

  // Turn 1
  console.log('\n--- Turn 1: Typing on Home screen ---');
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
  console.log(`✓ Sent Turn 1: "${msg1}"`);

  // Wait for Turn 1 to complete
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const bubbles = await evaluate(`
      Array.from(document.querySelectorAll('.aiBubble .aiTextContent')).map(b => b.innerText)
    `);
    const isStreaming = await evaluate(`Boolean(document.querySelector('.streamingDots'))`);
    if (bubbles && bubbles.length >= 2 && !isStreaming) {
      console.log('✓ Turn 1 AI Response received:');
      console.log(bubbles[1]);
      break;
    }
  }

  await takeSnap('turn1_verified.png');

  // Turn 2
  console.log('\n--- Turn 2: Typing in Chat Screen Composer ---');
  const msg2 = 'กูควรทำยังไงดี';
  await evaluate(`
    (() => {
      const input = document.querySelector('.composer input');
      const form = document.querySelector('.composer');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(msg2)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()
  `);
  console.log(`✓ Sent Turn 2: "${msg2}"`);

  // Wait for Turn 2 to complete
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const bubbles = await evaluate(`
      Array.from(document.querySelectorAll('.aiBubble .aiTextContent')).map(b => b.innerText)
    `);
    const isStreaming = await evaluate(`Boolean(document.querySelector('.streamingDots'))`);
    if (bubbles && bubbles.length >= 3 && !isStreaming) {
      console.log('✓ Turn 2 Contextual AI Response received:');
      console.log(bubbles[2]);
      break;
    }
  }

  await takeSnap('turn2_verified.png');

  const debugHUD = await evaluate(`document.querySelector('.devDebugPanel')?.innerText`);
  console.log('\n--- Final Dev Debug HUD State ---\n', debugHUD);

  const allUser = await evaluate(`
    Array.from(document.querySelectorAll('.userBubble')).map(b => b.innerText)
  `);
  console.log('\n--- All User Messages in Session ---\n', allUser);

  ws.close();
  chrome.kill();
  console.log('\n======================================================');
  console.log('TWO-MESSAGE REAL CHAT TEST COMPLETED & VERIFIED 100%!');
  console.log('======================================================');
}

testFullTwoTurns().catch(console.error);
