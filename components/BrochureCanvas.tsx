"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BLEED_MM,
  FULL_H_MM,
  FULL_W_MM,
  PANEL_H,
  PANEL_W,
  PANEL_W_MM,
  TRIM_H_MM,
  type PanelSide,
} from "@/lib/print";
import { ScaleSet, SCALE_HALF } from "@/components/ScaleSet";
import { createBeachTextures } from "@/lib/scenePaint";

export type LightMode = "daylight" | "cinematic";
export type Pose = "stand" | "table";

const CLOSED_LIMIT = 179.15;
const NORMAL_SCALE = new THREE.Vector2(0.16, 0.16);
const SHEET = 0.0045;

function paperNormalMap() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = 128 + (Math.random() - 0.5) * 22;
    image.data[i + 1] = 128 + (Math.random() - 0.5) * 22;
    image.data[i + 2] = 255;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.4, 4.8);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function bakePanel(image: CanvasImageSource & { width: number; height: number }, side: PanelSide, flipX: boolean) {
  const u0 = (side === "left" ? BLEED_MM : BLEED_MM + PANEL_W_MM) / FULL_W_MM;
  const v0 = BLEED_MM / FULL_H_MM;
  const uSpan = PANEL_W_MM / FULL_W_MM;
  const vSpan = TRIM_H_MM / FULL_H_MM;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round(1024 * (TRIM_H_MM / PANEL_W_MM));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (flipX) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    image,
    u0 * image.width,
    v0 * image.height,
    uSpan * image.width,
    vSpan * image.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function usePanelMap(url: string | null, side: PanelSide, flipX: boolean) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      const texture = bakePanel(image, side, flipX);
      if (!texture || !alive) {
        texture?.dispose();
        return;
      }
      setMap((current) => {
        current?.dispose();
        return texture;
      });
    };
    image.src = url;
    return () => {
      alive = false;
    };
  }, [url, side, flipX]);

  return map;
}

function PrintMaterial({
  url,
  side,
  mirror,
  normalMap,
}: {
  url: string | null;
  side: PanelSide;
  mirror: boolean;
  normalMap: THREE.Texture | null;
}) {
  const map = usePanelMap(url, side, mirror);
  if (!map) {
    return (
      <meshPhysicalMaterial
        color="#FDFBF7"
        roughness={0.8}
        metalness={0}
        normalMap={normalMap ?? undefined}
        normalScale={NORMAL_SCALE}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      map={map}
      color="#ffffff"
      roughness={0.88}
      metalness={0}
      clearcoat={0.03}
      clearcoatRoughness={0.8}
      normalMap={normalMap ?? undefined}
      normalScale={NORMAL_SCALE}
    />
  );
}

function Wing({
  side,
  outsideUrl,
  insideUrl,
  normalMap,
}: {
  side: PanelSide;
  outsideUrl: string | null;
  insideUrl: string | null;
  normalMap: THREE.Texture | null;
}) {
  const x = side === "left" ? -PANEL_W / 2 : PANEL_W / 2;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0, SHEET / 2]} castShadow>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <PrintMaterial url={insideUrl} side={side} mirror={false} normalMap={normalMap} />
      </mesh>
      <mesh position={[0, 0, -SHEET / 2]} rotation={[0, Math.PI, 0]} castShadow>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <PrintMaterial url={outsideUrl} side={side} mirror={false} normalMap={normalMap} />
      </mesh>
    </group>
  );
}

function spineShade() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const fade = ctx.createLinearGradient(0, 0, 128, 0);
  fade.addColorStop(0, "rgba(90, 70, 48, 0)");
  fade.addColorStop(0.5, "rgba(90, 70, 48, 0.28)");
  fade.addColorStop(1, "rgba(90, 70, 48, 0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Brochure({
  fold,
  pose,
  outsideUrl,
  insideUrl,
}: {
  fold: number;
  pose: Pose;
  outsideUrl: string | null;
  insideUrl: string | null;
}) {
  const rig = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const velocity = useRef(0);
  const lay = useRef(pose === "table" ? 1 : 0);
  const normalMap = useMemo(() => paperNormalMap(), []);
  const crease = useMemo(() => spineShade(), []);

  useFrame((_, delta) => {
    const target = THREE.MathUtils.degToRad(Math.min(fold, CLOSED_LIMIT));
    const step = Math.min(delta, 0.032);
    velocity.current += (target - angle.current) * 13.5 * step;
    velocity.current *= Math.exp(-4.8 * step);
    angle.current += velocity.current * step;
    if (cover.current) cover.current.rotation.y = angle.current;

    lay.current = THREE.MathUtils.damp(lay.current, pose === "table" ? 1 : 0, 3.2, delta);
    if (rig.current) {
      rig.current.rotation.x = -lay.current * (Math.PI / 2);
      rig.current.position.y = lay.current * (TABLE_TOP + SHEET);
    }
  });

  return (
    <group ref={rig}>
      <group ref={cover}>
        <Wing side="left" outsideUrl={outsideUrl} insideUrl={insideUrl} normalMap={normalMap} />
      </group>
      <Wing side="right" outsideUrl={outsideUrl} insideUrl={insideUrl} normalMap={normalMap} />
      <mesh position={[0, 0, SHEET / 2 + 0.003]}>
        <planeGeometry args={[0.07, PANEL_H]} />
        <meshBasicMaterial map={crease ?? undefined} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function Rig({ mode }: { mode: LightMode }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = mode === "daylight" ? 1.05 : 1.15;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.needsUpdate = true;
  }, [gl, mode]);
  return null;
}

