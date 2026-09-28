"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArtworkUpload } from "@/components/ArtworkUpload";
import type { LightMode, Pose } from "@/components/BrochureCanvas";
import { FaceUpload } from "@/components/FaceUpload";
import { LogoUpload } from "@/components/LogoUpload";
import { createDemoSheet, createTentFace } from "@/lib/demoArt";

const YARNS = [
  ["#e7a3b5", "Blush"],
  ["#e2b04a", "Marigold"],
] as const;

const BrochureCanvas = dynamic(() => import("@/components/BrochureCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-stone-500">Preparing the press sheet…</div>
  ),
});

const CoasterCanvas = dynamic(() => import("@/components/CoasterCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-stone-500">Winding the yarn…</div>
  ),
});

const TentCanvas = dynamic(() => import("@/components/TentCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-stone-500">Folding the tent…</div>
  ),
});

const COPY = {
  brochure: {
    kicker: "A4 single fold",
    title: "Brochure preview",
    blurb: "Landscape sheet 297 × 210 mm, with 3 mm bleed. A credit card, a one-dollar bill, and an iPhone 17 stand beside it at real size.",
  },
  coaster: {
    kicker: "Cup coaster",
    title: "Crochet coaster",
    blurb: "A round yarn coaster. A credit card, a one-dollar bill, and an iPhone 17 stand beside it at real size.",
  },
  tent: {
    kicker: "White card",
    title: "Table tent",
    blurb: "The same tent shape, sized to 10 cm wide and 17 cm tall. A credit card, a one-dollar bill, and an iPhone 17 stand beside it at real size.",
  },
} as const;

type Artwork = { url: string; name: string | null; owned: boolean };
type Section = "brochure" | "coaster" | "tent";
type Slot = "outside" | "inside" | "logo" | "front" | "back";

export function Studio() {
  const [section, setSection] = useState<Section>("brochure");
  const [outside, setOutside] = useState<Artwork | null>(null);
  const [inside, setInside] = useState<Artwork | null>(null);
  const [logo, setLogo] = useState<Artwork | null>(null);
  const [front, setFront] = useState<Artwork | null>(null);
  const [back, setBack] = useState<Artwork | null>(null);
  const [yarn, setYarn] = useState("#e7a3b5");
  const [guides, setGuides] = useState(true);
  const [mode, setMode] = useState<LightMode>("daylight");
  const [pose, setPose] = useState<Pose>("stand");
  const [fold, setFold] = useState(28);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setOutside((current) => current ?? { url: createDemoSheet("outside"), name: null, owned: false });
    setInside((current) => current ?? { url: createDemoSheet("inside"), name: null, owned: false });
    setFront((current) => current ?? { url: createTentFace("front"), name: null, owned: false });
    setBack((current) => current ?? { url: createTentFace("back"), name: null, owned: false });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function takeFile(file: File, which: Slot) {
    if (!file.type.startsWith("image/")) return;
    const next = { url: URL.createObjectURL(file), name: file.name, owned: true };
    const apply =
      which === "outside"
        ? setOutside
        : which === "inside"
          ? setInside
          : which === "logo"
            ? setLogo
            : which === "front"
              ? setFront
              : setBack;
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
              {COPY[section].kicker}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{COPY[section].title}</h1>
            <p className="mt-1 text-sm leading-5 text-stone-500 dark:text-stone-400">{COPY[section].blurb}</p>
          </div>
          <button
            type="button"
            onClick={() => setDark((value) => !value)}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium dark:border-white/15"
          >
            {dark ? "Light UI" : "Dark UI"}
          </button>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["brochure", "Brochure"],
              ["coaster", "Coaster"],
              ["tent", "Tent"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSection(value)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                section === value
                  ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-amber-200 dark:bg-amber-200 dark:text-stone-950"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === "coaster" ? (
          <>
            <LogoUpload imageUrl={logo?.url ?? null} fileName={logo?.name ?? null} onFile={(file) => takeFile(file, "logo")} />
            <div>
              <p className="mb-2 text-sm font-medium">Edge yarn</p>
              <div className="grid grid-cols-2 gap-2">
                {YARNS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setYarn(value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      yarn === value
                        ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-amber-200 dark:bg-amber-200 dark:text-stone-950"
                        : "border-black/10 dark:border-white/10"
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: value }} />
                    {label}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
                Custom yarn
                <input
                  type="color"
                  value={yarn}
                  onChange={(event) => setYarn(event.target.value)}
                  aria-label="Custom yarn color"
                  className="h-8 w-12 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/10"
                />
              </label>
            </div>
          </>
        ) : null}

        {section === "brochure" ? (
        <>
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
          <p className="mb-2 text-sm font-medium">Placement</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["stand", "Standing"],
                ["table", "On the table"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPose(value)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  pose === value
                    ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-amber-200 dark:bg-amber-200 dark:text-stone-950"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
            {pose === "stand"
              ? "The sheet stands upright on the table."
              : "The open spread lies flat, inside facing the sky. The cover page turns across the spine."}
          </p>
        </div>

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
            <span>{pose === "table" ? "Page turned" : "Closed"}</span>
          </div>
        </label>
        </>
        ) : null}

        {section === "tent" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FaceUpload
                title="Front"
                hint="Prints on the front face"
                imageUrl={front?.url ?? null}
                fileName={front?.name ?? null}
                onFile={(file) => takeFile(file, "front")}
              />
              <FaceUpload
                title="Back"
                hint="Prints on the back face"
                imageUrl={back?.url ?? null}
                fileName={back?.name ?? null}
                onFile={(file) => takeFile(file, "back")}
              />
            </div>
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
            </div>
          </>
        ) : null}

        {section === "coaster" ? (
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
          </div>
        ) : null}
      </aside>

      <main className="relative min-h-0 flex-1">
        {section === "brochure" ? (
        <BrochureCanvas
          fold={fold}
          mode={mode}
          pose={pose}
          outsideUrl={outside?.url ?? null}
          insideUrl={inside?.url ?? null}
        />
        ) : section === "coaster" ? (
          <CoasterCanvas mode={mode} yarn={yarn} logoUrl={logo?.url ?? null} />
        ) : (
          <TentCanvas mode={mode} frontUrl={front?.url ?? null} backUrl={back?.url ?? null} />
        )}
        <p className="pointer-events-none absolute bottom-4 left-4 text-xs text-stone-600/80 dark:text-stone-300/70">
          Drag to orbit · scroll to zoom
        </p>
      </main>
    </div>
  );
}
