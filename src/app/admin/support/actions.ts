"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/lib/support";

export type InboxState = { ok?: boolean; error?: string; message?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const refresh = () => revalidatePath("/admin", "layout");

async function log(action: string, entity_id: string, meta: Record<string, unknown> = {}) {
  const { supabase, profile } = await requireAdmin();
  await supabase.from("activity_log").insert({ actor_id: profile.id, action, entity: "support_ticket", entity_id, meta });
}

/** Reply to the clipper, or leave an internal note. Optionally resolve in the same step. */
export async function adminReply(_: InboxState, fd: FormData): Promise<InboxState> {
  const { supabase, profile } = await requireAdmin();
  const ticket = str(fd, "ticket_id");
  const body = str(fd, "body");
  const internal = fd.get("internal") === "1";
  const resolve = fd.get("resolve") === "1";
  if (!body) return { error: "Write a message first." };
  if (body.length > 5000) return { error: "Keep it under 5,000 characters." };
  const { error } = await supabase.from("support_messages").insert({ ticket_id: ticket, author_id: profile.id, author_role: "admin", body, internal });
  if (error) return { error: error.message };
  if (resolve) await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", ticket);
  // claim unassigned tickets on first reply
  if (!internal) await supabase.from("support_tickets").update({ assigned_to: profile.id }).eq("id", ticket).is("assigned_to", null);
  await log(internal ? "support.note" : resolve ? "support.reply_resolve" : "support.reply", ticket);
  refresh();
  return { ok: true, message: internal ? "Note added." : resolve ? "Sent and resolved." : "Sent." };
}

const FIELDS = {
  status: (v: string) => ["open", "waiting", "resolved"].includes(v),
  priority: (v: string) => (SUPPORT_PRIORITIES as string[]).includes(v),
  category: (v: string) => (SUPPORT_CATEGORIES as string[]).includes(v),
  assigned_to: () => true,
} as const;

/** Change one property of a ticket (status, priority, category, assignee). */
export async function updateTicket(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const field = str(fd, "field") as keyof typeof FIELDS;
  const value = str(fd, "value");
  if (!(field in FIELDS) || !FIELDS[field](value)) return;
  await supabase.from("support_tickets").update({ [field]: value || null }).eq("id", id);
  await log(`support.${field}`, id, { value });
  refresh();
}

export async function setTags(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const tags = [...new Set(fd.getAll("tag").map((t) => String(t).trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "").slice(0, 24)).filter(Boolean))].slice(0, 8);
  await supabase.from("support_tickets").update({ tags }).eq("id", id);
  refresh();
}

/** Bulk actions from the inbox list. */
export async function bulkTickets(fd: FormData) {
  const { supabase } = await requireAdmin();
  const ids = fd.getAll("id").map(String).filter(Boolean);
  const action = str(fd, "action");
  if (!ids.length) return;
  const patch =
    action === "resolve" ? { status: "resolved" } :
    action === "reopen" ? { status: "open" } :
    action === "read" ? { unread_admin: false } :
    action === "unread" ? { unread_admin: true } : null;
  if (!patch) return;
  await supabase.from("support_tickets").update(patch).in("id", ids);
  await log(`support.bulk_${action}`, ids.join(","), { count: ids.length });
  refresh();
}

// ---------------- saved replies ----------------
export async function saveReply(_: InboxState, fd: FormData): Promise<InboxState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const row = { title: str(fd, "title"), body: str(fd, "body"), body_es: str(fd, "body_es") || null, sort: Number(str(fd, "sort")) || 0 };
  if (!row.title || !row.body) return { error: "Title and English text are required." };
  const { error } = id ? await supabase.from("support_saved_replies").update(row).eq("id", id) : await supabase.from("support_saved_replies").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/admin/support", "layout");
  return { ok: true, message: id ? "Saved." : "Added." };
}

export async function deleteReply(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("support_saved_replies").delete().eq("id", str(fd, "id"));
  revalidatePath("/admin/support", "layout");
}

// ---------------- page claim conflicts ----------------
type ClaimMeta = { type?: string; account_id?: string; handle?: string; platform?: string; owner_id?: string; owner_username?: string; claimant_id?: string; claimant_username?: string };

const CLAIM_MSG = {
  transfer: {
    en: (h: string) => `Good news: @${h} is now on your account. You can start submitting clips from it.`,
    es: (h: string) => `¡Buenas noticias! @${h} ya está en tu cuenta. Ya puedes empezar a enviar clips desde ella.`,
  },
  keep: {
    en: (h: string) => `We checked, and @${h} stays with the account that claimed it first. If you can show it's yours, reply here with a screenshot of you logged into it and we'll take another look.`,
    es: (h: string) => `Lo revisamos y @${h} se queda con la cuenta que la reclamó primero. Si puedes demostrar que es tuya, responde aquí con una captura de pantalla donde se vea que tienes la sesión iniciada y lo volvemos a revisar.`,
  },
};

/** Resolve a blocked page claim: move the page to the claimant, or keep it with the owner. Tells the claimant either way. */
export async function resolveClaim(fd: FormData): Promise<InboxState> {
  const { supabase, profile } = await requireAdmin();
  const ticketId = str(fd, "ticket_id");
  const decision = str(fd, "decision") as "transfer" | "keep";
  if (decision !== "transfer" && decision !== "keep") return { error: "Unknown decision." };
  const { data: tk } = await supabase.from("support_tickets").select("id,lang,meta").eq("id", ticketId).single();
  const meta = (tk?.meta ?? {}) as ClaimMeta;
  if (!tk || meta.type !== "claim_conflict" || !meta.account_id || !meta.claimant_id) return { error: "This ticket isn't a page claim." };
  const lang = tk.lang === "es" ? "es" : "en";
  const handle = meta.handle ?? "";

  if (decision === "transfer") {
    const { data: acc } = await supabase.from("social_accounts").select("id,user_id").eq("id", meta.account_id).maybeSingle();
    if (!acc) return { error: "That page no longer exists." };
    if (acc.user_id === meta.claimant_id) return { error: "The claimant already owns this page." };
    const { error } = await supabase.from("social_accounts").update({ user_id: meta.claimant_id, verified_at: new Date().toISOString() }).eq("id", acc.id);
    if (error) return { error: error.message };
    await supabase.from("support_messages").insert({
      ticket_id: ticketId, author_id: profile.id, author_role: "admin", internal: true,
      body: `Transferred @${handle} from @${meta.owner_username} to @${meta.claimant_username}. Clips @${meta.owner_username} already submitted (and their earnings) stay with them.`,
    });
  } else {
    await supabase.from("support_messages").insert({
      ticket_id: ticketId, author_id: profile.id, author_role: "admin", internal: true,
      body: `Kept @${handle} with @${meta.owner_username}.`,
    });
  }
  await supabase.from("support_messages").insert({ ticket_id: ticketId, author_id: profile.id, author_role: "admin", body: CLAIM_MSG[decision][lang](handle) });
  await supabase.from("support_tickets").update({ status: "resolved", meta: { ...meta, decision, decided_by: profile.username, decided_at: new Date().toISOString() } }).eq("id", ticketId);
  await supabase.from("activity_log").insert({ actor_id: profile.id, action: `claim.${decision}`, entity: "social_account", entity_id: meta.account_id, meta: { ticket: ticketId, handle } });
  refresh();
  return { ok: true, message: decision === "transfer" ? `@${handle} moved to @${meta.claimant_username}.` : `@${handle} kept with @${meta.owner_username}.` };
}
