import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Download, Share2, X } from 'lucide-react';
import type { CompanionAppearance } from '../shared/companionAppearance';
import './CompanionShareCard.css';

interface CompanionShareCardProps {
  appearance: CompanionAppearance;
  /** Capture the current pose from the live renderer as a transparent PNG. */
  capture: () => Promise<string>;
  displayName?: string;
}

interface PreparedPortrait {
  url: string;
  file: File;
  canShare: boolean;
}

const FONT = '"Companion Thai", "Noto Sans Thai", "Sarabun", "Leelawadee UI", Tahoma, sans-serif';

function mixColor(hex: string, white: number): string {
  const valid = /^#[\da-f]{6}$/i.test(hex) ? hex : '#F4BACD';
  const values = [1, 3, 5].map(index => Math.round(parseInt(valid.slice(index, index + 2), 16) * (1 - white) + 255 * white));
  return `rgb(${values.join(',')})`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * .14, y - size * .14, x + size, y);
  ctx.quadraticCurveTo(x + size * .14, y + size * .14, x, y + size);
  ctx.quadraticCurveTo(x - size * .14, y + size * .14, x - size, y);
  ctx.quadraticCurveTo(x - size * .14, y - size * .14, x, y - size);
  ctx.fill();
}

function fittedText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, maxWidth: number, weight = 400) {
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 24) {
    ctx.font = `${weight} ${--fontSize}px ${FONT}`;
  }
  ctx.fillText(text, 540, y, maxWidth);
}

