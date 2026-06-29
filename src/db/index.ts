import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazily construct the client on first use rather than at import time. This
// keeps `next build` (and importing any module that touches the db) working
// even when DATABASE_URL isn't present in the environment yet — the error is
// only raised when a query actually runs.
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.example)."
    );
  }
  // The neon-http driver speaks to Postgres over HTTP, the right fit for
  // serverless/Fluid Compute: no long-lived TCP pool to leak between
  // invocations. Each query is a stateless fetch.
  const sql = neon(process.env.DATABASE_URL);
  _db = drizzle(sql, { schema });
  return _db;
}

// A thin proxy so callers can keep using `db.select()...` unchanged while the
// real client is created on first property access.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof typeof real];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
