import "server-only";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { feedings } from "@/db/schema";

export const PER_PAGE = 8;

export async function getLastFeeding() {
  const [last] = await db
    .select()
    .from(feedings)
    .orderBy(desc(feedings.fedAt))
    .limit(1);
  return last ?? null;
}

/** One page of feedings (newest first) plus the total count for pagination. */
export async function getFeedingsPage(page: number, perPage = PER_PAGE) {
  const offset = (page - 1) * perPage;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(feedings)
      .orderBy(desc(feedings.fedAt))
      .limit(perPage)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(feedings),
  ]);
  return { rows, total };
}
