"use client";

import { useState } from "react";

export function FaceUpload({
  title,
  hint,
  imageUrl,
  fileName,
  onFile,
  aspect = "10 / 17",
}: {
  title: string;
  hint: string;
  imageUrl: string | null;
  fileName: string | null;
  onFile: (file: File) => void;
  aspect?: string;
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
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{hint}</p>
        </div>
        <span className="shrink-0 text-[11px] tracking-wide text-stone-400 uppercase">{fileName ?? "Sample"}</span>
      </div>
      <div
        className="relative overflow-hidden rounded-xl bg-stone-200/70 dark:bg-white/5"
        style={{ aspectRatio: aspect }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full rounded-t-md object-fill"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-700">Drop an image</div>
        )}
      </div>
    </label>
  );
}
