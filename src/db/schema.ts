import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Every time someone feeds the cat we append a row here.
 * `photoUrl` is the Vercel Blob URL of the evidence photo (nullable —
 * a feeding can be logged without a photo).
 */
export const feedings = pgTable("feedings", {
  id: serial("id").primaryKey(),
  fedBy: text("fed_by").notNull(),
  note: text("note"),
  photoUrl: text("photo_url"),
  fedAt: timestamp("fed_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per browser/device that has opted in to push notifications.
 * `endpoint` is unique — it's the URL the push service gave us, and it
 * doubles as the natural key so re-subscribing the same browser upserts.
 */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Feeding = typeof feedings.$inferSelect;
export type NewFeeding = typeof feedings.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
