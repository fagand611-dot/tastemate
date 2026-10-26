// "Save as image" for your bag and your room: draws what's on screen onto a
// 1080×1350 card (Instagram's portrait size) with the captions and the
// reflection, then opens the share sheet or downloads a PNG.

const W = 1080;
const H = 1350;
const MAROON = '#3a3633';
const INK = '#1d1b19';
const PAPER = '#faf7f3';

/** An on-screen SVG as an image the canvas can draw. */
function svgImage(svg) {
  const copy = svg.cloneNode(true);
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Couldn’t draw the picture'));
    img.src = src;
  });
}

/** Text over several lines, centred on x; returns the y after the last line. */
function wrap(ctx, text, x, y, width, lineHeight, maxLines = 3) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  shown.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + shown.length * lineHeight;
}

function titleCard(ctx, small, big, y) {
  ctx.font = '600 44px Inter, system-ui, sans-serif';
  const bw = Math.max(420, ctx.measureText(big.toUpperCase()).width + big.length * 8 + 80);
  ctx.fillStyle = PAPER;
  ctx.fillRect((W - bw) / 2, y, bw, 120);
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = 2;
  ctx.strokeRect((W - bw) / 2 + 8, y + 8, bw - 16, 104);
  ctx.fillStyle = MAROON;
  ctx.textAlign = 'center';
  ctx.font = 'italic 500 28px "Playfair Display", Georgia, serif';
  ctx.fillText(small, W / 2, y + 46);
  ctx.font = '600 40px Inter, system-ui, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  ctx.fillText(big.toUpperCase(), W / 2, y + 94);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function footer(ctx, reflection, title, reflectionY = H - 120) {
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = 'italic 500 30px "Playfair Display", Georgia, serif';
  if (reflection) wrap(ctx, reflection, W / 2, reflectionY, W - 160, 40, 2);
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  ctx.fillStyle = MAROON;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.fillText(`TASTEMATE${title ? ` · ${title.toUpperCase()}` : ''}`, W / 2, H - 36);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

async function drawBag(ctx, root, { items, name, reflection, title }) {
  ctx.fillStyle = '#f3e3d8';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  titleCard(ctx, 'The contents of', `${name}’s bag`, 64);
  const tote = await svgImage(root.querySelector('.knoll-tote svg'));
  const things = await Promise.all([...root.querySelectorAll('.knoll-item svg')].map(svgImage));
  // A 3×3 grid with the tote in the middle cell.
  const cells = [0, 1, 2, 3, 5, 6, 7, 8];
  const cw = (W - 120) / 3;
  const ch = 300;
  const top = 220;
  const at = (cell) => [60 + (cell % 3) * cw, top + Math.floor(cell / 3) * ch];
  const [tx, ty] = at(4);
  ctx.drawImage(tote, tx + (cw - 200) / 2, ty + 20, 200, 200);
  items.slice(0, 8).forEach((x, i) => {
    const [cx, cy] = at(cells[i]);
    ctx.drawImage(things[i], cx + (cw - 150) / 2, cy, 150, 150);
    ctx.textAlign = 'center';
    ctx.fillStyle = MAROON;
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.fillText(`NO. ${i + 1}`, cx + cw / 2, cy + 180);
    ctx.fillStyle = INK;
    ctx.font = 'italic 500 24px "Playfair Display", Georgia, serif';
    wrap(ctx, x.caption, cx + cw / 2, cy + 212, cw - 30, 30, 2);
  });
  footer(ctx, reflection, title);
}

async function drawRoom(ctx, root, { reflection, title }) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const scene = await svgImage(root.querySelector('.room-scene'));
  ctx.fillStyle = MAROON;
  ctx.fillRect(30, 30, W - 60, (W - 60) * 520 / 800 + 20);
  ctx.drawImage(scene, 40, 40, W - 80, (W - 80) * 520 / 800);
  const y = 40 + (W - 80) * 520 / 800 + 70;
  const keyItems = [...root.querySelectorAll('.room-key li')].map((li) => li.textContent.replace(/^\d+/, '').trim());
  const half = Math.ceil(keyItems.length / 2);
  keyItems.forEach((text, i) => {
    const col = i < half ? 0 : 1;
    const x = 70 + col * 480;
    const yy = y + (i % half) * 76;
    ctx.fillStyle = MAROON;
    ctx.beginPath();
    ctx.arc(x + 16, yy - 9, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.fillText(String(i + 1), x + 16, yy - 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = 'italic 500 24px "Playfair Display", Georgia, serif';
    wrap(ctx, text, x + 46, yy, 400, 30, 2);
  });
  footer(ctx, reflection, title, Math.min(H - 120, y + half * 76 + 60));
}

/** Make the card for the picture on screen, then share or download it. */
export async function saveCollage(root, view, data) {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await (view === 'bag' ? drawBag : drawRoom)(ctx, root, data);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], `tastemate-${view}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: view === 'bag' ? `What’s in ${data.name}’s bag` : `${data.name}’s room` });
      return 'shared';
    } catch {
      // Closed the share sheet: fall through to a download.
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
