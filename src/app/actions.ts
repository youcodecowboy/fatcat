"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { feedings } from "@/db/schema";
import { notifyHousemates } from "@/lib/push";

export type LogFeedingState = {
  ok: boolean;
  message: string;
};

export async function logFeeding(
  _prev: LogFeedingState,
  formData: FormData
): Promise<LogFeedingState> {
  const fedBy = (formData.get("fedBy") as string | null)?.trim() || "Someone";
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
      .values({ fedBy, note, photoUrl })
      .returning();

    // Tell the housemates — fire and forget, but await so errors are logged.
    await notifyHousemates({
      title: "🐱 FatCat has been fed!",
      body: note ? `${fedBy}: ${note}` : `Fed by ${fedBy}`,
      url: "/",
    });

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
