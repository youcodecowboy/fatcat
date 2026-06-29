import Image from "next/image";
import { FeedForm } from "@/components/FeedForm";
import { NotificationToggle } from "@/components/NotificationToggle";
import { RelativeTime } from "@/components/RelativeTime";
import { getRecentFeedings } from "@/lib/feedings";

// Always render fresh — the feeding log changes constantly.
export const dynamic = "force-dynamic";

export default async function Home() {
  let feedings: Awaited<ReturnType<typeof getRecentFeedings>> = [];
  let dbError = false;
  try {
    feedings = await getRecentFeedings(20);
  } catch {
    dbError = true;
  }

  const last = feedings[0];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">FatCat 🐱</h1>
        <p className="mt-1 opacity-70">
          {last ? (
            <>
              Last fed by <strong>{last.fedBy}</strong>,{" "}
              <RelativeTime iso={new Date(last.fedAt).toISOString()} />
            </>
          ) : (
            "No feedings logged yet."
          )}
        </p>
      </header>

      <section className="rounded-2xl border border-black/10 p-5">
        <FeedForm />
      </section>

      <NotificationToggle />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">
          Recent feedings
        </h2>

        {dbError ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load feedings. Is <code>DATABASE_URL</code> set and
            have you run <code>npm run db:push</code>?
          </p>
        ) : feedings.length === 0 ? (
          <p className="opacity-60">Be the first to feed the cat! 🍽️</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedings.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-xl border border-black/10 p-3"
              >
                {f.photoUrl ? (
                  <Image
                    src={f.photoUrl}
                    alt="Feeding evidence"
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-2xl">
                    🐱
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.fedBy}</p>
                  {f.note && (
                    <p className="truncate text-sm opacity-70">{f.note}</p>
                  )}
                  <p className="text-xs opacity-50">
                    <RelativeTime iso={new Date(f.fedAt).toISOString()} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-auto pt-4 text-center text-xs opacity-40">
        FatCat — keeping the cat fed, not over-fed.
      </footer>
    </main>
  );
}
