import Image from "next/image";
import Link from "next/link";
import { FeedForm } from "@/components/FeedForm";
import { NotificationToggle } from "@/components/NotificationToggle";
import { EmailSignup } from "@/components/EmailSignup";
import { RelativeTime } from "@/components/RelativeTime";
import { FeedingList, type FeedingItem } from "@/components/FeedingList";
import { getFeedingsPage, getLastFeeding, PER_PAGE } from "@/lib/feedings";

// Always render fresh — the feeding log changes constantly.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let items: FeedingItem[] = [];
  let total = 0;
  let last: Awaited<ReturnType<typeof getLastFeeding>> | null = null;
  let dbError = false;

  try {
    const [pageData, lastFeeding] = await Promise.all([
      getFeedingsPage(page),
      getLastFeeding(),
    ]);
    total = pageData.total;
    last = lastFeeding;
    items = pageData.rows.map((f) => ({
      id: f.id,
      fedBy: f.fedBy,
      food: f.food,
      portion: f.portion,
      note: f.note,
      photoUrl: f.photoUrl,
      fedAt: new Date(f.fedAt).toISOString(),
    }));
  } catch {
    dbError = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-4xl font-extrabold tracking-tight text-blue-600">
          FatCat
          <Image
            src="/blue-ai.png"
            alt="FatCat mascot"
            width={48}
            height={56}
            priority
            className="inline-block h-12 w-auto"
          />
        </h1>
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

      <EmailSignup />

      <section>
        <h2 className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide opacity-60">
          <span>Recent feedings</span>
          {total > 0 && <span className="font-normal normal-case">{total} total</span>}
        </h2>

        {dbError ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load feedings. Is <code>DATABASE_URL</code> set and
            have you run <code>npm run db:push</code>?
          </p>
        ) : items.length === 0 ? (
          <p className="opacity-60">
            {page > 1 ? "Nothing on this page." : "Be the first to feed the cat! 🍽️"}
          </p>
        ) : (
          <FeedingList items={items} />
        )}

        {totalPages > 1 && (
          <nav className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                href={`/?page=${page - 1}`}
                className="rounded-lg border border-black/10 px-3 py-1.5 hover:bg-black/[0.03]"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="opacity-60">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/?page=${page + 1}`}
                className="rounded-lg border border-black/10 px-3 py-1.5 hover:bg-black/[0.03]"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>

      <footer className="mt-auto pt-4 text-center text-xs opacity-40">
        FatCat — keeping the cat fed, not over-fed.
      </footer>
    </main>
  );
}
