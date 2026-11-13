"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { detectPlatform, normalizeUrl } from "@/lib/format";
import type { Platform } from "@/lib/types";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const friendly = (msg: string) => {
  if (msg.includes("submissions_campaign_id_url_key")) return "That clip is already submitted to this campaign.";
  if (msg.includes("social_accounts_platform_handle_key")) return "That account is already connected on LOT3 Clips.";
  if (msg.includes("profiles_username_key")) return "That username is taken.";
  if (msg.includes("profiles_username_check")) return "Usernames are 3–24 characters: letters, numbers, _ or .";
  return msg.replace(/^.*?ERROR:\s*/, "");
};

export async function submitClip(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const campaignId = String(fd.get("campaign_id"));
  const slug = String(fd.get("slug"));
  const accountId = String(fd.get("account_id") || "");
  const raw = String(fd.get("url") || "");
  if (!raw) return { error: "Paste the link to your post." };
  const url = normalizeUrl(raw);
  const platform = detectPlatform(url);
  if (!platform) return { error: "That doesn't look like a TikTok, Instagram, YouTube or X link." };
  if (!accountId) return { error: "Pick the account you posted from." };
  const { error } = await supabase.from("submissions").insert({
    campaign_id: campaignId,
    user_id: profile.id,
    social_account_id: accountId,
    platform,
    url,
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/campaigns/${slug}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Submitted. We'll review it shortly." };
}

export async function connectAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const platform = String(fd.get("platform")) as Platform;
  const handle = String(fd.get("handle") || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(tiktok|instagram)\.com\/@?/i, "")
    .replace(/[/?].*$/, "")
    .toLowerCase();
  if (!handle) return { error: "Enter your handle." };
  const { error } = await supabase.from("social_accounts").insert({ user_id: profile.id, platform, handle });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/dashboard/accounts");
  return { ok: true, message: "Account added. Put the code in your bio, then hit Verify." };
}

export async function verifyAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const id = String(fd.get("id"));
  const { data: acc } = await supabase.from("social_accounts").select("*").eq("id", id).eq("user_id", profile.id).single();
  if (!acc) return { error: "Account not found." };
  const { checkBioCode } = await import("@/lib/apify");
  const res = await checkBioCode(acc.platform, acc.handle, acc.verify_code);
  if (res.status === "unavailable")
    return { ok: true, message: "Auto-check is offline right now. We'll verify it manually within 24h — keep the code in your bio." };
  if (res.status === "not_found") return { error: `Couldn't find the code ${acc.verify_code} in @${acc.handle}'s bio yet. It can take a minute to update.` };
  // mark verified via the service client (clippers can't self-verify)
  const { supabaseService } = await import("@/lib/supabase/server");
  const svc = supabaseService();
  if (!svc) return { ok: true, message: "Code found. An admin will confirm shortly." };
  await svc.from("social_accounts").update({ verified_at: new Date().toISOString(), followers: res.followers ?? null }).eq("id", id);
  revalidatePath("/dashboard/accounts");
  return { ok: true, message: "Verified. You can remove the code from your bio." };
}

export async function uploadAudience(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const id = String(fd.get("id"));
  const file = fd.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a screenshot." };
  if (file.size > 8 * 1024 * 1024) return { error: "Max 8MB." };
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${profile.id}/${id}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from("audience").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { error: up.error.message };
  const { error } = await supabase.from("social_accounts").update({ audience_screenshot_path: path }).eq("id", id).eq("user_id", profile.id);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/dashboard/accounts");
  return { ok: true, message: "Screenshot sent for review." };
}

export async function removeAccount(fd: FormData) {
  const { supabase, profile } = await requireUser();
  await supabase.from("social_accounts").delete().eq("id", String(fd.get("id"))).eq("user_id", profile.id);
  revalidatePath("/dashboard/accounts");
}

export async function savePayout(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const method = String(fd.get("method"));
  const handle = String(fd.get("handle") || "").trim();
  if (!handle) return { error: "Add where we should send your money." };
  const { error } = await supabase
    .from("payout_settings")
    .upsert({ user_id: profile.id, method, handle, updated_at: new Date().toISOString() });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/dashboard/payouts");
  return { ok: true, message: "Saved." };
}

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const display_name = String(fd.get("display_name") || "").trim() || null;
  const { error } = await supabase.from("profiles").update({ username, display_name }).eq("id", profile.id);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Saved." };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/");
}
