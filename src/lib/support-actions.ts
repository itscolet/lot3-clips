"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { getLang } from "./i18n/server";
import { supportErrCode, uploadSupportFile, type SupportErr } from "./support";
import { alertNewTicket } from "./notify";

export type SupportState = { ok?: boolean; error?: SupportErr } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Clipper or visitor opens a new conversation. */
export async function createTicket(_: SupportState, fd: FormData): Promise<SupportState> {
  // honeypot: bots fill every field
  if (str(fd, "website")) return { ok: true };
  const [{ supabase, user }, lang] = await Promise.all([getSession(), getLang()]);

  let attachment: string | null = null;
  if (user) {
    const up = await uploadSupportFile(supabase, user.id, fd.get("file") as File | null);
    if (up.error) return { error: up.error };
    attachment = up.path;
  }

  const { data, error } = await supabase
    .rpc("support_create", {
      p_subject: str(fd, "subject"),
      p_category: str(fd, "category") || "other",
      p_body: str(fd, "body"),
      p_campaign: str(fd, "campaign_id") || null,
      p_guest_name: user ? null : str(fd, "name"),
      p_guest_email: user ? null : str(fd, "email"),
      p_lang: lang,
      p_attachment: attachment,
    })
    .single<{ id: string; number: number; access_token: string }>();
  if (error || !data) return { error: supportErrCode(error?.message) };

  alertNewTicket(data.number);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  redirect(user ? `/dashboard/support/${data.number}?new=1` : `/support/t/${data.access_token}?new=1`);
}

/** Clipper or visitor replies in their own conversation. */
export async function replyTicket(_: SupportState, fd: FormData): Promise<SupportState> {
  const { supabase, user } = await getSession();
  let attachment: string | null = null;
  if (user) {
    const up = await uploadSupportFile(supabase, user.id, fd.get("file") as File | null);
    if (up.error) return { error: up.error };
    attachment = up.path;
  }
  const { error } = await supabase.rpc("support_reply", {
    p_ticket: str(fd, "ticket_id"),
    p_body: str(fd, "body"),
    p_token: str(fd, "token") || null,
    p_attachment: attachment,
  });
  if (error) return { error: supportErrCode(error.message) };
  revalidatePath("/support", "layout");
  revalidatePath("/dashboard/support", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function resolveTicket(fd: FormData) {
  const { supabase } = await getSession();
  await supabase.rpc("support_user_action", { p_ticket: str(fd, "ticket_id"), p_action: "resolve", p_token: str(fd, "token") || null });
  revalidatePath("/support", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}
