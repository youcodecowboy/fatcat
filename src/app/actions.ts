"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { feedings, subscribers } from "@/db/schema";
import { notifyHousemates } from "@/lib/push";
import { emailSubscribersFed } from "@/lib/email";

export type LogFeedingState = {
  ok: boolean;
  message: string;
};

export type SubscribeState = {
  ok: boolean;
  message: string;
};

export async function deleteFeeding(id: number): Promise<{ ok: boolean }> {
  try {
    const [row] = await db
      .select()
      .from(feedings)
      .where(eq(feedings.id, id))
      .limit(1);
    if (!row) return { ok: true }; // already gone

    // Remove the evidence photo from Blob first so we don't orphan it.
    if (row.photoUrl) {
      try {
        await del(row.photoUrl);
      } catch (err) {
        console.error("Failed to delete blob photo:", err);
      }
    }

    await db.delete(feedings).where(eq(feedings.id, id));
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("Failed to delete feeding:", err);
    return { ok: false };
  }
}

// Pragmatic email check — good enough to catch typos without being strict.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeEmail(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const name = (formData.get("name") as string | null)?.trim() || null;

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, message: "That doesn't look like a valid email." };
  }

  try {
    await db
      .insert(subscribers)
      .values({ email, name })
      // Already on the list? Just refresh their name — no duplicate, no error.
      .onConflictDoUpdate({
        target: subscribers.email,
        set: { name },
      });
    return {
      ok: true,
      message: "You're on the list! You'll get an email each time the cat's fed.",
    };
  } catch (err) {
    console.error("Failed to subscribe:", err);
    return { ok: false, message: "Couldn't sign you up. Please try again." };
  }
}

export async function logFeeding(
  _prev: LogFeedingState,
  formData: FormData
): Promise<LogFeedingState> {
  const fedBy = (formData.get("fedBy") as string | null)?.trim() || "Someone";
  const food = (formData.get("food") as string | null)?.trim() || null;
  const portion = (formData.get("portion") as string | null)?.trim() || null;
  const note = (formData.get("note") as string | null)?.trim() || null;
  const photo = formData.get("photo");

  let photoUrl: string | null = null;

  // Upload the evidence photo to Vercel Blob if one was provided.
  if (photo instanceof File && photo.size > 0) {
    try {
      const ext = photo.name.split(".").pop() || "jpg";
      const blob = await put(`feedings/${Date.now()}.${ext}`, photo, {
        access: "public",
        addRandomSuffix: true,
      });
      photoUrl = blob.url;
    } catch (err) {
      console.error("Blob upload failed:", err);
      return {
        ok: false,
        message:
          "Couldn't upload the photo. Is BLOB_READ_WRITE_TOKEN configured?",
      };
    }
  }

  try {
    const [row] = await db
      .insert(feedings)
      .values({ fedBy, food, portion, note, photoUrl })
      .returning();

    // e.g. "Wet food · Medium" — used in the push body.
    const details = [food, portion].filter(Boolean).join(" · ");

    // Notify housemates two ways: web push + email. Run them together; neither
    // should block the feeding from being recorded if it fails.
    await Promise.allSettled([
      notifyHousemates({
        title: "🐱 FatCat has been fed!",
        body: [`${fedBy} fed the cat`, details, note]
          .filter(Boolean)
          .join(" — "),
        url: "/",
      }),
      emailSubscribersFed({ fedBy, food, portion, note, photoUrl, fedAt: row.fedAt }),
    ]);

    revalidatePath("/");
    return {
      ok: true,
      message: `Logged at ${new Date(row.fedAt).toLocaleTimeString()}. Housemates notified.`,
    };
  } catch (err) {
    console.error("Failed to record feeding:", err);
    return {
      ok: false,
      message: "Couldn't record the feeding. Is DATABASE_URL configured?",
    };
  }
}
