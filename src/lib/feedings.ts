import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { feedings } from "@/db/schema";

export async function getRecentFeedings(limit = 20) {
  return db.select().from(feedings).orderBy(desc(feedings.fedAt)).limit(limit);
}

export async function getLastFeeding() {
  const [last] = await getRecentFeedings(1);
  return last ?? null;
}
