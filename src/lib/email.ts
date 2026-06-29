import "server-only";
import { Resend } from "resend";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

const apiKey = process.env.RESEND_API_KEY;
// Sender. Until a custom domain is verified in Resend, the only address that
// works is `onboarding@resend.dev` (and it can only deliver to your own
// Resend account email). Override with RESEND_FROM once a domain is verified.
const from = process.env.RESEND_FROM ?? "FatCat 🐱 <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

/** Absolute URL for the app, used to build links inside emails. */
export function appUrl(path = "/"): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return new URL(path, base).toString();
}

type FedEmailInput = {
  fedBy: string;
  food: string | null;
  portion: string | null;
  note: string | null;
  photoUrl: string | null;
  fedAt: Date;
};

function renderHtml(input: FedEmailInput, unsubscribeUrl: string): string {
  const time = input.fedAt.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
  const photo = input.photoUrl
    ? `<img src="${input.photoUrl}" alt="Evidence the cat was fed" style="width:100%;max-width:480px;border-radius:12px;margin:16px 0;" />`
    : "";
  const details = [input.food, input.portion].filter(Boolean).join(" · ");
  const detailsRow = details
    ? `<p style="margin:6px 0 0;"><span style="display:inline-block;background:#fff7ed;color:#c2410c;border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600;">🍽️ ${details}</span></p>`
    : "";
  const note = input.note
    ? `<p style="margin:8px 0 0;color:#555;font-style:italic;">“${input.note}”</p>`
    : "";

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717;">
    <h1 style="font-size:28px;margin:0 0 4px;">🐱 FatCat has been fed!</h1>
    <p style="margin:0;color:#555;">Fed by <strong>${input.fedBy}</strong> · ${time}</p>
    ${detailsRow}
    ${note}
    ${photo}
    <a href="${appUrl("/")}" style="display:inline-block;margin-top:16px;background:#f97316;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold;">Open FatCat</a>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 12px;" />
    <p style="font-size:12px;color:#999;margin:0;">
      You're getting this because you joined the FatCat feeding list.
      <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>.
    </p>
  </div>`;
}

function renderText(input: FedEmailInput, unsubscribeUrl: string): string {
  const lines = [
    "🐱 FatCat has been fed!",
    `Fed by ${input.fedBy} at ${input.fedAt.toLocaleString()}`,
  ];
  const details = [input.food, input.portion].filter(Boolean).join(" · ");
  if (details) lines.push(details);
  if (input.note) lines.push(`Note: ${input.note}`);
  if (input.photoUrl) lines.push(`Photo: ${input.photoUrl}`);
  lines.push("", `Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

/**
 * Email every subscriber that the cat has been fed. Each recipient gets their
 * own message with a personalised unsubscribe link. Failures are logged but
 * never block the feeding from being recorded.
 */
export async function emailSubscribersFed(input: FedEmailInput): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — email notifications disabled.");
    return;
  }

  const list = await db.select().from(subscribers);
  if (list.length === 0) return;

  await Promise.all(
    list.map(async (sub) => {
      const unsubscribeUrl = appUrl(
        `/api/unsubscribe?token=${sub.unsubscribeToken}`
      );
      try {
        await resend.emails.send({
          from,
          to: sub.email,
          subject: "🐱 FatCat has been fed!",
          html: renderHtml(input, unsubscribeUrl),
          text: renderText(input, unsubscribeUrl),
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        });
      } catch (err) {
        console.error(`Failed to email ${sub.email}:`, err);
      }
    })
  );
}
