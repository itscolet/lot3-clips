// Email + SMS copy. Clipper-facing messages in English and Spanish; admin alerts in English.
type Lang = "en" | "es";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://lot3clips.com").replace(/\/$/, "");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n: number, d = 2) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** Simple, client-safe black & white layout. */
function layout(lang: Lang, inner: string, footer: string) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#000;padding:18px 28px"><span style="color:#fff;font-size:15px;font-weight:600;letter-spacing:-0.01em">LOT3 <span style="color:#9a9a9a;font-weight:400">Clips</span></span></td></tr>
<tr><td style="padding:28px 28px 8px">${inner}</td></tr>
<tr><td style="padding:16px 28px 26px;font-size:11px;line-height:1.6;color:#8a8a8a">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px;margin:18px 0 6px">${esc(label)}</a>`;
const footerBase = () => {
  const addr = process.env.EMAIL_POSTAL_ADDRESS;
  return `LOT3 Clips · LOT3 Media LLC${addr ? ` · ${esc(addr)}` : ""}`;
};

// ---------------- campaign announcement ----------------
export type CampaignInfo = { title: string; slug: string; artist: string | null; cpm: number; budget: number; platforms: string[]; territory: string };
const PL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", x: "X" };

export function campaignEmail(c: CampaignInfo, lang: Lang, unsubUrl: string | null) {
  const url = `${SITE}/campaigns/${c.slug}`;
  const name = c.artist ? `${c.artist}: ${c.title}` : c.title;
  const plats = c.platforms.map((p) => PL[p] ?? p).join(", ");
  const es = lang === "es";
  const subject = es ? `Nueva campaña: ${name} · ${money(c.cpm)} por 1K vistas` : `New campaign: ${name} · ${money(c.cpm)} per 1K views`;
  const inner = `
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a">${es ? "Nueva campaña" : "New campaign"}</p>
<h1 style="margin:0;font-size:24px;line-height:1.15;letter-spacing:-0.03em">${esc(name)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0;width:100%;border-top:1px solid #eee">
<tr><td style="padding:10px 0;font-size:13px;color:#6a6a6a">${es ? "Tarifa" : "Rate"}</td><td align="right" style="padding:10px 0;font-size:14px;font-weight:600">${money(c.cpm)} ${es ? "por 1K vistas" : "per 1K views"}</td></tr>
<tr><td style="padding:10px 0;font-size:13px;color:#6a6a6a;border-top:1px solid #eee">${es ? "Presupuesto" : "Budget"}</td><td align="right" style="padding:10px 0;font-size:14px;border-top:1px solid #eee">${money(c.budget, 0)}</td></tr>
<tr><td style="padding:10px 0;font-size:13px;color:#6a6a6a;border-top:1px solid #eee">${es ? "Plataformas" : "Platforms"}</td><td align="right" style="padding:10px 0;font-size:14px;border-top:1px solid #eee">${esc(plats)}</td></tr>
${c.territory === "US" ? `<tr><td style="padding:10px 0;font-size:13px;color:#6a6a6a;border-top:1px solid #eee">${es ? "Audiencia" : "Audience"}</td><td align="right" style="padding:10px 0;font-size:14px;border-top:1px solid #eee">${es ? "Solo EE. UU." : "US only"}</td></tr>` : ""}
</table>
<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#333">${es ? "El presupuesto se reparte entre las vistas verificadas, así que los primeros en publicar tienen ventaja." : "Budget is shared across verified views, so the earliest posts have the edge."}</p>
${button(url, es ? "Ver la campaña" : "See the campaign")}`;
  const footer = `${es ? "Recibes este correo porque aceptaste avisos de campañas nuevas." : "You're getting this because you opted in to new campaign alerts."}${
    unsubUrl ? ` <a href="${esc(unsubUrl)}" style="color:#8a8a8a">${es ? "Darte de baja" : "Unsubscribe"}</a>.` : ""
  }<br>${footerBase()}`;
  const text = `${subject}\n\n${es ? "Tarifa" : "Rate"}: ${money(c.cpm)} ${es ? "por 1K vistas" : "per 1K views"}\n${es ? "Presupuesto" : "Budget"}: ${money(c.budget, 0)}\n${es ? "Plataformas" : "Platforms"}: ${plats}\n\n${url}${unsubUrl ? `\n\n${es ? "Darte de baja" : "Unsubscribe"}: ${unsubUrl}` : ""}`;
  return { subject, html: layout(lang, inner, footer), text };
}

export function campaignSms(c: CampaignInfo, lang: Lang) {
  const url = `${SITE}/campaigns/${c.slug}`;
  const name = c.artist ? `${c.artist}: ${c.title}` : c.title;
  return lang === "es"
    ? `LOT3 Clips: nueva campaña activa, ${name}. ${money(c.cpm)} por 1K vistas. ${url} Responde STOP para darte de baja.`
    : `LOT3 Clips: new campaign live, ${name}. ${money(c.cpm)} per 1K views. ${url} Reply STOP to opt out.`;
}

