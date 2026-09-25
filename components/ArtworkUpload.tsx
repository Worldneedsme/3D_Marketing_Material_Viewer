"use client";

import { useState } from "react";
import { GuidelineOverlay } from "@/components/GuidelineOverlay";

export function ArtworkUpload({
  title,
  hint,
  imageUrl,
  fileName,
  guides,
  labels,
  onFile,
}: {
  title: string;
  hint: string;
  imageUrl: string | null;
  fileName: string | null;
  guides: boolean;
  labels: { left: string; right: string };
  onFile: (file: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <label
      className={`block cursor-pointer rounded-2xl border p-3 transition ${
        dragOver
          ? "border-amber-500 bg-amber-500/10"
          : "border-black/10 bg-white/70 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{hint}</p>
        </div>
        <span className="shrink-0 text-[11px] uppercase tracking-wide text-stone-400">
          {fileName ?? "Sample"}
        </span>
      </div>
      <div className="relative aspect-[303/216] overflow-hidden rounded-xl bg-stone-200 dark:bg-stone-800">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-fill" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-500">Drop an image</div>
        )}
        {guides && imageUrl ? <GuidelineOverlay labels={labels} /> : null}
      </div>
    </label>
  );
}
