const { spawn } = require('child_process');
const fs = require('fs');

async function captureAll() {
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

  const takeSnap = async (filename) => {
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    if (snap && snap.data) {
      fs.writeFileSync(`C:/Users/USER/.gemini/antigravity/brain/7e17713a-3276-4085-aa1c-1641448f8ef2/${filename}`, Buffer.from(snap.data, 'base64'));
    }
  };

  // 1. HOME SCREEN
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1400));
  await takeSnap('preview_home_closed.png');

  // 2. HOME WITH HAMBURGER DRAWER OPEN
  await send('Runtime.evaluate', { expression: 'document.querySelector(".hamburgerIconBtn")?.click()' });
  await new Promise(r => setTimeout(r, 600));
  await takeSnap('preview_home_drawer.png');

  // Close drawer
  await send('Runtime.evaluate', { expression: 'document.querySelector(".drawerCloseBtn")?.click()' });
  await new Promise(r => setTimeout(r, 500));

  // 3. CHAT SCREEN
  await send('Runtime.evaluate', { expression: 'document.querySelectorAll(".navItem")[1]?.click()' });
  await new Promise(r => setTimeout(r, 800));
  await takeSnap('preview_chat_closed.png');

  // 4. EMERGENCY PAUSE SCREEN
  await send('Runtime.evaluate', { expression: 'document.querySelector(".sirenHeaderIconBtn")?.click()' });
  await new Promise(r => setTimeout(r, 800));
  await takeSnap('preview_pause_breathing.png');

  // Close pause back to home
  await send('Runtime.evaluate', { expression: 'document.querySelector(".closePause")?.click()' });
  await new Promise(r => setTimeout(r, 600));

  // 5. BEFORE SPEAK
  await send('Runtime.evaluate', { expression: 'document.querySelectorAll(".quickToolCard")[0]?.click()' });
  await new Promise(r => setTimeout(r, 800));
  await takeSnap('preview_before_speak.png');

  // Back to home
  await send('Runtime.evaluate', { expression: 'document.querySelector(".headerBackBtn")?.click()' });
  await new Promise(r => setTimeout(r, 600));

  // 6. PERSPECTIVE LENS
  await send('Runtime.evaluate', { expression: 'document.querySelectorAll(".quickToolCard")[1]?.click()' });
  await new Promise(r => setTimeout(r, 800));
  await takeSnap('preview_perspective.png');

  ws.close();
  chrome.kill('SIGKILL');
  console.log('All 6 QA screenshots captured successfully!');
}

captureAll().catch(console.error);
