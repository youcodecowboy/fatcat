"use client";

import { useEffect, useState } from "react";

function format(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Rendered on the client so the "x mins ago" and absolute time reflect the
 * viewer's own timezone, and refresh every minute without a page reload.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const [label, setLabel] = useState(() => format(date));

  useEffect(() => {
    const id = setInterval(() => setLabel(format(date)), 60_000);
    return () => clearInterval(id);
  }, [iso]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <time dateTime={iso} title={date.toLocaleString()}>
      {label}
    </time>
  );
}
