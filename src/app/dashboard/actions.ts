"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { detectPlatform, normalizeUrl } from "@/lib/format";
import type { Platform } from "@/lib/types";
import { getT } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const friendly = (msg: string, t: Dict) => {
  if (msg.includes("submissions_campaign_id_url_key")) return t.act.alreadySubmitted;
  if (msg.includes("social_accounts_platform_handle_key")) return t.act.accountTaken;
  if (msg.includes("profiles_username_key")) return t.act.usernameTaken;
  if (msg.includes("profiles_username_check")) return t.act.usernameRule;
  return msg.replace(/^.*?ERROR:\s*/, "");
};

export async function submitClip(_: ActionState, fd: FormData): Promise<ActionState> {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const campaignId = String(fd.get("campaign_id"));
  const slug = String(fd.get("slug"));
  const accountId = String(fd.get("account_id") || "");
  const raw = String(fd.get("url") || "");
  if (!raw) return { error: t.act.pasteLink };
  const url = normalizeUrl(raw);
  const platform = detectPlatform(url);
  if (!platform) return { error: t.act.badLink };
  if (!accountId) return { error: t.act.pickAccount };
  const { error } = await supabase.from("submissions").insert({
    campaign_id: campaignId,
    user_id: profile.id,
    social_account_id: accountId,
    platform,
    url,
  });
  if (error) return { error: friendly(error.message, t) };
  revalidatePath(`/campaigns/${slug}`);
  revalidatePath("/dashboard");
  return { ok: true, message: t.act.submitted };
}

export async function connectAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const platform = String(fd.get("platform")) as Platform;
  const handle = String(fd.get("handle") || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(tiktok|instagram)\.com\/@?/i, "")
    .replace(/[/?].*$/, "")
    .toLowerCase();
  if (!handle) return { error: t.act.enterHandle };
  const { error } = await supabase.from("social_accounts").insert({ user_id: profile.id, platform, handle });
  if (error) return { error: friendly(error.message, t) };
  revalidatePath("/dashboard/accounts");
  return { ok: true, message: t.act.accountAdded };
}

export async function verifyAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const id = String(fd.get("id"));
  const { data: acc } = await supabase.from("social_accounts").select("*").eq("id", id).eq("user_id", profile.id).single();
  if (!acc) return { error: t.act.notFound };
  const { checkBioCode } = await import("@/lib/apify");
  const res = await checkBioCode(acc.platform, acc.handle, acc.verify_code);
  if (res.status === "unavailable")
    return { ok: true, message: t.act.autoOffline };
  if (res.status === "not_found") return { error: t.act.codeNotFound(acc.verify_code, acc.handle) };
  // mark verified via the service client (clippers can't self-verify)
  const { supabaseService } = await import("@/lib/supabase/server");
  const svc = supabaseService();
  if (!svc) return { ok: true, message: t.act.codeFound };
  await svc.from("social_accounts").update({ verified_at: new Date().toISOString(), followers: res.followers ?? null }).eq("id", id);
  revalidatePath("/dashboard/accounts");
  return { ok: true, message: t.act.verified };
}

export async function uploadAudience(_: ActionState, fd: FormData): Promise<ActionState> {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const id = String(fd.get("id"));
  const file = fd.get("file") as File | null;
  if (!file || file.size === 0) return { error: t.act.chooseScreenshot };
  if (file.size > 8 * 1024 * 1024) return { error: t.act.max8 };
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${profile.id}/${id}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from("audience").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { error: up.error.message };
  const { error } = await supabase.from("social_accounts").update({ audience_screenshot_path: path }).eq("id", id).eq("user_id", profile.id);
  if (error) return { error: friendly(error.message, t) };
  revalidatePath("/dashboard/accounts");
  return { ok: true, message: t.act.screenshotSent };
}

export async function removeAccount(fd: FormData) {
  const { supabase, profile } = await requireUser();
  await supabase.from("social_accounts").delete().eq("id", String(fd.get("id"))).eq("user_id", profile.id);
  revalidatePath("/dashboard/accounts");
}

export async function savePayout(_: ActionState, fd: FormData): Promise<ActionState> {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const method = String(fd.get("method"));
  const handle = String(fd.get("handle") || "").trim();
  if (!handle) return { error: t.act.addPayout };
  const { error } = await supabase
    .from("payout_settings")
    .upsert({ user_id: profile.id, method, handle, updated_at: new Date().toISOString() });
  if (error) return { error: friendly(error.message, t) };
  revalidatePath("/dashboard/payouts");
  return { ok: true, message: t.act.saved };
}

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const [{ supabase, profile }, { t }] = await Promise.all([requireUser(), getT()]);
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const display_name = String(fd.get("display_name") || "").trim() || null;
  const { error } = await supabase.from("profiles").update({ username, display_name }).eq("id", profile.id);
  if (error) return { error: friendly(error.message, t) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: t.act.saved };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/");
}
