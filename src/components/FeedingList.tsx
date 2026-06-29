"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { deleteFeeding } from "@/app/actions";
import { RelativeTime } from "@/components/RelativeTime";

export type FeedingItem = {
  id: number;
  fedBy: string;
  food: string | null;
  portion: string | null;
  note: string | null;
  photoUrl: string | null;
  fedAt: string; // ISO string
};

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feeding photo"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-lg text-white hover:bg-white/25"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Feeding evidence"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}

export function FeedingList({ items }: { items: FeedingItem[] }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: number) {
    if (!confirm("Delete this feeding? This can't be undone.")) return;
    setPendingId(id);
    startTransition(async () => {
      await deleteFeeding(id);
      setPendingId(null);
    });
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((f) => (
          <li
            key={f.id}
            className={`flex items-center gap-3 rounded-xl border border-black/10 p-3 transition ${
              pendingId === f.id ? "pointer-events-none opacity-40" : ""
            }`}
          >
            {f.photoUrl ? (
              <button
                type="button"
                onClick={() => setZoom(f.photoUrl)}
                aria-label="View photo"
                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
              >
                <Image
                  src={f.photoUrl}
                  alt="Feeding evidence"
                  width={56}
                  height={56}
                  className="h-14 w-14 object-cover transition group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition group-hover:bg-black/30 group-hover:text-white">
                  🔍
                </span>
              </button>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-2xl">
                🐱
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.fedBy}</p>
              {(f.food || f.portion) && (
                <p className="text-sm opacity-70">
                  🍽️ {[f.food, f.portion].filter(Boolean).join(" · ")}
                </p>
              )}
              {f.note && <p className="truncate text-sm opacity-60">{f.note}</p>}
              <p className="text-xs opacity-50">
                <RelativeTime iso={f.fedAt} />
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(f.id)}
              aria-label={`Delete feeding by ${f.fedBy}`}
              className="shrink-0 rounded-lg p-2 text-lg opacity-50 transition hover:bg-red-50 hover:text-red-600 hover:opacity-100"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>

      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}
