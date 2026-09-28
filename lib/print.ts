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
