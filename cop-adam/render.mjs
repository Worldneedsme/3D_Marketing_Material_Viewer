// Renders a scene to a vertical 1080x1920 MP4 (or stills) with headless Chromium.
//
//   node render.mjs atlama                      -> out/atlama.mp4
//   node render.mjs atlama --stills 0,2.5,6     -> out/atlama-2.5.png ...
//   node render.mjs atlama --watermark @hesabin --sessiz
//   node render.mjs atlama --ses                -> re-mix sound onto out/atlama.mp4
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { buildAudioArgs } from './audio.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const scene = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--')) || 'atlama';
const fps = Number(flag('fps', 30));
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, { recursive: true });

const server = await serve(0);
const { port } = server.address();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[page] ${m.text()}`);
});
page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));

const query = new URLSearchParams({ scene, mode: 'render', fps: String(fps) });
const watermark = flag('watermark', '');
if (watermark) query.set('watermark', watermark);
await page.goto(`http://127.0.0.1:${port}/index.html?${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const meta = await page.evaluate(() => window.__meta);
if (flag('markers', false)) console.log(meta.markers);

const shot = async (t) => {
  await page.evaluate((tt) => window.__renderAt(tt), t);
  return page.screenshot({ type: 'png' });
};

const stills = flag('stills', null);
if (flag('ses', false)) {
  // Re-mix only the sound onto an existing render, keeping the video stream.
  const src = path.join(outDir, `${scene}.mp4`);
  const tmp = path.join(outDir, `${scene}.tmp.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, ...buildAudioArgs(meta.sfx, meta.duration), '-c:v', 'copy', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
  await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  fs.renameSync(tmp, src);
  console.log(src);
} else if (stills) {
  for (const t of String(stills).split(',')) {
    const file = path.join(outDir, `${scene}-${t}.png`);
    fs.writeFileSync(file, await shot(Number(t)));
    console.log(file);
  }
} else {
  const from = Number(flag('from', 0));
  const to = Number(flag('to', meta.duration));
  const out = path.resolve(flag('out', path.join(outDir, `${scene}.mp4`)));
  const silent = flag('sessiz', false) || from > 0;
  const audio = silent ? [] : buildAudioArgs(meta.sfx, to - from);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-',
    ...audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-shortest', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  const frames = Math.round((to - from) * fps);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await shot(from + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${scene}: ${i}/${frames} kare  (${((Date.now() - started) / 1000).toFixed(0)} sn)`);
  }
  ff.stdin.end();
  await done;
  console.log(`\n${out}`);
}

await browser.close();
server.close();
