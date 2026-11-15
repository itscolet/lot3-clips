import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupportCategory, SupportMessage, SupportPriority } from "./types";

export const SUPPORT_CATEGORIES: SupportCategory[] = ["payouts", "campaign", "verification", "account", "bug", "brand", "other"];
export const SUPPORT_PRIORITIES: SupportPriority[] = ["urgent", "high", "normal", "low"];
export const SUPPORT_ERR_CODES = ["subject_short", "body_short", "too_long", "bad_email", "name_required", "rate_limited", "not_found"] as const;
export type SupportErr = (typeof SUPPORT_ERR_CODES)[number] | "file" | "generic";

/** Pull our raised error code out of a Postgres error message. */
export function supportErrCode(message: string | undefined): SupportErr {
  const m = message ?? "";
  return SUPPORT_ERR_CODES.find((c) => m.includes(c)) ?? "generic";
}

export const MAX_ATTACHMENT = 8 * 1024 * 1024;
export const ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/gif"];

/** Upload a screenshot to the private support bucket under the user's folder. Returns the storage path. */
export async function uploadSupportFile(sb: SupabaseClient, userId: string, file: File | null): Promise<{ path: string | null; error?: "file" }> {
  if (!file || !file.size) return { path: null };
  if (file.size > MAX_ATTACHMENT || !ATTACHMENT_TYPES.includes(file.type)) return { path: null, error: "file" };
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await sb.storage.from("support").upload(path, file, { contentType: file.type });
  return up.error ? { path: null, error: "file" } : { path };
}

/** Attach short-lived signed URLs to messages that have screenshots. */
export async function withAttachmentUrls(sb: SupabaseClient, messages: SupportMessage[]): Promise<SupportMessage[]> {
  const paths = messages.map((m) => m.attachment_path).filter(Boolean) as string[];
  if (!paths.length) return messages;
  const { data } = await sb.storage.from("support").createSignedUrls(paths, 60 * 60);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return messages.map((m) => (m.attachment_path ? { ...m, attachment_url: map.get(m.attachment_path) ?? null } : m));
}

/** Google Translate link, so admins can read Spanish messages or check a reply. */
export const translateUrl = (text: string, to: "en" | "es" = "en", from = "auto") =>
  `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text.slice(0, 4500))}&op=translate`;
