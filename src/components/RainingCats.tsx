"use client";

import { useEffect, useState } from "react";

// The two cat stickers that rain down. Each drop randomly picks one.
const SOURCES = ["/cat-confetti.webp", "/cat-confetti-2.png"] as const;

type Drop = {
  id: number;
  src: string; // which sticker
  left: number; // vw position
  size: number; // px
  duration: number; // s
  delay: number; // s
  sway: number; // px horizontal drift
  rotate: number; // deg total spin
};

const COUNT = 28;

function makeDrops(seed: number): Drop[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    id: seed * 1000 + i,
    src: SOURCES[Math.floor(Math.random() * SOURCES.length)],
    left: Math.random() * 100,
    size: 36 + Math.random() * 52,
    duration: 2.2 + Math.random() * 1.8,
    delay: Math.random() * 0.7,
    sway: (Math.random() - 0.5) * 140,
    rotate: (Math.random() - 0.5) * 1080,
  }));
}

/**
 * Full-screen overlay that rains the cat photo down when `trigger` changes.
 * Purely decorative: pointer-events are off and it self-clears once the
 * longest-running drop has fallen.
 */
export function RainingCats({ trigger }: { trigger: number }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    if (trigger <= 0) return;
    const batch = makeDrops(trigger);
    // Animation is driven by the `trigger` prop changing — firing state here
    // on that change is the intended behaviour, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrops(batch);

    const maxMs =
      Math.max(...batch.map((d) => d.duration + d.delay)) * 1000 + 200;
    const timer = setTimeout(() => setDrops([]), maxMs);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (drops.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {drops.map((d) => (
        <div
          key={d.id}
          className="absolute top-0"
          style={{
            left: `${d.left}vw`,
            width: d.size,
            height: d.size,
            animation: `cat-fall ${d.duration}s linear ${d.delay}s forwards`,
            // consumed by the @keyframes via var()
            ["--sway" as string]: `${d.sway}px`,
            ["--fall-rotate" as string]: `${d.rotate}deg`,
          }}
        >
          {imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.src}
              alt=""
              width={d.size}
              height={d.size}
              onError={() => setImgOk(false)}
              className="h-full w-full object-contain drop-shadow-md"
            />
          ) : (
            <span
              style={{ fontSize: d.size * 0.9, lineHeight: 1 }}
              role="img"
              aria-hidden
            >
              🐱
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
