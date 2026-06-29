"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { logFeeding, type LogFeedingState } from "@/app/actions";
import { FEEDERS, FOODS, PORTIONS } from "@/lib/options";

const initialState: LogFeedingState = { ok: false, message: "" };

function Pills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
                selected
                  ? "border-blue-600 bg-blue-600 text-white shadow"
                  : "border-black/15 hover:border-blue-500"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "Logging…" : disabled ? "Pick who's feeding 👆" : "🍽️  Feed the cat"}
    </button>
  );
}

export function FeedForm() {
  const [state, formAction] = useActionState(logFeeding, initialState);
  const [fedBy, setFedBy] = useState("");
  const [food, setFood] = useState<string>(FOODS[0]); // Wet food
  const [portion, setPortion] = useState<string>(PORTIONS[1]); // Medium
  const formRef = useRef<HTMLFormElement>(null);

  // Preselect the feeder used last on this device.
  useEffect(() => {
    const stored = localStorage.getItem("fatcat:name");
    if (stored && FEEDERS.includes(stored as (typeof FEEDERS)[number])) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFedBy(stored);
    }
  }, []);

  // Remember the feeder for next time.
  useEffect(() => {
    if (fedBy) localStorage.setItem("fatcat:name", fedBy);
  }, [fedBy]);

  // Clear the note/photo after a successful log (keep the selections).
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok, state.message]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {/* Selections are controlled by state and submitted via hidden inputs. */}
      <input type="hidden" name="fedBy" value={fedBy} />
      <input type="hidden" name="food" value={food} />
      <input type="hidden" name="portion" value={portion} />

      <Pills label="Who's feeding?" options={FEEDERS} value={fedBy} onChange={setFedBy} />
      <Pills label="Food" options={FOODS} value={food} onChange={setFood} />
      <Pills label="Portion" options={PORTIONS} value={portion} onChange={setPortion} />

      <label className="flex flex-col gap-1 text-sm font-medium">
        Note <span className="font-normal opacity-60">(optional)</span>
        <input
          name="note"
          placeholder="e.g. seemed extra hungry"
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-blue-600"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Evidence photo <span className="font-normal opacity-60">(optional)</span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-blue-700"
        />
      </label>

      <SubmitButton disabled={!fedBy} />

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
