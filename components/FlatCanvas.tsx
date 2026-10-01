"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { LightMode } from "@/components/BrochureCanvas";
import { ScaleSet, SCALE_HALF } from "@/components/ScaleSet";
import { createBeachTextures } from "@/lib/scenePaint";
import { FLAT_PRODUCTS, MM, type FlatId } from "@/lib/print";

const PIECE_X = 0;
const TABLE_TOP = 0;

function useSheetMap(url: string | null) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      if (!alive) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;
      texture.needsUpdate = true;
      setMap(texture);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    return () => map?.dispose();
  }, [map]);

  return map;
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  dashed: boolean,
  px: number,
) {
  ctx.setLineDash(dashed ? [px * 1.4, px * 0.85] : []);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(4, px * 0.9);
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, px * 0.55);
  ctx.strokeRect(x, y, w, h);
}

/** Ruled lines for the glued pad. Drawn unlit so they stay visible at the preview distance. */
function rulesTexture(fullW: number, fullH: number, bleed: number) {
  const px = 10;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(fullW * px);
  canvas.height = Math.round(fullH * px);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#3e5164";
  ctx.lineWidth = px * 0.7;
  const left = (bleed + 4) * px;
  const right = (fullW - bleed - 4) * px;
  const bottom = (fullH - bleed - 4) * px;
  for (let y = (bleed + 16) * px; y <= bottom; y += 5 * px) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Red cut line stays on the sheet. Blue starts 5 mm inside that line. */
function guideTexture(fullW: number, fullH: number, bleed: number, safe: number, showSafe: boolean) {
  const px = 16;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(fullW * px);
  canvas.height = Math.round(fullH * px);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokeRect(ctx, bleed * px, bleed * px, (fullW - bleed * 2) * px, (fullH - bleed * 2) * px, "#e10600", false, px);

  if (showSafe) {
    const inset = bleed + safe;
    strokeRect(
      ctx,
      inset * px,
      inset * px,
      (fullW - inset * 2) * px,
      (fullH - inset * 2) * px,
      "#1d4ed8",
      true,
      px,
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function Piece({
  productId,
  artUrl,
  showSafe,
}: {
  productId: FlatId;
  artUrl: string | null;
  showSafe: boolean;
}) {
  const product = FLAT_PRODUCTS[productId];
  const fullW = product.cutW + product.bleed * 2;
  const fullH = product.cutH + product.bleed * 2;
  const width = fullW * MM;
  const height = fullH * MM;
  const depth = product.depth * MM;
  const map = useSheetMap(artUrl);
  const guide = useMemo(
    () => guideTexture(fullW, fullH, product.bleed, product.safe, showSafe),
    [fullW, fullH, product.bleed, product.safe, showSafe],
  );
  const rules = useMemo(
    () => (productId === "notepad" ? rulesTexture(fullW, fullH, product.bleed) : null),
    [productId, fullW, fullH, product.bleed],
  );

  useEffect(() => {
    return () => {
      guide?.dispose();
      rules?.dispose();
    };
  }, [guide, rules]);

  const pad = product.depth >= 4;
  const sheets = pad ? 8 : 1;
  const glueH = pad ? 11 * MM : 0;
  const glueW = (product.cutW - 2) * MM;
  const glueY = height / 2 - (product.bleed + 1) * MM - glueH / 2;

  return (
    <group position={[PIECE_X, TABLE_TOP + height / 2, 0]}>
      {Array.from({ length: sheets }, (_, index) => (
        <mesh key={index} position={[0, 0, depth / 2 - (depth / sheets) * (index + 0.5)]} castShadow receiveShadow>
          <boxGeometry args={[width, height, (depth / sheets) * 0.9]} />
          <meshPhysicalMaterial color={index % 2 === 0 ? product.edge : "#e6dece"} roughness={0.86} metalness={0} />
        </mesh>
      ))}
      <mesh position={[0, 0, depth / 2 + 0.0004]} castShadow>
        <planeGeometry args={[width, height]} />
        <meshPhysicalMaterial
          map={map ?? undefined}
          color="#ffffff"
          roughness={product.roughness}
          metalness={0}
          clearcoat={productId === "label" ? 0.18 : 0}
          clearcoatRoughness={0.4}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {rules ? (
        <mesh position={[0, 0, depth / 2 + 0.001]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={rules} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ) : null}
      {pad ? (
        <mesh position={[0, glueY, depth / 2 + 0.0016]}>
          <planeGeometry args={[glueW, glueH]} />
          <meshPhysicalMaterial color="#d4b483" roughness={0.35} metalness={0} clearcoat={0.45} transparent opacity={0.72} depthWrite={false} />
        </mesh>
      ) : null}
      {guide ? (
        <mesh position={[0, 0, depth / 2 + 0.0022]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={guide} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ) : null}
    </group>
  );
}

function Rig({ mode }: { mode: LightMode }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = mode === "daylight" ? 1.05 : 1.12;
    gl.shadowMap.type = THREE.PCFShadowMap;
  }, [gl, mode]);
  return null;
}

function Lights({ mode }: { mode: LightMode }) {
  if (mode === "cinematic") {
    return (
      <>
        <ambientLight intensity={0.32} color="#1c2430" />
        <hemisphereLight args={["#8ea0b8", "#3a3028", 0.4]} />
        <spotLight
          position={[1.6, 2.8, 2.2]}
          angle={0.5}
          penumbra={0.5}
          intensity={32}
          decay={2}
          distance={12}
          color="#ffe3bf"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={1.05} color="#fff8ef" />
      <hemisphereLight args={["#f4f7ff", "#e7d7c4", 0.45]} />
      <directionalLight position={[-1.8, 3.4, 2.2]} intensity={0.7} color="#fff4e8" />
      <directionalLight
        position={[2.2, 4.2, 2.6]}
        intensity={1.15}
        color="#fffaf3"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

function Table({ mode }: { mode: LightMode }) {
  const textures = useMemo(() => createBeachTextures(), []);
  const dusk = mode === "cinematic";
  return (
    <group>
      <mesh scale={[28, 28, 28]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial map={textures.sky ?? undefined} side={THREE.BackSide} color={dusk ? "#243044" : "#ffffff"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, -0.72, 1.2]} receiveShadow>
        <planeGeometry args={[24, 14]} />
        <meshStandardMaterial map={textures.sand ?? undefined} color={dusk ? "#6b5c48" : "#ffffff"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, -0.716, -6]} receiveShadow>
        <planeGeometry args={[28, 12]} />
        <meshStandardMaterial map={textures.sea ?? undefined} color={dusk ? "#1a3344" : "#ffffff"} roughness={0.28} />
      </mesh>
      <group position={[1.05, -0.04, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.5, 0.08, 2.2]} />
          <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#8a7358" : "#ffffff"} roughness={0.62} />
        </mesh>
        {[
          [-2.0, -0.9],
          [2.0, -0.9],
          [-2.0, 0.9],
          [2.0, 0.9],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, -0.36, z]} castShadow>
            <boxGeometry args={[0.08, 0.64, 0.08]} />
            <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#5c4632" : "#8d6240"} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function FlatCanvas({
  mode,
  productId,
  artUrl,
  showSafe,
}: {
  mode: LightMode;
  productId: FlatId;
  artUrl: string | null;
  showSafe: boolean;
}) {
  const product = FLAT_PRODUCTS[productId];
  const fullW = (product.cutW + product.bleed * 2) * MM;
  const scaleX = PIECE_X + fullW / 2 + 0.14 + SCALE_HALF;
  const tall = product.cutH > 100;
  const look: [number, number, number] = tall ? [1.45, 1.05, 0] : [1.25, 0.45, 0];

  return (
    <Canvas
      key={productId}
      shadows
      dpr={[1, 2]}
      camera={{ position: tall ? [1.6, 3.15, 11.6] : [1.45, 2.75, 9.6], fov: 32, near: 0.02, far: 60 }}
      gl={{ antialias: true }}
      onCreated={({ camera }) => camera.lookAt(look[0], look[1], look[2])}
    >
      <Rig mode={mode} />
      <Lights mode={mode} />
      <Table mode={mode} />
      <Piece productId={productId} artUrl={artUrl} showSafe={showSafe} />
      <ScaleSet position={[scaleX, TABLE_TOP, 0]} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={look} minDistance={0.4} maxDistance={16} />
    </Canvas>
  );
}
