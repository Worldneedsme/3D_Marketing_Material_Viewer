import { BLEED_MM, FULL_H_MM, FULL_W_MM, FOLD_X_MM, SAFE_MM, TRIM_H_MM, TRIM_W_MM } from "@/lib/print";

const cutX = BLEED_MM;
const cutY = BLEED_MM;
const safeX = BLEED_MM + SAFE_MM;
const safeY = BLEED_MM + SAFE_MM;
const safeW = TRIM_W_MM - SAFE_MM * 2;
const safeH = TRIM_H_MM - SAFE_MM * 2;

export function GuidelineOverlay({
  labels,
  showSafe,
}: {
  labels: { left: string; right: string };
  showSafe: boolean;
}) {
  return (
    <svg
      viewBox={`0 0 ${FULL_W_MM} ${FULL_H_MM}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <GuideRect x={0.4} y={0.4} w={FULL_W_MM - 0.8} h={FULL_H_MM - 0.8} color="#111111" />
      <GuideRect x={cutX} y={cutY} w={TRIM_W_MM} h={TRIM_H_MM} color="#e10600" />
      {showSafe ? <GuideRect x={safeX} y={safeY} w={safeW} h={safeH} color="#1d4ed8" dashed /> : null}
      <line
        x1={FOLD_X_MM}
        y1={cutY}
        x2={FOLD_X_MM}
        y2={cutY + TRIM_H_MM}
        stroke="#ffffff"
        strokeWidth={1.15}
        strokeDasharray="2.2 1.4"
      />
      <line
        x1={FOLD_X_MM}
        y1={cutY}
        x2={FOLD_X_MM}
        y2={cutY + TRIM_H_MM}
        stroke="#111111"
        strokeWidth={0.4}
        strokeDasharray="2.2 1.4"
      />
      <Label x={cutX + 4} y={14} text={labels.left} />
      <Label x={FOLD_X_MM + 4} y={14} text={labels.right} />
    </svg>
  );
}

function GuideRect({
  x,
  y,
  w,
  h,
  color,
  dashed = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  dashed?: boolean;
}) {
  const dash = dashed ? "2.4 1.6" : undefined;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#ffffff" strokeWidth={1.15} strokeDasharray={dash} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={0.45} strokeDasharray={dash} />
    </>
  );
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fill="#111111" stroke="#ffffff" strokeWidth={0.45} fontSize={4.2} fontFamily="ui-sans-serif, sans-serif">
      {text}
    </text>
  );
}
