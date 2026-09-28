"use client";

import { useState } from "react";

export function LogoUpload({
  imageUrl,
  fileName,
  onFile,
}: {
  imageUrl: string | null;
  fileName: string | null;
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
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Brand mark</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Fills the round base</p>
        </div>
        <span className="shrink-0 text-[11px] tracking-wide text-stone-400 uppercase">
          {fileName ?? "Sample"}
        </span>
      </div>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-full bg-[#f6f1e8]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-serif text-sm tracking-[0.22em] text-stone-500">LOGO</span>
        )}
      </div>
    </label>
  );
}
