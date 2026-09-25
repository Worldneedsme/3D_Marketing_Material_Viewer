import * as THREE from "three";

function canvasTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function paintWood() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#b88858";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 70; i += 1) {
    const y = (i / 70) * 512 + Math.sin(i * 1.7) * 6;
    ctx.strokeStyle = `rgba(${92 + (i % 5) * 8}, ${58 + (i % 3) * 6}, ${28}, ${0.18 + (i % 4) * 0.06})`;
    ctx.lineWidth = i % 6 === 0 ? 3.2 : 1.1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(140, y + Math.sin(i) * 10, 320, y - Math.cos(i) * 8, 512, y + 4);
    ctx.stroke();
  }

  for (let k = 0; k < 5; k += 1) {
    const x = 70 + k * 90;
    const y = 80 + ((k * 97) % 340);
    const ring = ctx.createRadialGradient(x, y, 2, x, y, 28);
    ring.addColorStop(0, "rgba(74, 42, 18, 0.55)");
    ring.addColorStop(1, "rgba(74, 42, 18, 0)");
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 14, k, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvasTexture(canvas, 1.4, 1.4);
}

function paintSand() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#e6cf9e";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i += 1) {
    const shade = 180 + Math.floor(Math.random() * 60);
    ctx.fillStyle = `rgba(${shade}, ${shade - 28}, ${shade - 70}, 0.45)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 2.2, Math.random() * 1.4);
  }
  ctx.strokeStyle = "rgba(196, 164, 112, 0.35)";
  ctx.lineWidth = 1;
  for (let r = 0; r < 6; r += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 30 + r * 40);
    ctx.bezierCurveTo(80, 24 + r * 40, 160, 42 + r * 40, 256, 28 + r * 40);
    ctx.stroke();
  }
  return canvasTexture(canvas, 6, 6);
}

function paintSea() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const wash = ctx.createLinearGradient(0, 0, 0, 256);
  wash.addColorStop(0, "#1f6f92");
  wash.addColorStop(0.5, "#2e8eae");
  wash.addColorStop(1, "#49b4c4");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 18; i += 1) {
    ctx.strokeStyle = `rgba(232, 248, 250, ${0.18 + (i % 3) * 0.08})`;
    ctx.lineWidth = i % 4 === 0 ? 2 : 1;
    const y = 12 + i * 13;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      ctx.quadraticCurveTo(x + 16, y + (i % 2 === 0 ? -4 : 4), x + 32, y);
    }
    ctx.stroke();
  }
  return canvasTexture(canvas, 3, 2);
}

function paintSky() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#6eb6e0");
  sky.addColorStop(0.45, "#b9dff3");
  sky.addColorStop(0.72, "#f3d7b0");
  sky.addColorStop(1, "#f6e2c4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 7; i += 1) {
    const x = 80 + i * 140;
    const y = 70 + (i % 3) * 36;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(x, y, 70, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 36, y + 6, 48, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(canvas);
}

export function createBeachTextures() {
  return {
    wood: paintWood(),
    sand: paintSand(),
    sea: paintSea(),
    sky: paintSky(),
  };
}
