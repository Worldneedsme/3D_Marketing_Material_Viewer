"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArtworkUpload } from "@/components/ArtworkUpload";
import type { LightMode } from "@/components/BrochureCanvas";
import { createDemoSheet } from "@/lib/demoArt";

const BrochureCanvas = dynamic(() => import("@/components/BrochureCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-stone-500">Preparing the press sheet…</div>
  ),
});

type Artwork = { url: string; name: string | null; owned: boolean };

export function Studio() {
  const [outside, setOutside] = useState<Artwork | null>(null);
  const [inside, setInside] = useState<Artwork | null>(null);
  const [guides, setGuides] = useState(true);
  const [mode, setMode] = useState<LightMode>("daylight");
  const [fold, setFold] = useState(28);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setOutside((current) => current ?? { url: createDemoSheet("outside"), name: null, owned: false });
    setInside((current) => current ?? { url: createDemoSheet("inside"), name: null, owned: false });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function takeFile(file: File, which: "outside" | "inside") {
    if (!file.type.startsWith("image/")) return;
    const next = { url: URL.createObjectURL(file), name: file.name, owned: true };
    const apply = which === "outside" ? setOutside : setInside;
    apply((current) => {
      if (current?.owned) URL.revokeObjectURL(current.url);
      return next;
    });
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-100 text-stone-900 md:flex-row dark:bg-stone-950 dark:text-stone-100">
      <aside className="flex max-h-[48vh] w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-black/10 bg-stone-50 px-5 py-5 md:max-h-none md:w-[400px] md:border-r md:border-b-0 dark:border-white/10 dark:bg-stone-950">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-stone-500 uppercase dark:text-stone-400">
              A4 single fold
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Brochure preview</h1>
            <p className="mt-1 text-sm leading-5 text-stone-500 dark:text-stone-400">
              Landscape sheet 297 × 210 mm, with 3 mm bleed. The 3D model shows only the cut area.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDark((value) => !value)}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium dark:border-white/15"
          >
            {dark ? "Light UI" : "Dark UI"}
          </button>
        </header>

        <ArtworkUpload
          title="Outside"
          hint="Back cover · front cover"
          imageUrl={outside?.url ?? null}
          fileName={outside?.name ?? null}
          guides={guides}
          labels={{ left: "Back cover", right: "Front cover" }}
          onFile={(file) => takeFile(file, "outside")}
        />
        <ArtworkUpload
          title="Inside"
          hint="Page two · page three"
          imageUrl={inside?.url ?? null}
          fileName={inside?.name ?? null}
          guides={guides}
          labels={{ left: "Page two", right: "Page three" }}
          onFile={(file) => takeFile(file, "inside")}
        />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Print guides</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Bleed, cut, safe zone, and fold</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={guides}
            onClick={() => setGuides((value) => !value)}
            className={`relative h-7 w-12 rounded-full transition ${guides ? "bg-stone-900 dark:bg-amber-200" : "bg-stone-300 dark:bg-stone-700"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition dark:bg-stone-950 ${guides ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {guides ? (
          <ul className="grid gap-1.5 text-xs text-stone-600 dark:text-stone-300">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-black" />
              Black — end of the bleed. Artwork must reach this frame.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
              Red — cut line. The sheet is trimmed here.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-700" />
              Blue — safe zone, 5 mm inside the cut.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-px w-2.5 border-t border-dashed border-black dark:border-white" />
              Fold — vertical center, 148.5 mm.
            </li>
          </ul>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium">Lighting</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["daylight", "Daylight"],
                ["cinematic", "Cinematic"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  mode === value
                    ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-amber-200 dark:bg-amber-200 dark:text-stone-950"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
            {mode === "daylight"
              ? "Bright ambient light with a soft directional sun."
              : "Low ambient light and a hard spotlight across the sheet."}
          </p>
        </div>

        <label className="block">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium">Fold</span>
            <span className="font-mono text-xs text-stone-500">{Math.round(fold)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={fold}
            onChange={(event) => setFold(Number(event.target.value))}
            className="fold-slider w-full"
            aria-valuemin={0}
            aria-valuemax={180}
            aria-valuenow={Math.round(fold)}
          />
          <div className="mt-1 flex justify-between text-[11px] tracking-wide text-stone-400 uppercase">
            <span>Open</span>
            <span>Closed</span>
          </div>
        </label>
      </aside>

      <main className="relative min-h-0 flex-1">
        <BrochureCanvas
          fold={fold}
          mode={mode}
          outsideUrl={outside?.url ?? null}
          insideUrl={inside?.url ?? null}
        />
        <p className="pointer-events-none absolute bottom-4 left-4 text-xs text-stone-600/80 dark:text-stone-300/70">
          Drag to orbit · scroll to zoom
        </p>
      </main>
    </div>
  );
}
