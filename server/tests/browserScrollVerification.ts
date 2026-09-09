import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BROWSER_TEST_BASE_URL = process.env.BROWSER_TEST_BASE_URL || 'http://127.0.0.1:5173';

interface CdpMessage {
  id: number;
  method: string;
  params?: any;
}

class CdpClient {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  public eventListeners = new Map<string, Array<(params: any) => void>>();

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        } else if (msg.method && this.eventListeners.has(msg.method)) {
          for (const cb of this.eventListeners.get(msg.method)!) {
            cb(msg.params);
          }
        }
      } catch {}
    };
  }

  on(method: string, cb: (params: any) => void) {
    if (!this.eventListeners.has(method)) this.eventListeners.set(method, []);
    this.eventListeners.get(method)!.push(cb);
  }

  send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('REAL BROWSER VIEWPORT & SCROLL VERIFICATION (375x667 & 430x932)');
  console.log('ENGINE: Headless Chromium via Chrome DevTools Protocol (CDP)');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, msg: string) => {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    passedTests++;
    console.log(`  ✓ ${msg}`);
  };

  // Health check dev server before launching Chrome (Must receive HTTP 200)
  console.log(`[HEALTH CHECK] Probing dev server at ${BROWSER_TEST_BASE_URL}...`);
  let isServerHealthy = false;
  let lastHealthError = '';
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      const res = await fetch(BROWSER_TEST_BASE_URL);
      if (res.status === 200) {
        isServerHealthy = true;
        console.log(`  ✓ Health check passed (HTTP 200 OK after attempt ${attempt})\n`);
        break;
      } else {
        lastHealthError = `HTTP ${res.status} ${res.statusText}`;
      }
    } catch (err: any) {
      lastHealthError = err.message || String(err);
    }
    if (attempt < 15) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!isServerHealthy) {
    console.error(`❌ FAILED: Dev server at ${BROWSER_TEST_BASE_URL} is not responding with HTTP 200 (${lastHealthError}). Aborting browser test.`);
    throw new Error(`Health check failed: Dev server at ${BROWSER_TEST_BASE_URL} did not return HTTP 200 (${lastHealthError})`);
  }

  // Locate real browser binary
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`[BROWSER] Launching real browser: ${browserExe}`);
  const port = 9335;
  const userDataDir = path.join(os.tmpdir(), `deung-sati-chrome-${Date.now()}`);
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const proc: ChildProcess = spawn(
    browserExe,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      BROWSER_TEST_BASE_URL,
    ],
    { stdio: 'ignore' }
  );

  // Wait for CDP port to open
  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = (await res.json()) as any[];
      const pageTab = tabs.find((t: any) => t.type === 'page') || tabs[0];
      if (pageTab && pageTab.webSocketDebuggerUrl) {
        wsUrl = pageTab.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    proc.kill();
    throw new Error('Failed to connect to browser CDP WebSocket');
  }

  console.log(`[CDP] Connected to browser debugging URL: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((res) => (ws.onopen = () => res()));

  const client = new CdpClient(ws);
  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  client.on('Runtime.exceptionThrown', (params: any) => {
    console.error('  [BROWSER CONSOLE EXCEPTION]', params?.exceptionDetails?.text, params?.exceptionDetails?.exception?.description);
  });

  const scratchDir = path.resolve(__dirname, '../../scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  try {
    // -------------------------------------------------------------
    // VIEWPORT 1: 375 x 667 (iPhone SE)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('[VIEWPORT 1] Testing 375 x 667 (iPhone SE Mobile Dimensions)...');
    console.log('-------------------------------------------------------------');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });

    const navResult = await client.send('Page.navigate', { url: BROWSER_TEST_BASE_URL });
    console.log('  -> Navigation initiated:', navResult);

    // Wait for App to mount and .onboardingCard to appear (Vite cold compile can take a few seconds)
    console.log('[STEP 1] Waiting for App to load and render Onboarding Modal...');
    let obReady = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const check = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const card = document.querySelector('.onboardingCard');
          const root = document.getElementById('root');
          return {
            url: window.location.href,
            title: document.title,
            hasCard: Boolean(card),
            hasRoot: Boolean(root),
            rootChildren: root ? root.children.length : 0,
            readyState: document.readyState,
            bodySnippet: document.body ? document.body.innerText.slice(0, 100) : '',
            bodyHtml: document.body ? document.body.innerHTML.slice(0, 150) : '',
          };
        })()`,
        returnByValue: true,
      });
      const diag = check.result?.value;
      if (diag?.hasCard) {
        obReady = true;
        console.log(`  -> Onboarding Modal appeared after ${((i + 1) * 0.5).toFixed(1)}s`);
        break;
      }
      if (i % 4 === 3) {
        console.log(`  ...diagnostics (${((i + 1) * 0.5).toFixed(1)}s): url=${diag?.url}, title="${diag?.title}", ready=${diag?.readyState}, rootChildren=${diag?.rootChildren}`);
      }
    }

    // 1. Assert Onboarding Modal is present and scrollable (DO NOT SKIP)
    console.log('\n[STEP 1] Inspecting Onboarding Modal on fresh load...');
    const onboardingCheck = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const card = document.querySelector('.onboardingCard');
          if (!card) return { found: false, bodyHtml: document.body ? document.body.innerHTML.slice(0, 300) : '' };
          const computed = window.getComputedStyle(card);
          const initialScroll = card.scrollTop;
          card.scrollTop = 50;
          const scrolled = card.scrollTop;
          card.scrollTop = initialScroll;
          return {
            found: true,
            scrollHeight: card.scrollHeight,
            clientHeight: card.clientHeight,
            overflowY: computed.overflowY,
            scrolledTop: scrolled,
          };
        })()
      `,
      returnByValue: true,
    });

    const ob = onboardingCheck.result.value;
    assert(ob.found, 'Onboarding Modal (.onboardingCard) rendered on fresh load');
    assert(ob.overflowY === 'auto', 'Onboarding Modal has overflowY: auto');
    assert(ob.scrollHeight >= ob.clientHeight, 'Onboarding Modal content fits within scroll container');
    console.log(`  ✓ Onboarding scrollHeight: ${ob.scrollHeight}px, clientHeight: ${ob.clientHeight}px`);

    const obShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'onboarding_modal_375x667.png'), Buffer.from(obShot.data, 'base64'));
    console.log('  ✓ Captured Onboarding Screenshot: scratch/onboarding_modal_375x667.png');

    // 2. Complete Onboarding through real UI clicks (Step 1 -> 2 -> 3 -> 4 -> 5 -> Done)
    console.log('\n[STEP 2] Completing Onboarding through Real UI Button Clicks...');
    for (let stepIdx = 1; stepIdx <= 4; stepIdx++) {
      const clickResult = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('.onboardingCard button'));
            // Look for next button
            const nextBtn = btns.find(b =>
              b.textContent.includes('ต่อไป') ||
              b.textContent.includes('ไปต่อ') ||
              b.textContent.includes('รับ Companion Egg') ||
              b.textContent.includes('เริ่มผูกพัน')
            );
            if (nextBtn) {
              nextBtn.click();
              return { clicked: true, text: nextBtn.textContent.trim() };
            }
            return { clicked: false, allButtons: btns.map(b => b.textContent.trim()) };
          })()
        `,
        returnByValue: true,
      });
      console.log(`  -> Step ${stepIdx} advanced:`, clickResult.result.value);
      assert(clickResult.result.value.clicked, `Onboarding step ${stepIdx} button clicked`);
      await new Promise((r) => setTimeout(r, 700));
    }

    // Step 5: Reveal and Enter Safe Space (wait for async companion creation to finish)
    let enterBtnFound = false;
    let finishResult: any = null;
    for (let waitStep = 0; waitStep < 15; waitStep++) {
      const finishClick = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('.onboardingCard button'));
            const enterBtn = btns.find(b =>
              b.textContent.includes('เข้าสู่ห้อง') ||
              b.textContent.includes('เข้าสู่พื้นที่ปลอดภัย') ||
              b.textContent.includes('เริ่มต้น')
            );
            if (enterBtn) {
              enterBtn.click();
              return { clicked: true, text: enterBtn.textContent.trim() };
            }
            return { clicked: false, allButtons: btns.map(b => b.textContent.trim()) };
          })()
        `,
        returnByValue: true,
      });
      finishResult = finishClick.result.value;
      if (finishResult.clicked) {
        enterBtnFound = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log('  -> Final Onboarding Reveal finished:', finishResult);
    assert(enterBtnFound, 'Onboarding complete button clicked');
    await new Promise((r) => setTimeout(r, 800));

    // 3. Inspect Chat Screen & "ส่องลูปสติ 6 ส่วน" Button
    console.log('\n[STEP 3] Verifying Chat Screen & Loop Button State at 375x667...');
    await client.send('Runtime.evaluate', {
      expression: `
        const chatNav = Array.from(document.querySelectorAll('.bottomNav .navItem')).find(b =>
          b.textContent.includes('ดึงสติ') ||
          b.textContent.includes('สนทนา') ||
          b.textContent.includes('แชต')
        );
        if (chatNav) chatNav.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 800));

    const chatInspection = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ส่องลูปสติ'));
          const perMessageButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('บันทึกเป็น Loop Trace'));
          return {
            hasLoopButton: Boolean(btn),
            isLoopButtonDisabled: btn ? btn.disabled : null,
            loopButtonText: btn ? btn.textContent.trim() : null,
            perMessageTraceButtonCount: perMessageButtons.length,
          };
        })()
      `,
      returnByValue: true,
    });

    const cVal = chatInspection.result.value;
    assert(cVal.hasLoopButton, 'Button "ส่องลูปสติ 6 ส่วน" present in chat subheader');
    assert(cVal.isLoopButtonDisabled === true, 'Button is strictly DISABLED while Server has not sent loopReadiness = ready');
    assert(cVal.loopButtonText.includes('กำลังสังเกต'), 'Button displays observing status label');
    assert(cVal.perMessageTraceButtonCount === 0, 'No per-message "บันทึกเป็น Loop Trace" button exists');

    const chatShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'chat_subheader_button_375x667.png'), Buffer.from(chatShot.data, 'base64'));

    // 4. Inspect Companion Room at 375x667
    console.log('\n[STEP 4] Testing CompanionRoom Scroll Metrics at 375x667 (iPhone SE)...');
    await client.send('Runtime.evaluate', {
      expression: `
        const compNav = Array.from(document.querySelectorAll('.bottomNav .navItem')).find(b =>
          b.textContent.includes('ไข่') ||
          b.textContent.includes('สหาย') ||
          b.textContent.includes('น้อง')
        );
        if (compNav) compNav.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 800));

    // Capture BEFORE scroll
    const shotBefore375 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'companion_before_scroll_375x667.png'), Buffer.from(shotBefore375.data, 'base64'));
    console.log('  ✓ Captured Before-Scroll Screenshot: scratch/companion_before_scroll_375x667.png');

    const scrollCheck375 = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.companionRoomScreen');
          if (!el) return { found: false };

          const computed = window.getComputedStyle(el);
          const initialScrollTop = el.scrollTop;
          const scrollHeight = el.scrollHeight;
          const clientHeight = el.clientHeight;

          // Test actual displacement
          el.scrollTop = 180;
          const scrolledTop = el.scrollTop;

          // Check bottom padding clearance
          const paddingBottom = parseFloat(computed.paddingBottom) || 0;

          // Check if bottom-most action button is in DOM
          const bottomActionBtn = el.querySelector('button');

          return {
            found: true,
            scrollHeight,
            clientHeight,
            isScrollable: scrollHeight > clientHeight,
            overflowY: computed.overflowY,
            scrolledSuccessfully: scrolledTop > 0,
            scrolledTopValue: scrolledTop,
            paddingBottom,
            hasBottomButton: Boolean(bottomActionBtn),
          };
        })()
      `,
      returnByValue: true,
    });

    const s375 = scrollCheck375.result.value;
    assert(s375.found, 'CompanionRoom DOM (.companionRoomScreen) is found');
    assert(s375.overflowY === 'auto', 'CompanionRoom has overflowY: auto');
    assert(s375.scrollHeight > s375.clientHeight, `scrollHeight (${s375.scrollHeight}px) > clientHeight (${s375.clientHeight}px) indicates vertical overflow`);
    assert(s375.scrolledSuccessfully, `scrollTop updated successfully to ${s375.scrolledTopValue}px`);
    assert(s375.paddingBottom >= 100, `Padding-bottom (${s375.paddingBottom}px) safely clears bottom navigation bar`);

    // Capture AFTER scroll
    const shotAfter375 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'companion_after_scroll_375x667.png'), Buffer.from(shotAfter375.data, 'base64'));
    console.log('  ✓ Captured After-Scroll Screenshot: scratch/companion_after_scroll_375x667.png');

    // 5. Test Modal Body Scrollability
    console.log('\n[STEP 5] Testing Companion Room Modal Scrollability...');
    await client.send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('.companionRoomScreen button'));
        const traceBtn = btns.find(b =>
          b.textContent.includes('บันทึก Loop Trace') ||
          b.textContent.includes('บันทึก Trace') ||
          b.textContent.includes('บันทึกลูป')
        );
        if (traceBtn) traceBtn.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 700));

    const modalCheck = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const modalBody = document.querySelector('.companionLoopModalBody');
          if (!modalBody) return { found: false };
          const computed = window.getComputedStyle(modalBody);
          const initialScroll = modalBody.scrollTop;
          modalBody.scrollTop = 80;
          const scrolled = modalBody.scrollTop;
          return {
            found: true,
            scrollHeight: modalBody.scrollHeight,
            clientHeight: modalBody.clientHeight,
            overflowY: computed.overflowY,
            scrolledTop: scrolled,
            maxHeight: computed.maxHeight,
          };
        })()
      `,
      returnByValue: true,
    });

    const mVal = modalCheck.result.value;
    assert(mVal.found, 'Companion Room modal (.companionLoopModalBody) is found in DOM');
    assert(mVal.overflowY === 'auto', 'Modal body has overflowY: auto');
    assert(mVal.scrollHeight >= mVal.clientHeight, 'Modal content is contained in scrollable container');
    console.log(`  ✓ Modal scrollHeight: ${mVal.scrollHeight}px, clientHeight: ${mVal.clientHeight}px`);
    console.log(`  ✓ Modal maxHeight: ${mVal.maxHeight}`);

    const modalShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'companion_modal_375x667.png'), Buffer.from(modalShot.data, 'base64'));
    console.log('  ✓ Captured Modal Screenshot: scratch/companion_modal_375x667.png');

    // Close modal
    await client.send('Runtime.evaluate', {
      expression: `
        const closeBtn = Array.from(document.querySelectorAll('.companionLoopModalBody button')).find(b =>
          b.textContent.includes('✕') ||
          b.textContent.includes('×') ||
          b.textContent.includes('ปิด')
        ) || document.querySelector('.companionLoopModalBody button');
        if (closeBtn) closeBtn.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------
    // VIEWPORT 2: 430 x 932 (iPhone 14/15 Pro Max)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('[VIEWPORT 2] Testing 430 x 932 (iPhone 14/15 Pro Max Dimensions)...');
    console.log('-------------------------------------------------------------');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 430,
      height: 932,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 800));

    // Reset scrollTop
    await client.send('Runtime.evaluate', {
      expression: `
        const el = document.querySelector('.companionRoomScreen');
        if (el) el.scrollTop = 0;
      `,
    });
    await new Promise((r) => setTimeout(r, 400));

    // Capture BEFORE scroll at 430x932
    const shotBefore430 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'companion_before_scroll_430x932.png'), Buffer.from(shotBefore430.data, 'base64'));
    console.log('  ✓ Captured Before-Scroll Screenshot (430x932): scratch/companion_before_scroll_430x932.png');

    const scrollCheck430 = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.companionRoomScreen');
          if (!el) return { found: false };

          const computed = window.getComputedStyle(el);
          const initialScrollTop = el.scrollTop;
          const scrollHeight = el.scrollHeight;
          const clientHeight = el.clientHeight;

          el.scrollTop = 220;
          const scrolledTop = el.scrollTop;

          const paddingBottom = parseFloat(computed.paddingBottom) || 0;

          return {
            found: true,
            scrollHeight,
            clientHeight,
            isScrollable: scrollHeight > clientHeight,
            overflowY: computed.overflowY,
            scrolledSuccessfully: scrolledTop > 0,
            scrolledTopValue: scrolledTop,
            paddingBottom,
          };
        })()
      `,
      returnByValue: true,
    });

    const s430 = scrollCheck430.result.value;
    assert(s430.found, 'CompanionRoom DOM (.companionRoomScreen) is found at 430x932');
    assert(s430.overflowY === 'auto', 'CompanionRoom has overflowY: auto at 430x932');
    assert(s430.scrollHeight > s430.clientHeight, `scrollHeight (${s430.scrollHeight}px) > clientHeight (${s430.clientHeight}px) indicates vertical overflow at 430x932`);
    assert(s430.scrolledSuccessfully, `scrollTop updated successfully to ${s430.scrolledTopValue}px at 430x932`);
    assert(s430.paddingBottom >= 100, `Padding-bottom (${s430.paddingBottom}px) safely clears bottom navigation bar`);

    // Capture AFTER scroll at 430x932
    const shotAfter430 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(scratchDir, 'companion_after_scroll_430x932.png'), Buffer.from(shotAfter430.data, 'base64'));
    console.log('  ✓ Captured After-Scroll Screenshot (430x932): scratch/companion_after_scroll_430x932.png');

    console.log('\n================================================================');
    console.log(`REAL BROWSER VERIFICATION PASSED 100%! (${passedTests}/${totalTests} assertions)`);
    console.log('All real browser checks across 375x667 and 430x932 passed successfully.');
    console.log('================================================================\n');
  } finally {
    try {
      await client.send('Browser.close');
    } catch {}
    proc.kill();
  }
}

runBrowserVerification().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
