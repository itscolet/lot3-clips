// Email (Resend) + SMS (Twilio). Everything is logged to `notifications`.
// Missing keys never break a user flow: sends are logged as "skipped" instead.
import { after } from "next/server";
import { supabaseService } from "./supabase/server";
import {
  SITE,
  adminClaimEmail,
  adminTicketEmail,
  campaignEmail,
  campaignSms,
  supportReplyEmail,
  testEmail,
  type CampaignInfo,
} from "./notify-templates";

type Lang = "en" | "es";
const env = (k: string) => process.env[k]?.trim() || "";

export const notifyConfig = () => ({
  email: !!env("RESEND_API_KEY"),
  sms: !!(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_FROM")),
  from: env("EMAIL_FROM") || "LOT3 Clips <campaigns@lot3clips.com>",
  adminEmail: env("ADMIN_ALERT_EMAIL") || "admin@lot3media.com",
  adminPhone: env("ADMIN_ALERT_PHONE"),
  postal: env("EMAIL_POSTAL_ADDRESS"),
  service: !!env("SUPABASE_SERVICE_ROLE_KEY"),
});

type Meta = { kind: string; user_id?: string | null; campaign_id?: string | null; ticket_id?: string | null; is_test?: boolean };
type Result = { ok: boolean; error?: string };

async function logRow(row: Meta & { channel: "email" | "sms"; recipient: string; subject?: string | null; status: "sent" | "failed" | "skipped"; error?: string | null; provider_id?: string | null }) {
  const svc = supabaseService();
  if (!svc) return;
  await svc.from("notifications").insert({
    channel: row.channel,
    kind: row.kind,
    recipient: row.recipient,
    subject: row.subject ?? null,
    status: row.status,
    error: row.error ?? null,
    provider_id: row.provider_id ?? null,
    user_id: row.user_id ?? null,
    campaign_id: row.campaign_id ?? null,
    ticket_id: row.ticket_id ?? null,
    is_test: !!row.is_test,
  });
}

type Email = { to: string; subject: string; html: string; text: string; unsubUrl?: string | null };

/** Send one or many emails. Uses Resend's batch endpoint (100 per request) to stay under rate limits. */
export async function sendEmails(list: Email[], meta: Meta & { userIds?: (string | null)[] }): Promise<{ sent: number; failed: number; skipped: number }> {
  const cfg = notifyConfig();
  let sent = 0, failed = 0;
  const skipped = 0;
  if (!list.length) return { sent, failed, skipped };
  if (!cfg.email) {
    await Promise.all(list.map((e, i) => logRow({ ...meta, user_id: meta.userIds?.[i] ?? meta.user_id, channel: "email", recipient: e.to, subject: e.subject, status: "skipped", error: "RESEND_API_KEY not set" })));
    return { sent, failed, skipped: list.length };
  }
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const body = chunk.map((e) => ({
      from: cfg.from,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      ...(e.unsubUrl ? { headers: { "List-Unsubscribe": `<${e.unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }));
    let ids: (string | null)[] = [];
    let error: string | null = null;
    try {
      const res = await fetch(chunk.length === 1 ? "https://api.resend.com/emails" : "https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.length === 1 ? body[0] : body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) error = json?.message || `Resend error ${res.status}`;
      else ids = chunk.length === 1 ? [json?.id ?? null] : (json?.data ?? []).map((d: { id?: string }) => d?.id ?? null);
    } catch (e) {
      error = e instanceof Error ? e.message : "Network error";
    }
    await Promise.all(
      chunk.map((e, j) =>
        logRow({ ...meta, user_id: meta.userIds?.[i + j] ?? meta.user_id, channel: "email", recipient: e.to, subject: e.subject, status: error ? "failed" : "sent", error, provider_id: ids[j] ?? null }),
      ),
    );
    if (error) failed += chunk.length;
    else sent += chunk.length;
  }
  return { sent, failed, skipped };
}

/** Send one SMS through Twilio. TWILIO_FROM can be a phone number (+1…) or a Messaging Service SID (MG…). */
export async function sendSms(to: string, body: string, meta: Meta): Promise<Result> {
  const cfg = notifyConfig();
  if (!cfg.sms) {
    await logRow({ ...meta, channel: "sms", recipient: to, subject: body.slice(0, 80), status: "skipped", error: "Twilio not configured" });
    return { ok: false, error: "Twilio not configured" };
  }
  const sid = env("TWILIO_ACCOUNT_SID");
  const from = env("TWILIO_FROM");
  const form = new URLSearchParams({ To: to, Body: body });
  if (from.startsWith("MG")) form.set("MessagingServiceSid", from);
  else form.set("From", from);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 21610 = recipient replied STOP
      if (json?.code === 21610) await supabaseService()?.rpc("sms_opt_out", { p_phone: to });
      const error = json?.message || `Twilio error ${res.status}`;
      await logRow({ ...meta, channel: "sms", recipient: to, subject: body.slice(0, 80), status: "failed", error });
      return { ok: false, error };
    }
    await logRow({ ...meta, channel: "sms", recipient: to, subject: body.slice(0, 80), status: "sent", provider_id: json?.sid ?? null });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Network error";
    await logRow({ ...meta, channel: "sms", recipient: to, subject: body.slice(0, 80), status: "failed", error });
    return { ok: false, error };
  }
}

const unsubLink = (token: string | null | undefined) => (token ? `${SITE}/api/unsubscribe?t=${token}` : null);

// ---------------- campaign announcement ----------------
type Recipient = { user_id: string | null; email: string | null; phone: string | null; lang: string; email_opt_in: boolean; sms_opt_in: boolean; unsub_token: string | null };

export async function campaignRecipients(): Promise<Recipient[]> {
  const svc = supabaseService();
  if (!svc) return [];
  const { data } = await svc.rpc("notification_recipients");
  return (data ?? []) as Recipient[];
}

/** Email now, text in the background. `testOnly` sends just to the admin alert contacts. */
export async function announceCampaign(campaignId: string, testOnly: boolean) {
  const svc = supabaseService();
  if (!svc) return { error: "SUPABASE_SERVICE_ROLE_KEY not set" };
  const { data: c } = await svc.from("campaigns").select("id,title,slug,artist,cpm,budget,platforms,territory,status,is_test").eq("id", campaignId).single();
  if (!c) return { error: "Campaign not found" };
  if (!testOnly && c.status !== "live") return { error: "Only live campaigns can be announced." };
  const cfg = notifyConfig();
  const recipients: Recipient[] = testOnly
    ? [{ user_id: null, email: cfg.adminEmail, phone: cfg.adminPhone || null, lang: "en", email_opt_in: true, sms_opt_in: !!cfg.adminPhone, unsub_token: null }]
    : await campaignRecipients();
  const info = c as CampaignInfo;
  const meta = { kind: testOnly ? "campaign_test" : "campaign_live", campaign_id: c.id, is_test: testOnly || !!c.is_test };

  const emailTo = recipients.filter((r) => r.email_opt_in && r.email);
  const emailResult = await sendEmails(
    emailTo.map((r) => {
      const u = unsubLink(r.unsub_token);
      return { to: r.email!, ...campaignEmail(info, r.lang === "es" ? "es" : "en", u), unsubUrl: u };
    }),
    { ...meta, userIds: emailTo.map((r) => r.user_id) },
  );

  const smsTo = recipients.filter((r) => r.sms_opt_in && r.phone);
  if (smsTo.length) {
    after(async () => {
      for (const r of smsTo) {
        await sendSms(r.phone!, campaignSms(info, r.lang === "es" ? "es" : "en"), { ...meta, user_id: r.user_id });
        await new Promise((res) => setTimeout(res, 350));
      }
    });
  }
  if (!testOnly) await svc.from("campaigns").update({ announced_at: new Date().toISOString() }).eq("id", c.id);
  return { emails: emailResult, sms: smsTo.length, emailReady: cfg.email, smsReady: cfg.sms };
}

// ---------------- support ----------------
/** Email the clipper (or visitor) that we replied. Runs after the response. */
export function notifySupportReply(ticketId: string, reply: string) {
  after(async () => {
    const svc = supabaseService();
    if (!svc) return;
    const { data: t } = await svc.from("support_tickets").select("id,number,subject,user_id,guest_email,guest_name,access_token,lang,is_test").eq("id", ticketId).single();
    if (!t) return;
    let to = t.guest_email as string | null;
    let lang: Lang = t.lang === "es" ? "es" : "en";
    let link = `${SITE}/support/t/${t.access_token}`;
    if (t.user_id) {
      const { data: u } = await svc.rpc("user_contact", { p_user: t.user_id });
      const row = (u ?? [])[0] as { email?: string; lang?: string } | undefined;
      to = row?.email ?? null;
      if (row?.lang === "es" || row?.lang === "en") lang = row.lang;
      link = `${SITE}/dashboard/support/${t.number}`;
    }
    if (!to) return;
    const mail = supportReplyEmail({ lang, subject: t.subject, number: t.number, reply, link, name: t.guest_name });
    await sendEmails([{ to, ...mail }], { kind: "support_reply", user_id: t.user_id, ticket_id: t.id, is_test: t.is_test });
  });
}

/** Tell the admin about a new ticket (email + text). */
export function alertNewTicket(ticketNumber: number) {
  after(async () => {
    const svc = supabaseService();
    if (!svc) return;
    const { data: t } = await svc
      .from("support_tickets")
      .select("id,number,subject,category,lang,preview,guest_name,guest_email,is_test,meta,profiles!support_tickets_user_id_fkey(username)")
      .eq("number", ticketNumber)
      .single();
    if (!t || (t.meta as { type?: string })?.type === "claim_conflict") return;
    const prof = t.profiles as unknown as { username?: string } | null;
    const who = prof?.username ? `@${prof.username}` : `${t.guest_name ?? "Visitor"} (${t.guest_email})`;
    const mail = adminTicketEmail({ number: t.number, subject: t.subject, who, category: t.category, preview: t.preview ?? "", lang: t.lang });
    const cfg = notifyConfig();
    await sendEmails([{ to: cfg.adminEmail, subject: mail.subject, html: mail.html, text: mail.text }], { kind: "admin_ticket", ticket_id: t.id, is_test: t.is_test });
    if (cfg.adminPhone) await sendSms(cfg.adminPhone, mail.sms, { kind: "admin_ticket", ticket_id: t.id, is_test: t.is_test });
  });
}

/** Tell the admin a page claim was blocked (first attempt only; retries just bump the ticket). */
export function alertClaimBlocked(ticketNumber: number) {
  after(async () => {
    const svc = supabaseService();
    if (!svc) return;
    const { data: t } = await svc.from("support_tickets").select("id,number,meta,is_test").eq("number", ticketNumber).single();
    const m = (t?.meta ?? {}) as Record<string, unknown>;
    if (!t || m.type !== "claim_conflict" || Number(m.attempts ?? 1) > 1) return;
    const mail = adminClaimEmail(t.number, m);
    const cfg = notifyConfig();
    await sendEmails([{ to: cfg.adminEmail, subject: mail.subject, html: mail.html, text: mail.text }], { kind: "admin_claim", ticket_id: t.id, is_test: t.is_test });
    if (cfg.adminPhone) await sendSms(cfg.adminPhone, mail.sms, { kind: "admin_claim", ticket_id: t.id, is_test: t.is_test });
  });
}

/** Admin "send me a test" buttons. */
export async function sendTest(channel: "email" | "sms") {
  const cfg = notifyConfig();
  if (channel === "email") {
    const r = await sendEmails([{ to: cfg.adminEmail, ...testEmail() }], { kind: "test", is_test: true });
    return r.sent ? { ok: true, message: `Test email sent to ${cfg.adminEmail}.` } : { error: r.skipped ? "Add RESEND_API_KEY first." : "Send failed. Check the log below." };
  }
  if (!cfg.adminPhone) return { error: "Add ADMIN_ALERT_PHONE first." };
  const r = await sendSms(cfg.adminPhone, "LOT3 Clips: texts are working ✓", { kind: "test", is_test: true });
  return r.ok ? { ok: true, message: `Test text sent to ${cfg.adminPhone}.` } : { error: r.error ?? "Send failed." };
}
