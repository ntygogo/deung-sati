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
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Home closed menu
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap1 && snap1.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_home_closed.png', Buffer.from(snap1.data, 'base64'));
  }

  // 2. Open Hamburger Menu on Home
  await send('Runtime.evaluate', { expression: 'document.querySelector("button.hamburgerIconBtn").click()' });
  await new Promise(r => setTimeout(r, 600));

  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap2 && snap2.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_home_drawer.png', Buffer.from(snap2.data, 'base64'));
  }

  // Close Drawer using Close button
  await send('Runtime.evaluate', { expression: 'document.querySelector("button.drawerCloseBtn").click()' });
  await new Promise(r => setTimeout(r, 400));

  // 3. Switch to Chat Screen
  await send('Runtime.evaluate', { expression: 'document.querySelector("button.talkNowCard").click()' });
  await new Promise(r => setTimeout(r, 800));

  const snap3 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap3 && snap3.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_chat_closed.png', Buffer.from(snap3.data, 'base64'));
  }

  // 4. Open Hamburger Menu on Chat Screen
  await send('Runtime.evaluate', { expression: 'document.querySelector("button.hamburgerIconBtn").click()' });
  await new Promise(r => setTimeout(r, 600));

  const snap4 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap4 && snap4.data) {
    fs.writeFileSync('C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/preview_chat_drawer.png', Buffer.from(snap4.data, 'base64'));
  }

  ws.close();
  chrome.kill('SIGKILL');
  console.log('All 4 QA screenshots captured successfully!');
}

capture().catch(console.error);