async function makePortrait(capture: string, appearance: CompanionAppearance, name: string): Promise<Blob> {
  if (!capture.startsWith('data:image/png')) throw new Error('Invalid portrait capture');
  const model = new Image();
  model.src = capture;
  await model.decode();
  // Request the bundled Thai and Latin faces explicitly. Canvas text does not
  // trigger a CSS font download, and fonts.ready can resolve before these faces
  // are used. Keep the exported card readable even when external fonts fail.
  const fonts = await Promise.all([
    document.fonts.load('400 28px "Companion Thai"', 'เพื่อนร่วมทาง Deung Sati'),
    document.fonts.load('600 56px "Companion Thai"', 'น้องดึงสติ Deung Sati'),
  ]);
  if (fonts.some(faces => faces.length === 0)) throw new Error('Portrait font is unavailable');

  // Trim the transparent renderer margin so the real model remains prominent in
  // both portrait and landscape viewports. The source pixels are never recolored.
  const source = document.createElement('canvas');
  source.width = model.naturalWidth;
  source.height = model.naturalHeight;
  const sourceContext = source.getContext('2d');
  if (!sourceContext) throw new Error('Canvas is unavailable');
  sourceContext.drawImage(model, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  let left = source.width, top = source.height, right = 0, bottom = 0;
  for (let y = 0; y < source.height; y += 2) {
    for (let x = 0; x < source.width; x += 2) {
      if (pixels[(y * source.width + x) * 4 + 3] > 12) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right <= left || bottom <= top) throw new Error('The model has not rendered yet');
  left = Math.max(0, left - 10); top = Math.max(0, top - 10);
  right = Math.min(source.width, right + 12); bottom = Math.min(source.height, bottom + 12);

  const card = document.createElement('canvas');
  card.width = 1080; card.height = 1350;
  const ctx = card.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const { body, secondary, lamp } = appearance.palette;
  const background = ctx.createLinearGradient(90, 0, 990, 1350);
  background.addColorStop(0, mixColor(body, .62));
  background.addColorStop(.48, '#fff7f0');
  background.addColorStop(1, mixColor(secondary, .53));
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  // Pearlescent light behind the portrait, with a fine gallery-like border.
  const halo = ctx.createRadialGradient(535, 625, 30, 540, 660, 555);
  halo.addColorStop(0, '#fffffffa');
  halo.addColorStop(.55, '#ffffffa0');
  halo.addColorStop(1, '#ffffff00');
  ctx.fillStyle = halo; ctx.fillRect(0, 140, 1080, 1080);
  ctx.strokeStyle = '#ffffffbb'; ctx.lineWidth = 2;
  roundedRect(ctx, 34, 34, 1012, 1282, 54); ctx.stroke();
  ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = 1;
  roundedRect(ctx, 44, 44, 992, 1262, 47); ctx.stroke();

  ctx.fillStyle = '#71566f'; ctx.textAlign = 'left';
  ctx.font = 'italic 35px Georgia, serif';
  ctx.fillText('Deung Sati', 89, 112);
  ctx.textAlign = 'right'; ctx.font = `400 22px ${FONT}`;
  ctx.fillStyle = '#8d7488'; ctx.fillText('ช่วงเวลาเล็ก ๆ ของเรา', 991, 108);
  ctx.textAlign = 'center'; ctx.fillStyle = '#947389';
  fittedText(ctx, 'เพื่อนร่วมทางของฉัน', 210, 27, 820);

  ctx.save();
  ctx.translate(540, 650); ctx.rotate(-.22);
  ctx.strokeStyle = '#ffffffbb'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 401, 348, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ae88ac2a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 424, 372, 0, .12, Math.PI * 1.56); ctx.stroke();
  ctx.restore();

  // Deliberately sparse details frame the companion without covering its face.
  const ornaments = [[146, 424, 17], [903, 378, 23], [922, 831, 13], [176, 932, 20], [790, 984, 9]];
  ctx.fillStyle = mixColor(lamp, .12);
  for (const [x, y, size] of ornaments) sparkle(ctx, x, y, size);
  ctx.fillStyle = '#ffffffcf';
  for (const [x, y, radius] of [[198, 352, 6], [864, 476, 4], [139, 805, 7], [934, 730, 5], [280, 1011, 4]]) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }

  const ground = ctx.createRadialGradient(540, 974, 16, 540, 974, 298);
  ground.addColorStop(0, '#ad8ca333'); ground.addColorStop(1, '#ad8ca300');
  ctx.save(); ctx.translate(0, 739); ctx.scale(1, .24);
  ctx.fillStyle = ground; ctx.fillRect(180, 670, 720, 590); ctx.restore();

  const sw = right - left, sh = bottom - top;
  const scale = Math.min(864 / sw, 770 / sh);
  const width = sw * scale, height = sh * scale;
  ctx.drawImage(source, left, top, sw, sh, (1080 - width) / 2, 640 - height / 2, width, height);

  ctx.textAlign = 'center'; ctx.fillStyle = '#5c405e';
  fittedText(ctx, name, 1132, 56, 884, 600);
  ctx.fillStyle = '#84677f';
  fittedText(ctx, `${appearance.palette.label}  ·  ${appearance.traits.pattern.label}`, 1185, 26, 860);
  ctx.fillStyle = '#987c91';
  fittedText(ctx, 'เติบโตไปด้วยกัน ทีละวัน', 1257, 24, 850);

  return new Promise((resolve, reject) => card.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to save portrait')), 'image/png'));
}

export default function CompanionShareCard({ appearance, capture, displayName }: CompanionShareCardProps) {
  const [busy, setBusy] = useState(false);
  const [portrait, setPortrait] = useState<PreparedPortrait | null>(null);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const titleId = useId();
  const hintId = useId();
  const name = displayName?.trim() || 'น้องดึงสติ';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!portrait) return;
    dialogRef.current?.showModal();
    return () => {
      URL.revokeObjectURL(portrait.url);
      triggerRef.current?.focus();
    };
  }, [portrait]);

  async function prepare() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const snapshot = await capture();
      const blob = await makePortrait(snapshot, appearance, name);
      if (!mounted.current) return;
      const filename = `deung-sati-${appearance.identity.replace(/[^a-z0-9-]/gi, '').slice(0, 32)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
      setPortrait({ url: URL.createObjectURL(blob), file, canShare });
    } catch {
      if (mounted.current) setError('ยังเก็บภาพไม่สำเร็จ รอให้น้องปรากฏครบแล้วลองอีกครั้งนะ');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function share() {
    if (!portrait) return;
    setError('');
    try {
      // File sharing runs only from this explicit click, preserving user choice
      // of the destination and leaving all posting to the native share sheet.
      await navigator.share({ files: [portrait.file], title: name, text: 'เพื่อนตัวน้อยของฉันจาก Deung Sati' });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError('แชร์จากเครื่องนี้ไม่สำเร็จ กดดาวน์โหลดรูปแทนได้เลย');
    }
  }

  return <div className="companion-share" style={{ '--companion-share-tint': appearance.palette.body } as CSSProperties}>
    <button ref={triggerRef} type="button" className="companion-share-trigger" onClick={() => { void prepare(); }} disabled={busy} aria-busy={busy}>
      <Camera size={17} aria-hidden="true" /> {busy ? 'กำลังเก็บภาพน้อง…' : 'บันทึกรูปน้อง'}
    </button>
    {error && !portrait && <p className="companion-share-error" role="alert">{error}</p>}
    {portrait && createPortal(<dialog ref={dialogRef} className="companion-share-dialog" aria-labelledby={titleId} aria-describedby={hintId}
      onCancel={event => { event.preventDefault(); setPortrait(null); }} onClose={() => setPortrait(null)}
      onClick={event => { if (event.target === event.currentTarget) setPortrait(null); }}>
      <div className="companion-share-panel">
        <div className="companion-share-heading">
          <div><p>เก็บความน่ารักวันนี้</p><h2 id={titleId}>รูปของ{name}</h2></div>
          <button type="button" className="companion-share-close" aria-label="ปิดรูปน้อง" onClick={() => setPortrait(null)} autoFocus><X size={20} /></button>
        </div>
        <img className="companion-share-preview" src={portrait.url} alt={`ภาพ ${name} ในกรอบสี ${appearance.palette.label}`} />
        <p id={hintId} className="companion-share-hint">บนมือถือ แตะรูปค้างไว้เพื่อบันทึกได้ด้วย</p>
        {error && <p className="companion-share-error" role="alert">{error}</p>}
        <div className="companion-share-actions">
          <a className="companion-share-download" href={portrait.url} download={portrait.file.name}><Download size={17} aria-hidden="true" /> ดาวน์โหลดรูป</a>
          {portrait.canShare && <button type="button" className="companion-share-send" onClick={() => { void share(); }}><Share2 size={17} aria-hidden="true" /> แชร์ให้เพื่อน</button>}
        </div>
      </div>
    </dialog>, document.body)}
  </div>;
}