function Lights({ mode }: { mode: LightMode }) {
  if (mode === "cinematic") {
    return (
      <>
        <ambientLight intensity={0.28} color="#1c2430" />
        <hemisphereLight args={["#8ea0b8", "#3a3028", 0.35]} />
        <directionalLight position={[-3.2, 4.5, 2.2]} intensity={0.55} color="#d5deea" />
        <spotLight
          position={[2.8, 4.2, 2.4]}
          angle={0.34}
          penumbra={0.45}
          intensity={46}
          decay={2}
          distance={16}
          color="#ffe3bf"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.04}
        />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={1.15} color="#fff8ef" />
      <hemisphereLight args={["#f4f7ff", "#e7d7c4", 0.55]} />
      <directionalLight position={[-4.2, 6.2, 3.4]} intensity={0.9} color="#fff4e8" />
      <directionalLight
        position={[3.5, 7.5, 4.5]}
        intensity={1.35}
        color="#fffaf3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-radius={2}
        shadow-blurSamples={8}
      />
    </>
  );
}

const TABLE_TOP = -PANEL_H / 2;
const STAND_POS = new THREE.Vector3(1.05, -0.05, 11.6);
const STAND_TARGET = new THREE.Vector3(1.05, 0.02, 0);
const TABLE_POS = new THREE.Vector3(1.7, TABLE_TOP + 9.8, 8.1);
const TABLE_TARGET = new THREE.Vector3(1.7, TABLE_TOP + 0.04, 0.05);
const TABLE_THICK = 0.1;
const LEG = 0.72;

function Beach({ mode }: { mode: LightMode }) {
  const textures = useMemo(() => createBeachTextures(), []);
  const dusk = mode === "cinematic";
  const sandY = TABLE_TOP - TABLE_THICK - LEG;

  return (
    <group>
      <mesh scale={[48, 48, 48]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial map={textures.sky ?? undefined} side={THREE.BackSide} color={dusk ? "#243044" : "#ffffff"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sandY, 2]} receiveShadow>
        <planeGeometry args={[36, 22]} />
        <meshStandardMaterial map={textures.sand ?? undefined} color={dusk ? "#6b5c48" : "#ffffff"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sandY + 0.004, -14]} receiveShadow>
        <planeGeometry args={[48, 22]} />
        <meshStandardMaterial
          map={textures.sea ?? undefined}
          color={dusk ? "#1a3344" : "#ffffff"}
          roughness={0.28}
          metalness={0.08}
        />
      </mesh>
      <group position={[0.85, TABLE_TOP - TABLE_THICK / 2, 0.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[7.4, TABLE_THICK, 2.8]} />
          <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#8a7358" : "#ffffff"} roughness={0.62} />
        </mesh>
        {[
          [-3.4, -1.12],
          [3.4, -1.12],
          [-3.4, 1.12],
          [3.4, 1.12],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, -(TABLE_THICK / 2 + LEG / 2), z]} castShadow receiveShadow>
            <boxGeometry args={[0.12, LEG, 0.12]} />
            <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#5c4632" : "#8d6240"} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ViewPose({ pose }: { pose: Pose }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; update: () => void } | null;
  const fromPos = useRef(new THREE.Vector3());
  const fromTarget = useRef(new THREE.Vector3());
  const shown = useRef(pose);
  const blend = useRef(1);

  useFrame((_, delta) => {
    if (!controls) return;
    if (shown.current !== pose) {
      fromPos.current.copy(camera.position);
      fromTarget.current.copy(controls.target);
      shown.current = pose;
      blend.current = 0;
    }
    if (blend.current >= 1) return;
    blend.current = Math.min(1, blend.current + delta * 0.8);
    const k = 1 - (1 - blend.current) ** 3;
    camera.position.lerpVectors(fromPos.current, pose === "stand" ? STAND_POS : TABLE_POS, k);
    controls.target.lerpVectors(fromTarget.current, pose === "stand" ? STAND_TARGET : TABLE_TARGET, k);
    controls.update();
  });

  return null;
}

export default function BrochureCanvas({
  fold,
  mode,
  pose,
  outsideUrl,
  insideUrl,
}: {
  fold: number;
  mode: LightMode;
  pose: Pose;
  outsideUrl: string | null;
  insideUrl: string | null;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [1.05, -0.05, 11.6], fov: 34, near: 0.05, far: 80 }}
      gl={{ antialias: true }}
    >
      <Rig mode={mode} />
      <Lights mode={mode} />
      <Beach mode={mode} />
      <Brochure
        key={`${outsideUrl ?? ""}|${insideUrl ?? ""}`}
        fold={fold}
        pose={pose}
        outsideUrl={outsideUrl}
        insideUrl={insideUrl}
      />
      <ScaleSet position={[PANEL_W + 0.16 + SCALE_HALF, TABLE_TOP, 0.02]} />
      <ViewPose pose={pose} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[1.05, 0.02, 0]} minDistance={1.6} maxDistance={16} />
    </Canvas>
  );
}
