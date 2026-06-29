"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { logFeeding, type LogFeedingState } from "@/app/actions";

const initialState: LogFeedingState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-orange-500 px-6 py-5 text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-orange-600 disabled:opacity-60"
    >
      {pending ? "Logging…" : "🍽️  Feed the cat"}
    </button>
  );
}

export function FeedForm() {
  const [state, formAction] = useActionState(logFeeding, initialState);
  const [name, setName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Remember who's using this device so they don't retype their name.
  // Reading localStorage must happen after mount to avoid an SSR hydration
  // mismatch, so a one-time setState in this effect is intentional.
  useEffect(() => {
    const stored = localStorage.getItem("fatcat:name");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setName(stored);
  }, []);

  useEffect(() => {
    if (name) localStorage.setItem("fatcat:name", name);
  }, [name]);

  // Clear the note/photo after a successful log (keep the name).
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.message]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Your name
        <input
          name="fedBy"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kristian"
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-orange-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Note <span className="font-normal opacity-60">(optional)</span>
        <input
          name="note"
          placeholder="Half a tin of tuna"
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-orange-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Evidence photo <span className="font-normal opacity-60">(optional)</span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-orange-700"
        />
      </label>

      <SubmitButton />

      {state.message && (
        <p
          role="status"
          className={`text-center text-sm ${
            state.ok ? "text-green-600" : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
