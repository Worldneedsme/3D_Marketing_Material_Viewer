"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { LightMode } from "@/components/BrochureCanvas";
import { ScaleSet, SCALE_HALF } from "@/components/ScaleSet";
import { createBeachTextures } from "@/lib/scenePaint";

/** Scene units: 1 = 10 cm. The mesh keeps its side profile; width and height are set exactly. */
const TENT_WIDTH = 1;
const TENT_HEIGHT = 1.7;
const LOOK = new THREE.Vector3(1.25, 0.72, 0);

function sheetGeometry(geometry: THREE.BufferGeometry, side: "front" | "back") {
  const pos = geometry.getAttribute("position");
  const picked: THREE.Vector3[][] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const pts = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k));
    const normal = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0]));
    if (normal.length() < 1e-5) continue;
    normal.normalize();
    const match = side === "front" ? normal.z > 0.5 : normal.z < -0.5;
    if (match) picked.push(pts);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pts of picked) {
    for (const point of pts) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const pts of picked) {
    const normal = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
    const lift = normal.clone().multiplyScalar(0.0004);
    for (const point of pts) {
      const placed = point.clone().add(lift);
      positions.push(placed.x, placed.y, placed.z);
      normals.push(normal.x, normal.y, normal.z);
      const across = (point.x - minX) / spanX;
      uvs.push(side === "front" ? across : 1 - across, (point.y - minY) / spanY);
    }
  }

  const sheet = new THREE.BufferGeometry();
  sheet.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  sheet.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  sheet.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return sheet;
}

function useFaceMap(url: string | null) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setMap((current) => {
        current?.dispose();
        return null;
      });
      return;
    }
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      if (!alive) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      setMap((current) => {
        current?.dispose();
        return texture;
      });
    });
    return () => {
      alive = false;
    };
  }, [url]);

  return map;
}

function Print({ geometry, url }: { geometry: THREE.BufferGeometry; url: string | null }) {
  const map = useFaceMap(url);
  if (!map) return null;
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial map={map} color="#ffffff" roughness={0.62} metalness={0} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

function TentModel({ frontUrl, backUrl }: { frontUrl: string | null; backUrl: string | null }) {
  const model = useLoader(OBJLoader, "/models/TableTent.obj");
  const parts = useMemo(() => {
    const inside = model.children.find((child) => child.name.startsWith("Inside")) as THREE.Mesh;
    const outside = model.children.find((child) => child.name.startsWith("Outside")) as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scaleY = TENT_HEIGHT / size.y;
    return {
      inside: inside.geometry,
      outside: outside.geometry,
      front: sheetGeometry(outside.geometry, "front"),
      back: sheetGeometry(outside.geometry, "back"),
      scale: [TENT_WIDTH / size.x, scaleY, scaleY] as const,
      lift: -box.min.y * scaleY,
    };
  }, [model]);

  useEffect(() => {
    return () => {
      parts.front.dispose();
      parts.back.dispose();
    };
  }, [parts]);

  return (
    <group scale={parts.scale} position={[0, parts.lift, 0]}>
      <mesh geometry={parts.inside} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f7f7f5" roughness={0.94} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={parts.outside} castShadow receiveShadow>
        <meshPhysicalMaterial color="#ffffff" roughness={0.58} metalness={0} clearcoat={0.18} clearcoatRoughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <Print geometry={parts.front} url={frontUrl} />
      <Print geometry={parts.back} url={backUrl} />
    </group>
  );
}

function Rig({ mode }: { mode: LightMode }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = mode === "daylight" ? 1.02 : 1.08;
    gl.shadowMap.type = THREE.PCFShadowMap;
  }, [gl, mode]);
  return null;
}

function Lights({ mode }: { mode: LightMode }) {
  if (mode === "cinematic") {
    return (
      <>
        <ambientLight intensity={0.28} color="#1c2430" />
        <hemisphereLight args={["#8ea0b8", "#3a3028", 0.35]} />
        <spotLight
          position={[1.6, 3.2, 2.2]}
          angle={0.48}
          penumbra={0.45}
          intensity={36}
          decay={2}
          distance={12}
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
      <ambientLight intensity={1.05} color="#fff8ef" />
      <hemisphereLight args={["#f4f7ff", "#e7d7c4", 0.48]} />
      <directionalLight position={[-2.4, 4.2, 2.2]} intensity={0.7} color="#fff4e8" />
      <directionalLight
        position={[2.2, 4.8, 2.6]}
        intensity={1.15}
        color="#fffaf3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.02}
        shadow-camera-near={0.2}
        shadow-camera-far={12}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
    </>
  );
}

function Table({ mode }: { mode: LightMode }) {
  const textures = useMemo(() => createBeachTextures(), []);
  const dusk = mode === "cinematic";
  const thick = 0.08;
  const leg = 0.52;
  const sandY = -thick - leg;

  return (
    <group>
      <mesh scale={[36, 36, 36]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial map={textures.sky ?? undefined} side={THREE.BackSide} color={dusk ? "#243044" : "#ffffff"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sandY, 1.4]} receiveShadow>
        <planeGeometry args={[28, 16]} />
        <meshStandardMaterial map={textures.sand ?? undefined} color={dusk ? "#6b5c48" : "#ffffff"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sandY + 0.004, -8]} receiveShadow>
        <planeGeometry args={[32, 14]} />
        <meshStandardMaterial map={textures.sea ?? undefined} color={dusk ? "#1a3344" : "#ffffff"} roughness={0.28} />
      </mesh>
      <group position={[0, -thick / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6.6, thick, 3.3]} />
          <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#8a7358" : "#ffffff"} roughness={0.62} />
        </mesh>
        {[
          [-3.05, -1.4],
          [3.05, -1.4],
          [-3.05, 1.4],
          [3.05, 1.4],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, -(thick / 2 + leg / 2), z]} castShadow>
            <boxGeometry args={[0.09, leg, 0.09]} />
            <meshStandardMaterial map={textures.wood ?? undefined} color={dusk ? "#5c4632" : "#8d6240"} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function TentCanvas({
  mode,
  frontUrl,
  backUrl,
}: {
  mode: LightMode;
  frontUrl: string | null;
  backUrl: string | null;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [-0.76, 2.6, 10.03], fov: 28, near: 0.02, far: 80 }}
      gl={{ antialias: true }}
      onCreated={({ camera }) => camera.lookAt(LOOK)}
    >
      <Rig mode={mode} />
      <Lights mode={mode} />
      <Table mode={mode} />
      <Suspense fallback={null}>
        <TentModel frontUrl={frontUrl} backUrl={backUrl} />
      </Suspense>
      <ScaleSet position={[0.5 + 0.32 + SCALE_HALF, 0, 0.04]} yaw={-0.12} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[1.25, 0.72, 0]} minDistance={1.1} maxDistance={16} />
    </Canvas>
  );
}
