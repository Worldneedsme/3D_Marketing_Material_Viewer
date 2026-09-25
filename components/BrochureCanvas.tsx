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
import { createBeachTextures } from "@/lib/scenePaint";

export type LightMode = "daylight" | "cinematic";

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
        color="#f4f0e6"
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
      roughness={0.9}
      metalness={0}
      clearcoat={0.04}
      clearcoatRoughness={0.72}
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
      <mesh position={[0, 0, SHEET / 2]} receiveShadow castShadow>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <PrintMaterial url={insideUrl} side={side} mirror={false} normalMap={normalMap} />
      </mesh>
      <mesh position={[0, 0, -SHEET / 2]} rotation={[0, Math.PI, 0]} receiveShadow castShadow>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <PrintMaterial url={outsideUrl} side={side} mirror={false} normalMap={normalMap} />
      </mesh>
    </group>
  );
}

function Brochure({
  fold,
  outsideUrl,
  insideUrl,
}: {
  fold: number;
  outsideUrl: string | null;
  insideUrl: string | null;
}) {
  const left = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const velocity = useRef(0);
  const normalMap = useMemo(() => paperNormalMap(), []);

  useFrame((_, delta) => {
    const target = THREE.MathUtils.degToRad(Math.min(fold, CLOSED_LIMIT));
    const step = Math.min(delta, 0.032);
    velocity.current += (target - angle.current) * 26 * step;
    velocity.current *= Math.exp(-6.5 * step);
    angle.current += velocity.current * step;
    if (left.current) left.current.rotation.y = angle.current;
  });

  return (
    <group>
      <group ref={left}>
        <Wing side="left" outsideUrl={outsideUrl} insideUrl={insideUrl} normalMap={normalMap} />
      </group>
      <Wing side="right" outsideUrl={outsideUrl} insideUrl={insideUrl} normalMap={normalMap} />
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
        <ambientLight intensity={0.07} color="#141820" />
        <spotLight
          position={[2.8, 4.2, 2.4]}
          angle={0.34}
          penumbra={0.12}
          intensity={80}
          decay={2}
          distance={16}
          color="#ffe3bf"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.95} color="#fff8ef" />
      <directionalLight
        position={[3.5, 7.5, 4.5]}
        intensity={2.4}
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
      <group position={[0, TABLE_TOP - TABLE_THICK / 2, 0.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.6, TABLE_THICK, 2.8]} />
          <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#8a7358" : "#ffffff"} roughness={0.62} />
        </mesh>
        {[
          [-2.05, -1.15],
          [2.05, -1.15],
          [-2.05, 1.15],
          [2.05, 1.15],
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

export default function BrochureCanvas({
  fold,
  mode,
  outsideUrl,
  insideUrl,
}: {
  fold: number;
  mode: LightMode;
  outsideUrl: string | null;
  insideUrl: string | null;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.2, -0.15, 8.6], fov: 34, near: 0.05, far: 80 }}
      gl={{ antialias: true }}
    >
      <Rig mode={mode} />
      <Lights mode={mode} />
      <Beach mode={mode} />
      <Brochure key={`${outsideUrl ?? ""}|${insideUrl ?? ""}`} fold={fold} outsideUrl={outsideUrl} insideUrl={insideUrl} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={1.4} maxDistance={9} />
    </Canvas>
  );
}
