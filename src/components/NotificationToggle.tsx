"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Web Push expects the VAPID key as a Uint8Array, not the base64url string.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export function NotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Run detection in an async callback so we never call setState
    // synchronously in the effect body (avoids cascading renders).
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !VAPID_PUBLIC_KEY
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        // getRegistration() resolves immediately (to undefined if none),
        // unlike .ready which blocks until a worker is active.
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          label: localStorage.getItem("fatcat:name"),
        }),
      });
      setStatus("on");
    } catch (err) {
      console.error("Failed to enable notifications:", err);
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      console.error("Failed to disable notifications:", err);
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  const text: Record<Status, string> = {
    loading: "",
    unsupported: "🔕 Notifications aren't supported on this device.",
    denied: "🔕 Notifications are blocked — enable them in browser settings.",
    off: "🔔 Turn on notifications",
    on: "✅ Notifications on — tap to turn off",
  };

  const clickable = status === "off" || status === "on";

  return (
    <button
      type="button"
      disabled={!clickable || busy}
      onClick={status === "on" ? disable : enable}
      className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-medium transition disabled:opacity-70 enabled:hover:bg-black/[0.03]"
    >
      {busy ? "Working…" : text[status]}
    </button>
  );
}