// ---------------- support reply ----------------
export function supportReplyEmail(o: { lang: Lang; subject: string; number: number; reply: string; link: string; name?: string | null }) {
  const es = o.lang === "es";
  const excerpt = o.reply.length > 900 ? `${o.reply.slice(0, 900)}…` : o.reply;
  const subject = es ? `Soporte LOT3 respondió: ${o.subject}` : `LOT3 Support replied: ${o.subject}`;
  const inner = `
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a">Ticket #${o.number}</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.25;letter-spacing:-0.02em">${esc(o.subject)}</h1>
<div style="background:#f6f6f6;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#222;white-space:pre-wrap">${esc(excerpt)}</div>
${button(o.link, es ? "Responder" : "Reply")}`;
  const footer = `${es ? "Responde desde el enlace de arriba; este correo no recibe respuestas." : "Reply using the link above; this inbox isn't monitored."}<br>${footerBase()}`;
  const text = `${subject}\n\n${excerpt}\n\n${es ? "Responder" : "Reply"}: ${o.link}`;
  return { subject, html: layout(o.lang, inner, footer), text };
}

// ---------------- admin alerts (English) ----------------
export function adminTicketEmail(o: { number: number; subject: string; who: string; category: string; preview: string; lang: string }) {
  const link = `${SITE}/admin/support?t=${o.number}`;
  const subject = `New ticket #${o.number}: ${o.subject}`;
  const inner = `
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a">New support ticket</p>
<h1 style="margin:0 0 8px;font-size:20px;line-height:1.25">${esc(o.subject)}</h1>
<p style="margin:0 0 14px;font-size:13px;color:#6a6a6a">${esc(o.who)} · ${esc(o.category)}${o.lang === "es" ? " · Spanish" : ""}</p>
<div style="background:#f6f6f6;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;color:#222;white-space:pre-wrap">${esc(o.preview)}</div>
${button(link, "Open in inbox")}`;
  return { subject, html: layout("en", inner, footerBase()), text: `${subject}\n${o.who} · ${o.category}\n\n${o.preview}\n\n${link}`, sms: `LOT3 Clips: new ticket #${o.number} from ${o.who}: ${o.subject.slice(0, 60)} ${link}` };
}

export function adminClaimEmail(number: number, m: Record<string, unknown>) {
  const link = `${SITE}/admin/support?t=${number}`;
  const level = String(m.risk ?? "").split(":")[0];
  const subject = `Claim blocked: @${m.handle} (${PL[String(m.platform)] ?? m.platform}) · ${level}`;
  const row = (k: string, v: string) => `<tr><td style="padding:7px 0;font-size:13px;color:#6a6a6a;border-top:1px solid #eee">${esc(k)}</td><td align="right" style="padding:7px 0;font-size:13px;border-top:1px solid #eee">${esc(v)}</td></tr>`;
  const inner = `
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a">Page claim blocked</p>
<h1 style="margin:0 0 4px;font-size:22px;line-height:1.2"><a href="${esc(String(m.url))}" style="color:#000">@${esc(String(m.handle))}</a> on ${esc(PL[String(m.platform)] ?? String(m.platform))}</h1>
<p style="margin:12px 0 4px;font-size:12px;font-weight:600">Trying to claim</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("User", `@${m.claimant_username}`)}${row("Email", String(m.claimant_email ?? "—"))}${row("Pages they hold", String(m.claimant_pages))}${row("Past blocked claims", String(m.claimant_prior_conflicts))}</table>
<p style="margin:14px 0 4px;font-size:12px;font-weight:600">Current owner</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("User", `@${m.owner_username}`)}${row("Email", String(m.owner_email ?? "—"))}${row("Clips on page", `${m.owner_clips} (${m.owner_approved} approved)`)}${row("Earned on page", money(Number(m.owner_earned ?? 0)))}</table>
<p style="margin:16px 0 0;padding:12px 14px;background:#f6f6f6;border-radius:12px;font-size:13px;line-height:1.55"><b>${esc(level)}</b> ${esc(String(m.risk ?? "").slice(level.length + 1))}</p>
${button(link, "Transfer or keep →")}`;
  return {
    subject,
    html: layout("en", inner, footerBase()),
    text: `${subject}\n\nTrying: @${m.claimant_username} (${m.claimant_email})\nOwner: @${m.owner_username} (${m.owner_email}) · ${m.owner_clips} clips, ${money(Number(m.owner_earned ?? 0))}\n${m.risk}\n\n${link}`,
    sms: `LOT3 Clips: claim blocked @${m.handle} by @${m.claimant_username} (owner @${m.owner_username}, ${level}). ${link}`,
  };
}

export function testEmail() {
  const inner = `<h1 style="margin:0 0 10px;font-size:20px">Email is working ✓</h1><p style="margin:0;font-size:14px;line-height:1.6;color:#333">This is a test from your LOT3 Clips admin. Campaign announcements, support replies and alerts will look like this.</p>`;
  return { subject: "LOT3 Clips test email", html: layout("en", inner, footerBase()), text: "Email is working. This is a test from your LOT3 Clips admin." };
}
