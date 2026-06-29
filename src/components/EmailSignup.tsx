"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeEmail, type SubscribeState } from "@/app/actions";

const initialState: SubscribeState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black"
    >
      {pending ? "Joining…" : "Join"}
    </button>
  );
}

export function EmailSignup() {
  const [state, formAction] = useActionState(subscribeEmail, initialState);
  const [name, setName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Reuse the name already saved by the feed form, if any.
  useEffect(() => {
    const stored = localStorage.getItem("fatcat:name");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setName(stored);
  }, []);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.message]);

  return (
    <section className="rounded-2xl border border-black/10 p-5">
      <h2 className="text-sm font-semibold">📧 Get fed-the-cat emails</h2>
      <p className="mb-3 mt-1 text-sm opacity-70">
        Join the list and we&apos;ll email you every time the cat is fed.
      </p>
      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-600"
        />
        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
          <SubmitButton />
        </div>
        {state.message && (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}
          >
            {state.message}
          </p>
        )}
      </form>
    </section>
  );
}
