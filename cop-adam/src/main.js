import { World } from './world.js';

const params = new URLSearchParams(location.search);
const sceneName = params.get('scene') || 'atlama';
const mode = params.get('mode') || 'preview';
const fps = Number(params.get('fps') || 30);
const width = Number(params.get('w') || 1080);
const height = Number(params.get('h') || 1920);

const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
for (const el of [stage, canvas]) {
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
}
// Scenes may paint text into textures while building, so fonts come first.
await document.fonts.load('700 46px Pixel');
const world = new World(canvas, stage, { width, height });
const { default: build } = await import(`./scenes/${sceneName}.js`);
const scene = build(world, params);
world.setWatermark(params.get('watermark') || '');

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

window.__meta = { duration: scene.duration, fps, sfx: scene.sfx || [], markers: scene.markers || {} };
window.__renderAt = async (t) => {
  world.render(t);
  await nextFrame();
};
window.__ready = true;

if (mode === 'preview') {
  const fit = () => {
    const s = Math.min(innerWidth / width, innerHeight / height);
    stage.style.transform = `translate(${(innerWidth - width * s) / 2}px, 0) scale(${s})`;
  };
  addEventListener('resize', fit);
  fit();
  const fixed = params.get('t');
  const start = performance.now();
  const loop = () => {
    const t = fixed !== null ? Number(fixed) : ((performance.now() - start) / 1000) % scene.duration;
    world.render(t);
    requestAnimationFrame(loop);
  };
  loop();
}
