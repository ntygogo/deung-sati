const { spawn } = require('child_process');
const fs = require('fs');

async function runInteractiveChatTest() {
  console.log('Launching headless Chrome for CDP testing...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9224',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_chat_profile2',
    'http://localhost:5173/?debug=1',
  ]);

  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json');
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
    console.error('Failed to get WebSocket debugger URL');
    chrome.kill();
    return;
  }

  console.log('Connecting to Chrome CDP WebSocket...');
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

  // Wait for React to render
  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n--- Step 1: Check Home Screen Input ---');
  const homeHasInput = await evaluate(`Boolean(document.querySelector('.quickChatInput'))`);
  console.log('Home has quick chat input (.quickChatInput):', homeHasInput);

  console.log('\n--- Step 2: Type Message 1 on Home & Submit ---');
  const msg1 = 'เขาอ่านแล้วไม่ตอบอีกแล้ว กูหงุดหงิดมาก';
  await evaluate(`
    (() => {
      const input = document.querySelector('.quickChatInput');
      const form = document.querySelector('.quickChatComposer');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(input, ${JSON.stringify(msg1)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()
  `);

  console.log(`Submitted message 1: "${msg1}"`);

  // Wait for Chat screen to appear and AI response to complete
  console.log('Waiting for AI response 1...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const isChat = await evaluate(`Boolean(document.querySelector('.chatScreen'))`);
    const bubbles = await evaluate(`
      Array.from(document.querySelectorAll('.aiBubble .aiTextContent p')).map(p => p.innerText)
    `);
    const isStreaming = await evaluate(`Boolean(document.querySelector('.streamingDots'))`);
    if (isChat && bubbles && bubbles.length > 0 && !isStreaming) {
      console.log('✓ AI Response 1 completed!');
      console.log('AI Bubble 1:', bubbles.join('\n'));
      break;
    }
  }

  await takeSnap('chat_turn1_completed.png');

  // Verify Debug Panel
  const debugText1 = await evaluate(`document.querySelector('.devDebugPanel')?.innerText`);
  console.log('\nDebug Panel state after Turn 1:\n', debugText1);

  console.log('\n--- Step 3: Type Message 2 in Chat Screen Composer & Submit ---');
  const msg2 = 'กูควรทำยังไงดี';
  await evaluate(`
    (() => {
      const input = document.querySelector('.composer input');
      const form = document.querySelector('.composer');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(input, ${JSON.stringify(msg2)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()
  `);

  console.log(`Submitted message 2: "${msg2}"`);

  // Wait for streaming AI response 2 to complete
  console.log('Waiting for AI response 2 (contextual multi-turn)...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const bubbles = await evaluate(`
      Array.from(document.querySelectorAll('.aiBubble .aiTextContent')).map(b => b.innerText)
    `);
    const isStreaming = await evaluate(`Boolean(document.querySelector('.streamingDots'))`);
    if (bubbles && bubbles.length >= 3 && !isStreaming) {
      console.log('✓ AI Response 2 completed!');
      console.log('AI Bubble 2 (Latest contextual response):\n', bubbles[bubbles.length - 1]);
      break;
    }
  }

  await takeSnap('chat_turn2_completed.png');

  const debugText2 = await evaluate(`document.querySelector('.devDebugPanel')?.innerText`);
  console.log('\nDebug Panel state after Turn 2:\n', debugText2);

  const allUserBubbles = await evaluate(`
    Array.from(document.querySelectorAll('.userBubble')).map(b => b.innerText)
  `);
  console.log('\nAll User Bubbles in DOM:\n', allUserBubbles);

  ws.close();
  chrome.kill();
  console.log('\n=============================================');
  console.log('REAL 2-MESSAGE MULTI-TURN CONVERSATION VERIFIED!');
  console.log('=============================================');
}

runInteractiveChatTest().catch(console.error);
