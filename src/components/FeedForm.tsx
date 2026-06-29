"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { logFeeding, type LogFeedingState } from "@/app/actions";
import { FEEDERS, FOODS, PORTIONS } from "@/lib/options";
import { RainingCats } from "@/components/RainingCats";

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

export function FeedForm() {
  const [state, formAction, isPending] = useActionState(
    logFeeding,
    initialState
  );
  const [fedBy, setFedBy] = useState("");
  const [food, setFood] = useState<string>(FOODS[0]); // Wet food
  const [portion, setPortion] = useState<string>(PORTIONS[1]); // Medium
  const [burst, setBurst] = useState(0); // bumps to retrigger the cat rain
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  // On a successful log: clear note/photo (keep selections) and rain the cats.
  // state.message carries a fresh timestamp each time, so repeated feeds
  // re-fire this effect and bump the burst counter.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBurst((b) => b + 1);
    }
  }, [state.ok, state.message]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);

    const fd = new FormData(e.currentTarget);
    const file = fd.get("photo");
    fd.delete("photo"); // the file never goes to the Server Action

    // Upload the photo straight to Vercel Blob from the browser, then pass
    // only the resulting URL to the action. This avoids the 1MB Server Action
    // body limit that was rejecting phone photos.
    if (file instanceof File && file.size > 0) {
      setUploading(true);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/photo/upload",
          contentType: file.type || undefined,
        });
        fd.set("photoUrl", blob.url);
      } catch (err) {
        console.error("Photo upload failed:", err);
        setUploadError("Photo upload failed — try again or log without a photo.");
        return;
      } finally {
        setUploading(false);
      }
    }

    formAction(fd);
  }

  const busy = uploading || isPending;
  const buttonLabel = uploading
    ? "Uploading photo…"
    : isPending
      ? "Logging…"
      : !fedBy
        ? "Pick who's feeding 👆"
        : "🍽️  Feed the cat";

  return (
    <>
      <RainingCats trigger={burst} />
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
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
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-blue-700"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !fedBy}
          className="w-full rounded-2xl bg-blue-600 px-6 py-5 text-xl font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-blue-700 disabled:opacity-50"
        >
          {buttonLabel}
        </button>

        {(uploadError || state.message) && (
          <p
            role="status"
            className={`text-center text-sm ${
              !uploadError && state.ok ? "text-green-600" : "text-red-600"
            }`}
          >
            {uploadError ?? state.message}
          </p>
        )}
      </form>
    </>
  );
}
