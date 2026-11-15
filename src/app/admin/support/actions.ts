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
