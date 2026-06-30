import "server-only";
import { Resend } from "resend";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

const apiKey = process.env.RESEND_API_KEY;
// Sender — cat@gvy.ai is a verified Resend domain, so this can deliver to
// anyone. `|| ` (not `??`) so a blank/sensitive RESEND_FROM falls back to the
// default instead of sending from an empty address.
const from = process.env.RESEND_FROM?.trim() || "FatCat <cat@gvy.ai>";

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
  const details = [input.food, input.portion].filter(Boolean).join(" · ");

  // Hero photo (full-bleed at the top of the card) when one was attached.
  const hero = input.photoUrl
    ? `<tr><td style="padding:0;">
         <img src="${input.photoUrl}" alt="Evidence the cat was fed" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;" />
       </td></tr>`
    : "";

  const detailsRow = details
    ? `<tr><td style="padding:14px 28px 0;">
         <span style="display:inline-block;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:6px 14px;font-size:14px;font-weight:600;">🍽️ ${details}</span>
       </td></tr>`
    : "";

  const noteRow = input.note
    ? `<tr><td style="padding:14px 28px 0;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
           <td style="border-left:3px solid #2563eb;padding:6px 0 6px 14px;color:#555;font-style:italic;font-size:15px;">“${input.note}”</td>
         </tr></table>
       </td></tr>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef2f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">

        <!-- Branded header -->
        <tr><td style="background:#2563eb;padding:22px 28px;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">🐱 FatCat</div>
          <div style="font-size:13px;color:#bfdbfe;margin-top:2px;">The cat has been fed</div>
        </td></tr>

        ${hero}

        <!-- Headline -->
        <tr><td style="padding:24px 28px 0;">
          <h1 style="margin:0;font-size:24px;line-height:1.25;color:#171717;">
            ${input.fedBy} fed the cat 🎉
          </h1>
          <p style="margin:6px 0 0;color:#6b7280;font-size:14px;">${time}</p>
        </td></tr>

        ${detailsRow}
        ${noteRow}

        <!-- CTA -->
        <tr><td style="padding:24px 28px 28px;">
          <a href="${appUrl("/")}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:700;font-size:15px;">Open FatCat →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #eef2f7;padding:18px 28px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            You're on the FatCat feeding list.
            <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>.<br/>
            FatCat — keeping the cat fed, not over-fed.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
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
