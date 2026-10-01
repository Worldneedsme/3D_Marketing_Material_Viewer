/** Landscape A4 single-fold sheet, millimetres. */
export const BLEED_MM = 3;
export const TRIM_W_MM = 297;
export const TRIM_H_MM = 210;
export const SAFE_MM = 5;
export const FULL_W_MM = TRIM_W_MM + BLEED_MM * 2;
export const FULL_H_MM = TRIM_H_MM + BLEED_MM * 2;
export const PANEL_W_MM = TRIM_W_MM / 2;
export const FOLD_X_MM = BLEED_MM + PANEL_W_MM;

/** Craft-paper table tent, one standing face, millimetres. */
export const TENT_W_MM = 100;
export const TENT_H_MM = 170;

/**
 * Flat print pieces. Cut size is the red line.
 * Bleed is 3 mm on every side (the black line is the outer edge of the upload).
 * The magnet template's red line is 68 mm wide by 48 mm tall.
 */
export const FLAT_PRODUCTS = {
  label: { cutW: 95, cutH: 64.5, bleed: 3, safe: 5, depth: 0.6, edge: "#f4f1ea", roughness: 0.42 },
  magnet: { cutW: 68, cutH: 48, bleed: 3, safe: 5, depth: 1.8, edge: "#2c2c2e", roughness: 0.5 },
  card: { cutW: 82, cutH: 50, bleed: 3, safe: 5, depth: 0.45, edge: "#f7f4ee", roughness: 0.7 },
  notepad: { cutW: 148, cutH: 210, bleed: 3, safe: 5, depth: 8, edge: "#f3eee4", roughness: 0.78 },
} as const;

export type FlatId = keyof typeof FLAT_PRODUCTS;

export function flatSheet(id: FlatId) {
  const product = FLAT_PRODUCTS[id];
  return {
    ...product,
    fullW: product.cutW + product.bleed * 2,
    fullH: product.cutH + product.bleed * 2,
  };
}

/** UV window that keeps the red cut line and drops the bleed. */
export function trimUv(cutW: number, cutH: number, bleed: number) {
  const fullW = cutW + bleed * 2;
  const fullH = cutH + bleed * 2;
  return {
    repeatX: cutW / fullW,
    repeatY: cutH / fullH,
    offsetX: bleed / fullW,
    offsetY: bleed / fullH,
  };
}

/** Three.js units: 1 unit = 100 mm. */
export const MM = 0.01;
export const TENT_W = TENT_W_MM * MM;
export const TENT_H = TENT_H_MM * MM;
export const PANEL_W = PANEL_W_MM * MM;
export const PANEL_H = TRIM_H_MM * MM;
export const PAPER_THICKNESS = 0.014;

export type PanelSide = "left" | "right";

export function cropRect(side: PanelSide, mirror: boolean) {
  const uSpan = PANEL_W_MM / FULL_W_MM;
  const vSpan = TRIM_H_MM / FULL_H_MM;
  const u0 = side === "left" ? BLEED_MM / FULL_W_MM : FOLD_X_MM / FULL_W_MM;
  const v0 = BLEED_MM / FULL_H_MM;

  if (mirror) {
    return { repeatX: -uSpan, repeatY: vSpan, offsetX: u0 + uSpan, offsetY: v0 };
  }
  return { repeatX: uSpan, repeatY: vSpan, offsetX: u0, offsetY: v0 };
}
