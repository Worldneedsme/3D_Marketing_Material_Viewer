import { FULL_H_MM, FULL_W_MM, FOLD_X_MM } from "@/lib/print";

const PX = 4;

function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  kicker: string,
  title: string,
  foot: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x + 28, y + 28, w - 56, 8);

  ctx.fillStyle = "#f7f3ea";
  ctx.font = "600 18px Geist, ui-sans-serif, sans-serif";
  ctx.fillText(kicker, x + 36, y + h * 0.42);
  ctx.font = "500 42px Georgia, 'Times New Roman', serif";
  ctx.fillText(title, x + 36, y + h * 0.42 + 52);
  ctx.font = "400 16px Geist, ui-sans-serif, sans-serif";
  ctx.fillStyle = "rgba(247,243,234,0.78)";
  ctx.fillText(foot, x + 36, y + h * 0.42 + 84);
}

export function createDemoSheet(kind: "outside" | "inside") {
  const canvas = document.createElement("canvas");
  canvas.width = FULL_W_MM * PX;
  canvas.height = FULL_H_MM * PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.scale(PX, PX);
  ctx.fillStyle = kind === "outside" ? "#1c2430" : "#efe6d6";
  ctx.fillRect(0, 0, FULL_W_MM, FULL_H_MM);

  if (kind === "outside") {
    panel(ctx, 0, 0, FOLD_X_MM, FULL_H_MM, "#1e3a4c", "OUTSIDE  ·  LEFT", "Back cover", "Extends through the bleed");
    panel(
      ctx,
      FOLD_X_MM,
      0,
      FULL_W_MM - FOLD_X_MM,
      FULL_H_MM,
      "#8c3d2f",
      "OUTSIDE  ·  RIGHT",
      "Front cover",
      "This face shows when closed",
    );
  } else {
    panel(ctx, 0, 0, FOLD_X_MM, FULL_H_MM, "#3f5c4b", "INSIDE  ·  LEFT", "Page two", "Visible on the open spread");
    panel(
      ctx,
      FOLD_X_MM,
      0,
      FULL_W_MM - FOLD_X_MM,
      FULL_H_MM,
      "#a68448",
      "INSIDE  ·  RIGHT",
      "Page three",
      "Visible on the open spread",
    );
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}
