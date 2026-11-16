import { requireAdmin } from "@/lib/auth";
import { PageHead } from "@/components/site/shell";
import { Card } from "@/components/ui/ui";
import { notifyConfig } from "@/lib/notify";
import { timeAgo } from "@/lib/format";
import { TestButtons } from "./test-buttons";

export const metadata = { title: "Messages" };
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

export default async function MessagesPage() {
  const { supabase } = await requireAdmin();
  const cfg = notifyConfig();
  const since = daysAgo(30);
  const [{ data: log }, { count: emailOpt }, { count: smsOpt }, { data: sent30 }] = await Promise.all([
    supabase.from("notifications").select("id,channel,kind,recipient,subject,status,error,created_at,is_test").order("created_at", { ascending: false }).limit(150),
    supabase.from("notification_prefs").select("user_id", { count: "exact", head: true }).eq("email_opt_in", true),
    supabase.from("notification_prefs").select("user_id", { count: "exact", head: true }).eq("sms_opt_in", true),
    supabase.from("notifications").select("channel,status").gte("created_at", since).limit(5000),
  ]);
  const n = (ch: string, st: string) => (sent30 ?? []).filter((r) => r.channel === ch && r.status === st).length;
  const rows: [string, boolean, string][] = [
    ["Email (Resend)", cfg.email, cfg.email ? cfg.from : "Add RESEND_API_KEY and EMAIL_FROM"],
    ["Texts (Twilio)", cfg.sms, cfg.sms ? "Ready" : "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM"],
    ["Your alert email", !!cfg.adminEmail, cfg.adminEmail],
    ["Your alert phone", !!cfg.adminPhone, cfg.adminPhone || "Add ADMIN_ALERT_PHONE to get texts"],
    ["Mailing address (required in campaign emails)", !!cfg.postal, cfg.postal || "Add EMAIL_POSTAL_ADDRESS"],
    ["Service key", cfg.service, cfg.service ? "Set" : "Add SUPABASE_SERVICE_ROLE_KEY"],
  ];
  return (
    <>
      <PageHead title="Messages" sub="Email and text notifications: setup, tests and every message sent." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h3 className="mb-3 text-[13px] font-medium">Setup</h3>
          <div className="flex flex-col divide-y divide-line">
            {rows.map(([k, ok, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-[12px]">
                <span className="flex items-center gap-2">
                  <span className={ok ? "text-ink" : "text-dim"}>{ok ? "●" : "○"}</span>
                  {k}
                </span>
                <span className="min-w-0 truncate text-right text-mute">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4"><TestButtons /></div>
        </Card>
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line p-0">
          {[
            ["Email opt-ins", emailOpt ?? 0],
            ["Text opt-ins", smsOpt ?? 0],
            ["Emails sent (30d)", n("email", "sent")],
            ["Texts sent (30d)", n("sms", "sent")],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-s1 p-4">
              <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{k}</div>
              <div className="num mt-2 text-[24px] leading-none">{v}</div>
            </div>
          ))}
        </Card>
      </div>

      <h3 className="mb-3 mt-8 text-[13px] font-medium">Log</h3>
      {log?.length ? (
        <div className="overflow-hidden rounded-2xl border border-line">
          {log.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 border-b border-line bg-s1 px-4 py-3 text-[12px] last:border-0 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-20 shrink-0 text-dim">{timeAgo(r.created_at)}</span>
              <span className="w-12 shrink-0 uppercase tracking-[0.08em] text-mute">{r.channel}</span>
              <span className="w-32 shrink-0 text-mute">{r.kind.replace(/_/g, " ")}{r.is_test ? " · test" : ""}</span>
              <span className="min-w-0 flex-1 truncate">{r.recipient} <span className="text-dim">· {r.subject}</span></span>
              <span className={r.status === "sent" ? "shrink-0 text-ink" : "shrink-0 text-dim"} title={r.error ?? undefined}>
                {r.status}{r.error ? ` · ${r.error.slice(0, 40)}` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line2 px-6 py-12 text-center text-[13px] text-mute">Nothing sent yet.</p>
      )}
    </>
  );
}
