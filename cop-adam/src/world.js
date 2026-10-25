import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, mulberry32, smoothstep } from './math.js';

export const WIDTH = 1080;
export const HEIGHT = 1920;
const BG = 0x060608;
const MAX_RIPPLES = 6;

const WaterShader = {
  name: 'WaterReflector',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    time: { value: 0 },
    swell: { value: 1 },
    ripples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float swell;
    uniform vec4 ripples[${MAX_RIPPLES}];
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 off = vec2(0.0);
      // Slow swell: rows of waves running towards the camera.
      float w = sin(vWorld.z * 7.0 + time * 1.6 + sin(vWorld.x * 1.1 + time * 0.3) * 1.4);
      w += 0.55 * sin(vWorld.z * 17.0 - time * 2.1 + vWorld.x * 0.8);
      off.x += w * 0.008 * swell;
      off.y += sin(vWorld.x * 2.3 + vWorld.z * 3.0 + time * 0.9) * 0.003 * swell;
      float foam = 0.0;
      for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = ripples[i];
        float age = time - r.z;
        if (age > 0.0 && age < 6.0) {
          vec2 d = vWorld.xz - r.xy;
          float dist = length(d);
          float front = age * 1.6;
          float env = exp(-pow((dist - front) * 2.2, 2.0)) * exp(-age * 0.7) * r.w;
          off += (d / (dist + 0.001)) * env * 0.035 * sin(dist * 16.0 - age * 9.0);
          foam += env * 0.5 * max(0.0, sin(dist * 16.0 - age * 9.0));
        }
      }
      vec4 uv = vUv;
      uv.xy += off * uv.w;
      vec3 base = texture2DProj(tDiffuse, uv).rgb;
      gl_FragColor = vec4(base * color + vec3(0.18) * foam, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

// Scene, lights, water, splashes and the 2D text overlay. Scenes build on top.
export class World {
  constructor(canvas, stage, { width = WIDTH, height = HEIGHT } = {}) {
    this.stage = stage;
    this.width = width;
    this.height = height;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 26, 52);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.28;
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 200);

    scene.add(new THREE.HemisphereLight(0x9aa3b5, 0x050505, 0.35));
    const key = new THREE.DirectionalLight(0xfff4e8, 2.6);
    key.position.set(-6, 14, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 50;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 3;
    scene.add(key);
    this.key = key;
    const rim = new THREE.DirectionalLight(0xb8c8ff, 1.2);
    rim.position.set(5, 8, -10);
    scene.add(rim);

    this.mat = {
      figure: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.32, metalness: 0, emissive: 0x1c1c1c }),
      metal: new THREE.MeshStandardMaterial({ color: 0xa9adb5, roughness: 0.42, metalness: 0.35 }),
      board: new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.5, metalness: 0.05 }),
      red: new THREE.MeshStandardMaterial({ color: 0xd4362a, roughness: 0.45, emissive: 0x3a0804 }),
    };

    this.updaters = [];
    this.labels = [];
    this.particles = {};
    this.ripples = 0;
    this.water = null;
    this.time = 0;
    this.initOverlay();
  }

  setCamera({ pos, target, fov = 35 }) {
    this.camera.fov = fov;
    this.camera.position.set(...pos);
    this.camera.lookAt(new THREE.Vector3(...target));
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  onUpdate(fn) {
    this.updaters.push(fn);
  }

  // ---- water -------------------------------------------------------------

  // `swell` scales the idle waves; a small value gives a wet, polished floor.
  makeWater({ y = 0, tint = 0.5, swell = 1 } = {}) {
    const water = new Reflector(new THREE.PlaneGeometry(90, 90), {
      textureWidth: this.width / 2,
      textureHeight: this.height / 2,
      clipBias: 0.003,
      color: new THREE.Color(tint, tint, tint * 1.04),
      shader: WaterShader,
    });
    water.material.uniforms.ripples.value = WaterShader.uniforms.ripples.value.map((v) => v.clone());
    water.material.uniforms.swell.value = swell;
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, y, -20);
    this.scene.add(water);
    this.water = water;

    this.makeParticles('drops', new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0x555555 }));
    return water;
  }

  // A splash at (x, z) hitting the water at time t0. Strength ~1 for a clean
  // dive, higher for belly flops.
  addSplash(x, z, t0, strength = 1, seed = 1) {
    const rand = mulberry32(seed * 9973 + 17);
    const parts = [];
    const n = Math.round(230 * strength);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const kind = rand();
      // Crown of drops, a central jet, and fine spray.
      const [h, up, r] =
        kind < 0.68
          ? [0.45 + rand() * 1.0, 1.8 + rand() * 1.9, 0.016 + rand() * 0.022]
          : kind < 0.85
            ? [0.05 + rand() * 0.25, 4.0 + rand() * 2.4, 0.02 + rand() * 0.025]
            : [1.1 + rand() * 1.1, 1.0 + rand() * 1.6, 0.01 + rand() * 0.01];
      parts.push({
        x: x + Math.cos(a) * 0.1 * rand(),
        y: 0,
        z: z + Math.sin(a) * 0.1 * rand(),
        vx: Math.cos(a) * h * strength,
        vz: Math.sin(a) * h * strength,
        vy: up * Math.sqrt(strength),
        delay: rand() * 0.18,
        r,
      });
    }
    this.addBurst('drops', { t0, floor: this.water ? this.water.position.y : 0, parts });
    const slot = this.ripples++;
    if (this.water && slot < MAX_RIPPLES) this.water.material.uniforms.ripples.value[slot].set(x, z, t0, strength);
  }

  // ---- particles -----------------------------------------------------------------

  // Instanced particles thrown ballistically: one mesh per kind (water drops,
  // dirt, sparks). Bursts are precomputed so any frame can be drawn directly.
  makeParticles(name, geometry, material, capacity = 1200) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.scene.add(mesh);
    this.particles[name] = { mesh, bursts: [] };
  }

  // parts: [{ x, y, z, vx, vy, vz, delay, r }]. Particles below `floor` either
  // vanish (water) or come to rest on it (`settle`, for dirt).
  addBurst(name, { t0, parts, floor = -Infinity, life = 1.6, gravity = 9.8, settle = false }) {
    this.particles[name].bursts.push({ t0, parts, floor, life, gravity, settle });
  }

  updateParticles(t) {
    const m = new THREE.Matrix4();
    for (const { mesh, bursts } of Object.values(this.particles)) {
      let k = 0;
      const cap = mesh.instanceMatrix.count;
      for (const b of bursts) {
        for (const p of b.parts) {
          const dt = t - b.t0 - p.delay;
          if (dt <= 0 || dt > b.life || k >= cap) continue;
          let y = p.y + p.vy * dt - 0.5 * b.gravity * dt * dt;
          let x = p.x + p.vx * dt;
          let z = p.z + p.vz * dt;
          if (y < b.floor - 0.02) {
            if (!b.settle) continue;
            // Landed: stop where it touched down.
            const g = b.gravity / 2;
            const land = (p.vy + Math.sqrt(p.vy * p.vy + 4 * g * (p.y - b.floor))) / (2 * g);
            x = p.x + p.vx * land;
            z = p.z + p.vz * land;
            y = b.floor + p.r * 0.5;
          }
          const life = clamp(1 - dt / b.life);
          const r = p.r * (0.4 + 0.6 * Math.sqrt(life));
          m.makeScale(r, r * 1.2, r);
          m.setPosition(x, y, z);
          mesh.setMatrixAt(k++, m);
        }
      }
      mesh.count = k;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ---- overlay text ----------------------------------------------------------

  initOverlay() {
    const make = (cls) => {
      const el = document.createElement('div');
      el.className = cls;
      this.stage.appendChild(el);
      return el;
    };
    this.captionEl = make('caption');
    this.watermarkEl = make('watermark');
    make('vignette');
    this.grainEl = make('grain');
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const img = g.createImageData(256, 256);
    const rand = mulberry32(42);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  // Text pinned to a world point (or a function returning one).
  addLabel(text, anchor, { t0 = -1, t1 = Infinity, cls = 'label', dy = 0 } = {}) {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    this.stage.insertBefore(el, this.captionEl);
    const label = { el, anchor, t0, t1, dy };
    this.labels.push(label);
    return label;
  }

  // Small floating thought above a figure's head.
  addThought(text, figure, t0, t1) {
    return this.addLabel(text, () => figure.headWorld().add(new THREE.Vector3(0, 0.42, 0)), { t0, t1, cls: 'thought' });
  }

  // `top` in pixels moves the caption off the bottom edge, which phone apps
  // cover with their own UI.
  setCaption(text, t0, { t1 = Infinity, top } = {}) {
    this.caption = { text, t0, t1 };
    this.captionEl.textContent = text;
    if (top !== undefined) {
      this.captionEl.style.top = `${top}px`;
      this.captionEl.style.bottom = 'auto';
    }
  }

  setWatermark(text) {
    this.watermarkEl.textContent = text || '';
  }

  project(p) {
    const v = (p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(...p)).project(this.camera);
    return [((v.x + 1) / 2) * this.width, ((1 - v.y) / 2) * this.height];
  }

  updateOverlay(t) {
    for (const l of this.labels) {
      const fadeIn = smoothstep(l.t0, l.t0 + 0.45, t);
      const fadeOut = l.t1 === Infinity ? 1 : 1 - smoothstep(l.t1 - 0.35, l.t1, t);
      const a = Math.min(fadeIn, fadeOut);
      l.el.style.opacity = a.toFixed(3);
      if (a <= 0) continue;
      const p = typeof l.anchor === 'function' ? l.anchor(t) : l.anchor;
      const [px, y] = this.project(p);
      // Keep text on screen even when its anchor is near the edge.
      const half = l.el.offsetWidth / 2 + 24;
      const x = Math.min(Math.max(px, half), this.width - half);
      const rise = (1 - fadeIn) * 14 + l.dy;
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${(y + rise).toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (this.caption) {
      const { t0, t1 } = this.caption;
      const a = Math.min(smoothstep(t0, t0 + 0.6, t), t1 === Infinity ? 1 : 1 - smoothstep(t1 - 0.4, t1, t));
      this.captionEl.style.opacity = a.toFixed(3);
      this.captionEl.style.transform = `translate(-50%, ${((1 - a) * 12).toFixed(1)}px)`;
    }
  }

  // ---- frame -------------------------------------------------------------------

  render(t) {
    this.time = t;
    for (const fn of this.updaters) fn(t);
    if (this.water) this.water.material.uniforms.time.value = t;
    this.updateParticles(t);
    this.updateOverlay(t);
    this.renderer.render(this.scene, this.camera);
  }
}
