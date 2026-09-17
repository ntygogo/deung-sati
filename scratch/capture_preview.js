const { spawn } = require('child_process');
const fs = require('fs');

async function capture() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\USER\\.gemini\\antigravity\\scratch\\chrome_snap_profile',
    'http://localhost:5173/'
  ]);

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
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
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1200));

  // Screenshot Home
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap1 && snap1.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_home_updated.png', Buffer.from(snap1.data, 'base64'));
  }

  // Navigate to Chat
  await send('Runtime.evaluate', { expression: 'document.querySelectorAll("button.navItem")[1].click()' });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot Chat
  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap2 && snap2.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_chat_updated.png', Buffer.from(snap2.data, 'base64'));
  }

  ws.close();
  chrome.kill('SIGKILL');
  console.log('Screenshots captured successfully!');
}

capture().catch(console.error);
