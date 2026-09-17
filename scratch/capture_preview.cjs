const { spawn } = require('child_process');
const fs = require('fs');

async function capture() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_snap_profile',
    'http://localhost:5173/?debug=1'
  ]);

  let wsUrl = '';
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const json = await res.json();
      const page = json.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (!wsUrl) {
    chrome.kill('SIGKILL');
    return;
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
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

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:5173/?debug=1' });
  await new Promise(r => setTimeout(r, 1200));

  // Click on "ดึงสติตอนนี้" to enter Chat Screen
  await send('Runtime.evaluate', { expression: 'document.querySelector("button.talkNowCard").click()' });
  await new Promise(r => setTimeout(r, 800));

  // Focus on input and insert text for Test 1
  await send('Runtime.evaluate', { expression: 'document.querySelector(".composer input").focus()' });
  await send('Input.insertText', { text: 'เขาอ่านแล้วไม่ตอบ กูจะโทรไปด่าแม่งแล้ว' });
  await new Promise(r => setTimeout(r, 300));
  await send('Runtime.evaluate', { expression: 'document.querySelector(".composer button.sendButton").click()' });

  // Wait 3.5s for AI streaming and Exercise Consent Card to render
  await new Promise(r => setTimeout(r, 3500));

  // Screenshot 1: Interactive Chat with live AI response, Exercise offer card, and Dev Debug HUD
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap1 && snap1.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_chat_interactive_real.png', Buffer.from(snap1.data, 'base64'));
  }

  // Click on "⚡ เริ่มทำแบบฝึกหัด (1–2 นาที)" or the plus button to open Exercise Modal
  await send('Runtime.evaluate', { expression: 'document.querySelector("button.launchExerciseBtn")?.click() || document.querySelector("button.plusButton").click()' });
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot 2: Interactive Exercise Modal
  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap2 && snap2.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_exercise_modal.png', Buffer.from(snap2.data, 'base64'));
  }

  ws.close();
  chrome.kill('SIGKILL');
  console.log('Chat & Exercise screenshots updated successfully!');
}

capture().catch(console.error);
