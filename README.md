# FatCat 🐱

A dead-simple feeding tracker for our cat. Tap one button to log that the cat's
been fed, optionally attach an evidence photo, and your housemates get a push
notification so nobody double-feeds.

## Stack

| Concern         | Tech                                              |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19                |
| Hosting         | Vercel (Fluid Compute)                            |
| Database        | Neon Postgres via `@neondatabase/serverless`      |
| ORM / migrations| Drizzle ORM + drizzle-kit                         |
| Photo storage   | Vercel Blob                                       |
| Notifications   | Web Push (VAPID) + a service worker               |

## How it works

- **`src/app/page.tsx`** — server component. Loads recent feedings from Neon and
  renders the button + history.
- **`src/app/actions.ts`** — the `logFeeding` Server Action. Uploads the photo to
  Vercel Blob, inserts the feeding row, and fans out push notifications. No REST
  layer needed.
- **`src/lib/push.ts`** — sends Web Push notifications to every subscribed
  housemate and prunes dead subscriptions.
- **`src/components/`** — `FeedForm` (the button + photo), `NotificationToggle`
  (opt in/out of push), `RelativeTime` (timezone-correct "x mins ago").
- **`public/sw.js`** — service worker that displays incoming push notifications.
- **`src/db/`** — Drizzle schema (`feedings`, `push_subscriptions`) and the
  lazily-initialized Neon client.

## Local development

1. **Install deps** (already done if you scaffolded):

   ```bash
   npm install
   ```

2. **Create `.env.local`** from the template and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

3. **Provision a Neon database.** Either create one in the
   [Neon console](https://console.neon.tech) or, on Vercel, add the **Neon**
   Marketplace integration to the project — then `vercel env pull .env.local`
   to grab `DATABASE_URL`.

4. **Generate VAPID keys** for Web Push (once):

   ```bash
   npm run gen:vapid
   ```

   Copy the `publicKey` into `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `privateKey` into
   `VAPID_PRIVATE_KEY` in `.env.local`.

5. **Set up a Vercel Blob store** and put its `BLOB_READ_WRITE_TOKEN` in
   `.env.local` (auto-provisioned once you add a Blob store on Vercel).

6. **Create the database tables:**

   ```bash
   npm run db:push     # push the Drizzle schema straight to Neon
   ```

7. **Run it:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

> **Note on notifications locally:** Web Push requires a secure context.
> `localhost` counts as secure, so push works in local dev — but the photo
> `capture` camera and installable PWA behaviour shine on a real HTTPS URL
> (i.e. once deployed).

## Database scripts

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `npm run db:push`     | Sync the schema to Neon (no migration files)        |
| `npm run db:generate` | Generate SQL migration files into `./drizzle`       |
| `npm run db:studio`   | Open Drizzle Studio to browse the data              |
| `npm run gen:vapid`   | Generate a VAPID keypair for Web Push               |

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the **Neon** and **Blob** integrations (auto-set `DATABASE_URL` and
   `BLOB_READ_WRITE_TOKEN`).
3. Add the three VAPID env vars (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) in Project Settings → Environment
   Variables.
4. Run `npm run db:push` against the production database once (or wire it into
   your deploy step).
5. Deploy. Each housemate opens the URL and taps **Turn on notifications** once.

## Environment variables

See [`.env.example`](.env.example) for the full list and where each comes from.
