import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Every time someone feeds the cat we append a row here.
 * `photoUrl` is the Vercel Blob URL of the evidence photo (nullable —
 * a feeding can be logged without a photo).
 */
export const feedings = pgTable("feedings", {
  id: serial("id").primaryKey(),
  fedBy: text("fed_by").notNull(),
  food: text("food"),
  portion: text("portion"),
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

/**
 * Email mailing list. A housemate opts in with their email; we email them
 * (via Resend) every time the cat is fed. `unsubscribeToken` backs the
 * one-click unsubscribe link in every email so we never email someone who
 * has opted out.
 */
export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  unsubscribeToken: uuid("unsubscribe_token").notNull().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Feeding = typeof feedings.$inferSelect;
export type NewFeeding = typeof feedings.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
