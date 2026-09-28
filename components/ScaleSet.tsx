"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { MM } from "@/lib/print";

/** ISO/IEC 7810 ID-1, stood on its short edge. */
const CARD_W = 53.98 * MM;
const CARD_H = 85.6 * MM;
const CARD_D = 0.76 * MM;
const CARD_R = 3.18 * MM;

/** U.S. $1 note, 6.14 × 2.61 in, stood on its short edge. */
const BILL_W = 66.3 * MM;
const BILL_H = 156 * MM;
const BILL_D = 0.11 * MM;

/** iPhone 17 body, Apple tech specs, stood upright. */
const PHONE_W = 71.5 * MM;
const PHONE_H = 149.6 * MM;
const PHONE_D = 7.95 * MM;
const PHONE_R = 9 * MM;

const GAP = 10 * MM;

export const SCALE_HALF = (CARD_W + BILL_W + PHONE_W + GAP * 2) / 2;

const CARD_X = -(BILL_W + PHONE_W) / 2 - GAP;
const BILL_X = CARD_X + CARD_W / 2 + GAP + BILL_W / 2;
const PHONE_X = BILL_X + BILL_W / 2 + GAP + PHONE_W / 2;

function roundedRect(width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function slabGeometry(width: number, height: number, depth: number, radius: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width, height, radius), {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function faceGeometry(width: number, height: number, radius: number, flipU: boolean) {
  const geometry = new THREE.ShapeGeometry(roundedRect(width, height, radius), 8);
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    const across = (position.getX(i) + width / 2) / width;
    uv[i * 2] = flipU ? 1 - across : across;
    uv[i * 2 + 1] = (position.getY(i) + height / 2) / height;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function canvasTexture(paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function paintCard(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#e3ddd2";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  const chipX = width * 0.12;
  const chipY = height * 0.22;
  const chipW = width * 0.22;
  const chipH = height * 0.13;
  ctx.fillStyle = "#c6a15a";
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 8);
  ctx.fill();
  ctx.strokeStyle = "#8d6b32";
  ctx.lineWidth = 2;
  ctx.strokeRect(chipX + 6, chipY + chipH * 0.28, chipW - 12, 2);
  ctx.strokeRect(chipX + 6, chipY + chipH * 0.55, chipW - 12, 2);
  ctx.beginPath();
  ctx.moveTo(chipX + chipW * 0.42, chipY);
  ctx.lineTo(chipX + chipW * 0.42, chipY + chipH);
  ctx.stroke();

  ctx.fillStyle = "#d9d3c8";
  ctx.fillRect(width * 0.12, height * 0.58, width * 0.62, height * 0.035);
  ctx.fillRect(width * 0.12, height * 0.66, width * 0.38, height * 0.028);

  ctx.fillStyle = "#6f6a62";
  ctx.font = `600 ${Math.round(height * 0.055)}px Georgia, serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("CARD", width * 0.12, height * 0.84);
}

function paintBill(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#d5e2bc";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2f6a45";
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, width - 32, height - 32);
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.fillStyle = "#e7f0da";
  ctx.beginPath();
  ctx.ellipse(width / 2, height * 0.46, width * 0.28, height * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2f6a45";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#1d4d34";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(height * 0.11)}px Georgia, serif`;
  ctx.fillText("$1", width / 2, height * 0.44);
  ctx.font = `600 ${Math.round(height * 0.038)}px Georgia, serif`;
  ctx.fillText("ONE DOLLAR", width / 2, height * 0.66);

  ctx.font = `700 ${Math.round(height * 0.05)}px Georgia, serif`;
  ctx.textAlign = "left";
  ctx.fillText("1", width * 0.1, height * 0.1);
  ctx.textAlign = "right";
  ctx.fillText("1", width * 0.9, height * 0.9);
}

function Sheet({
  x,
  width,
  height,
  depth,
  radius,
  color,
  roughness,
  map,
}: {
  x: number;
  width: number;
  height: number;
  depth: number;
  radius: number;
  color: string;
  roughness: number;
  map: THREE.Texture | null;
}) {
  const parts = useMemo(() => {
    const body = slabGeometry(width, height, depth, radius);
    const front = faceGeometry(width * 0.985, height * 0.985, radius * 0.9, false);
    const back = faceGeometry(width * 0.985, height * 0.985, radius * 0.9, true);
    return { body, front, back };
  }, [width, height, depth, radius]);

  useEffect(() => {
    return () => {
      parts.body.dispose();
      parts.front.dispose();
      parts.back.dispose();
    };
  }, [parts]);

  return (
    <group position={[x, height / 2, 0]}>
      <mesh geometry={parts.body} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={roughness} metalness={0} />
      </mesh>
      <mesh geometry={parts.front} position={[0, 0, depth / 2 + 0.0004]} castShadow>
        <meshPhysicalMaterial map={map ?? undefined} color="#ffffff" roughness={0.72} metalness={0} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh geometry={parts.back} position={[0, 0, -depth / 2 - 0.0004]} rotation={[0, Math.PI, 0]} castShadow>
        <meshPhysicalMaterial map={map ?? undefined} color="#ffffff" roughness={0.72} metalness={0} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </group>
  );
}

function Phone({ x }: { x: number }) {
  const parts = useMemo(() => {
    const body = slabGeometry(PHONE_W, PHONE_H, PHONE_D, PHONE_R);
    const screen = slabGeometry(PHONE_W - 3.2 * MM, PHONE_H - 3.2 * MM, 0.4 * MM, PHONE_R - 1.2 * MM);
    const island = slabGeometry(33 * MM, 11 * MM, 0.3 * MM, 5.5 * MM);
    const bump = slabGeometry(36 * MM, 68 * MM, 2.5 * MM, 12 * MM);
    return { body, screen, island, bump };
  }, []);

  useEffect(() => {
    return () => {
      parts.body.dispose();
      parts.screen.dispose();
      parts.island.dispose();
      parts.bump.dispose();
    };
  }, [parts]);

  const lensY = [18 * MM, -16 * MM];

  return (
    <group position={[x, PHONE_H / 2, 0]}>
      <mesh geometry={parts.body} castShadow receiveShadow>
        <meshPhysicalMaterial color="#1c1c1e" roughness={0.42} metalness={0.55} clearcoat={0.25} clearcoatRoughness={0.4} />
      </mesh>
      <mesh geometry={parts.screen} position={[0, 0, PHONE_D / 2 + 0.35 * MM]} castShadow>
        <meshPhysicalMaterial color="#0c0e12" roughness={0.18} metalness={0} clearcoat={0.65} clearcoatRoughness={0.12} emissive="#141820" emissiveIntensity={0.45} />
      </mesh>
      <mesh geometry={parts.island} position={[0, PHONE_H / 2 - 16 * MM, PHONE_D / 2 + 0.75 * MM]}>
        <meshStandardMaterial color="#050506" roughness={0.4} />
      </mesh>
      <mesh geometry={parts.bump} position={[-PHONE_W / 2 + 24 * MM, PHONE_H / 2 - 42 * MM, -PHONE_D / 2 - 1.25 * MM]} castShadow>
        <meshPhysicalMaterial color="#2a2a2c" roughness={0.35} metalness={0.4} />
      </mesh>
      {lensY.map((y) => (
        <mesh
          key={y}
          position={[-PHONE_W / 2 + 24 * MM, PHONE_H / 2 - 42 * MM + y, -PHONE_D / 2 - 2.7 * MM]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[5.2 * MM, 5.2 * MM, 0.6 * MM, 24]} />
          <meshPhysicalMaterial color="#0a0a0c" roughness={0.15} metalness={0.2} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
      ))}
      <mesh position={[-PHONE_W / 2 - 0.7 * MM, 12 * MM, 0]} castShadow>
        <boxGeometry args={[1.2 * MM, 22 * MM, 4 * MM]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[-PHONE_W / 2 - 0.7 * MM, -16 * MM, 0]} castShadow>
        <boxGeometry args={[1.2 * MM, 34 * MM, 4 * MM]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[PHONE_W / 2 + 0.7 * MM, 18 * MM, 0]} castShadow>
        <boxGeometry args={[1.2 * MM, 28 * MM, 4 * MM]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.45} metalness={0.4} />
      </mesh>
    </group>
  );
}

export function ScaleSet({ position, yaw = 0 }: { position: [number, number, number]; yaw?: number }) {
  const maps = useMemo(
    () => ({
      card: canvasTexture(paintCard, 480, Math.round(480 * (CARD_H / CARD_W))),
      bill: canvasTexture(paintBill, 420, Math.round(420 * (BILL_H / BILL_W))),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      maps.card?.dispose();
      maps.bill?.dispose();
    };
  }, [maps]);

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <Sheet x={CARD_X} width={CARD_W} height={CARD_H} depth={CARD_D} radius={CARD_R} color="#f7f4ee" roughness={0.55} map={maps.card} />
      <Sheet x={BILL_X} width={BILL_W} height={BILL_H} depth={BILL_D} radius={1.5 * MM} color="#d7e3c4" roughness={0.82} map={maps.bill} />
      <Phone x={PHONE_X} />
    </group>
  );
}
