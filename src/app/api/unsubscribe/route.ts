import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

// One-click unsubscribe target. Linked from every email + the List-Unsubscribe
// header, so it must be a plain GET that works without any app state.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  let message = "This unsubscribe link is invalid.";
  if (token) {
    try {
      const deleted = await db
        .delete(subscribers)
        .where(eq(subscribers.unsubscribeToken, token))
        .returning({ email: subscribers.email });
      message = deleted.length
        ? `You've been unsubscribed. We won't email ${deleted[0].email} again.`
        : "You're already unsubscribed.";
    } catch (err) {
      console.error("Unsubscribe failed:", err);
      message = "Something went wrong. Please try again later.";
    }
  }

  const html = `<!doctype html>
  <html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FatCat — Unsubscribe</title></head>
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#fafafa;color:#171717;">
    <div style="text-align:center;padding:24px;max-width:420px;">
      <div style="font-size:48px;">🐱</div>
      <h1 style="font-size:22px;margin:12px 0;">FatCat</h1>
      <p style="color:#555;">${message}</p>
    </div>
  </body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
