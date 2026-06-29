import { NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

// Register (or refresh) a browser's push subscription.
export async function POST(request: Request) {
  try {
    const { subscription, label } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      );
    }

    await db
      .insert(pushSubscriptions)
      .values({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        label: label ?? null,
      })
      // Same browser re-subscribing? Update its keys instead of erroring.
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          label: label ?? null,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save subscription:", err);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

// Remove a subscription (e.g. the user turns notifications off).
export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    if (endpoint) {
      const { eq } = await import("drizzle-orm");
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, endpoint));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete subscription:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
