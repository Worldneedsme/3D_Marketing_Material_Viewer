"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { LightMode } from "@/components/BrochureCanvas";
import { ScaleSet, SCALE_HALF } from "@/components/ScaleSet";
import { createBeachTextures } from "@/lib/scenePaint";

const DISC_R = 0.56;
const LOOPS = 20;

function paintCrochet() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = size / 2;

  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (c - 10);
    ctx.save();
    ctx.translate(c + Math.cos(a) * d, c + Math.sin(a) * d);
    ctx.rotate(a);
    ctx.fillStyle = Math.random() > 0.45 ? "rgba(255,252,247,0.5)" : "rgba(186,170,148,0.32)";
    ctx.fillRect(0, 0, 1.5, 4 + Math.random() * 9);
    ctx.restore();
  }

  ctx.lineCap = "round";
  for (let ring = 0; ring < 14; ring += 1) {
    const rad = 28 + ring * 34;
    const count = 8 + ring * 4;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + ring * 0.22;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(150, 132, 110, 0.78)" : "rgba(255, 250, 242, 0.9)";
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(c, c, rad, a, a + ((Math.PI * 2) / count) * 0.72);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,252,246,0.35)";
      ctx.beginPath();
      ctx.arc(c + Math.cos(a + 0.15) * rad, c + Math.sin(a + 0.15) * rad, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  [210, 340, 455].forEach((rad, ring) => {
    const count = 12 + ring * 8;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + ring * 0.35;
      ctx.save();
      ctx.translate(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
      ctx.rotate(a + Math.PI / 2);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, ring === 1 ? 22 : 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function bakeMark(image: (CanvasImageSource & { width: number; height: number }) | null) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#f7f3eb";
  ctx.fillRect(0, 0, size, size);

  if (image) {
    const scale = Math.max(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
  } else {
    ctx.strokeStyle = "#b7a894";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#5e564c";
    ctx.font = "600 120px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LOGO", size / 2, size / 2 + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function useMark(url: string | null) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let alive = true;
    if (!url) {
      const texture = bakeMark(null);
      setMap((current) => {
        current?.dispose();
        return texture;
      });
      return () => {
        alive = false;
      };
    }
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      const texture = bakeMark(image);
      if (!texture) return;
      setMap((current) => {
        current?.dispose();
        return texture;
      });
    };
    image.src = url;
    return () => {
      alive = false;
    };
  }, [url]);

  return map;
}

function loopGeometry() {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.0, 0.03, 0),
      new THREE.Vector3(0.045, 0.048, -0.078),
      new THREE.Vector3(0.13, 0.058, 0),
      new THREE.Vector3(0.045, 0.048, 0.078),
    ],
    true,
  );
  return new THREE.TubeGeometry(curve, 40, 0.04, 8, true);
}

function Coaster({ yarn, logoUrl }: { yarn: string; logoUrl: string | null }) {
  const crochet = useMemo(() => paintCrochet(), []);
  const loops = useMemo(() => loopGeometry(), []);
  const mark = useMark(logoUrl);

  return (
    <group position={[-0.78, -0.016, 0]} scale={0.58}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[DISC_R + 0.03, 64]} />
        <meshStandardMaterial color="#efe6d8" roughness={1} />
      </mesh>
      <mesh position={[0, 0.016, 0]} castShadow>
        <cylinderGeometry args={[DISC_R, DISC_R + 0.012, 0.028, 72, 1, true]} />
        <meshStandardMaterial color="#f3eee4" roughness={0.96} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]} receiveShadow>
        <circleGeometry args={[DISC_R - 0.01, 72]} />
        <meshStandardMaterial color="#7a6248" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]} castShadow receiveShadow>
        <circleGeometry args={[DISC_R, 80]} />
        <meshPhysicalMaterial map={crochet ?? undefined} roughness={0.94} metalness={0} alphaTest={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.037, 0]} receiveShadow>
        <circleGeometry args={[logoUrl ? DISC_R : 0.22, 80]} />
        <meshPhysicalMaterial map={mark ?? undefined} color="#f7f3eb" roughness={0.78} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.034, 0]} castShadow>
        <torusGeometry args={[DISC_R - 0.01, 0.016, 8, 64]} />
        <meshPhysicalMaterial color={yarn} roughness={0.88} metalness={0} sheen={0.35} sheenColor={yarn} />
      </mesh>
      {Array.from({ length: LOOPS }, (_, i) => {
        const theta = (i / LOOPS) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, -theta, 0]}>
            <mesh
              geometry={loops}
              position={[DISC_R - 0.06, 0.02, 0]}
              rotation={[i % 2 === 0 ? 0.22 : -0.18, 0, 0]}
              castShadow
            >
              <meshPhysicalMaterial color={yarn} roughness={0.9} metalness={0} sheen={0.4} sheenColor="#fff6ea" />
            </mesh>
          </group>
        );
      })}
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
          position={[1.4, 2.4, 1.6]}
          angle={0.55}
          penumbra={0.5}
          intensity={28}
          decay={2}
          distance={10}
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
      <directionalLight position={[-1.6, 3.2, 2.1]} intensity={0.7} color="#fff4e8" />
      <directionalLight
        position={[1.8, 3.6, 2.2]}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 1.2]} receiveShadow>
        <planeGeometry args={[24, 14]} />
        <meshStandardMaterial map={textures.sand ?? undefined} color={dusk ? "#6b5c48" : "#ffffff"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.716, -6]} receiveShadow>
        <planeGeometry args={[28, 12]} />
        <meshStandardMaterial map={textures.sea ?? undefined} color={dusk ? "#1a3344" : "#ffffff"} roughness={0.28} />
      </mesh>
      <group position={[0.35, -0.06, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.7, 0.08, 2.15]} />
          <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#8a7358" : "#ffffff"} roughness={0.62} />
        </mesh>
        {[
          [-1.65, -0.88],
          [1.65, -0.88],
          [-1.65, 0.88],
          [1.65, 0.88],
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

export default function CoasterCanvas({
  mode,
  yarn,
  logoUrl,
}: {
  mode: LightMode;
  yarn: string;
  logoUrl: string | null;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.76, 2.74, 7.9], fov: 32, near: 0.02, far: 50 }}
      gl={{ antialias: true }}
    >
      <Rig mode={mode} />
      <Lights mode={mode} />
      <Table mode={mode} />
      <Coaster yarn={yarn} logoUrl={logoUrl} />
      <ScaleSet position={[-0.78 + 0.56 * 0.58 + 0.16 + SCALE_HALF, -0.02, 0]} yaw={0.12} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0.4, 0.55, 0]} minDistance={0.35} maxDistance={14} />
    </Canvas>
  );
}
