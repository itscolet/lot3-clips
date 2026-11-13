"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { runSync } from "@/lib/sync";
import { runTestSuite, purgeTestData, seedDemo } from "@/lib/testlab";

export type AState = { ok?: boolean; error?: string; message?: string } | null;

async function log(action: string, entity: string, entity_id: string | null, meta: Record<string, unknown> = {}) {
  const { supabase, profile } = await requireAdmin();
  await supabase.from("activity_log").insert({ actor_id: profile.id, action, entity, entity_id, meta });
}

const all = () => revalidatePath("/", "layout");

// ---------------- CAMPAIGNS ----------------
function campaignFromForm(fd: FormData) {
  const lines = (k: string) =>
    String(fd.get(k) ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  const num = (k: string) => {
    const v = String(fd.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const title = String(fd.get("title") ?? "").trim();
  return {
    title,
    slug: slugify(String(fd.get("slug") || title)),
    artist: String(fd.get("artist") ?? "").trim() || null,
    client_id: String(fd.get("client_id") || "") || null,
    label: String(fd.get("label") || "music"),
    description: String(fd.get("description") ?? "").trim(),
    content_rules: lines("content_rules"),
    caption_requirements: String(fd.get("caption_requirements") ?? "").trim() || null,
    sound_url: String(fd.get("sound_url") ?? "").trim() || null,
    assets_url: String(fd.get("assets_url") ?? "").trim() || null,
    cover_url: String(fd.get("cover_url") ?? "").trim() || null,
    cpm: num("cpm"),
    budget: num("budget"),
    max_payout_per_clip: num("max_payout_per_clip"),
    platforms: fd.getAll("platforms").map(String),
    territory: String(fd.get("territory") || "US"),
    min_followers: num("min_followers") ?? 0,
    min_account_age_months: num("min_account_age_months") ?? 0,
    status: String(fd.get("status") || "draft"),
    starts_at: String(fd.get("starts_at") || "") || null,
    ends_at: String(fd.get("ends_at") || "") || null,
  };
}

async function maybeUploadCover(fd: FormData, slug: string): Promise<string | null> {
  const file = fd.get("cover_file") as File | null;
  if (!file || !file.size) return null;
  const { supabase } = await requireAdmin();
  const path = `${slug}-${Date.now()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}`;
  const up = await supabase.storage.from("covers").upload(path, file, { contentType: file.type });
  if (up.error) throw new Error(up.error.message);
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

export async function saveCampaign(_: AState, fd: FormData): Promise<AState> {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id") || "");
  const c = campaignFromForm(fd);
  if (!c.title) return { error: "Title is required." };
  if (!c.cpm || c.cpm <= 0) return { error: "CPM must be above $0." };
  if (!c.budget || c.budget <= 0) return { error: "Budget must be above $0." };
  if (!c.platforms.length) return { error: "Pick at least one platform." };
  try {
    const cover = await maybeUploadCover(fd, c.slug);
    if (cover) c.cover_url = cover;
  } catch (e) {
    return { error: "Cover upload failed: " + (e as Error).message };
  }
  if (id) {
    const { error } = await supabase.from("campaigns").update(c).eq("id", id);
    if (error) return { error: error.message.includes("slug") ? "That URL slug is taken." : error.message };
    await supabase.rpc("recalc_campaign", { p_campaign: id });
    await log("campaign.update", "campaign", id, { title: c.title });
    all();
    return { ok: true, message: "Saved." };
  }
  const { data, error } = await supabase.from("campaigns").insert(c).select("id").single();
  if (error) return { error: error.message.includes("slug") ? "That URL slug is taken." : error.message };
  await log("campaign.create", "campaign", data.id, { title: c.title });
  all();
  redirect(`/admin/campaigns/${data.id}`);
}

export async function setCampaignStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  const patch: Record<string, unknown> = { status };
  if (status === "live") {
    const { data } = await supabase.from("campaigns").select("starts_at").eq("id", id).single();
    if (!data?.starts_at) patch.starts_at = new Date().toISOString();
  }
  if (status === "complete") patch.ends_at = new Date().toISOString();
  await supabase.from("campaigns").update(patch).eq("id", id);
  await supabase.rpc("recalc_campaign", { p_campaign: id });
  await log("campaign.status", "campaign", id, { status });
  all();
}

export async function duplicateCampaign(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase.from("campaigns").select("*").eq("id", String(fd.get("id"))).single();
  if (!c) return;
  const { id: _id, report_token: _t, created_at: _c, ...rest } = c;
  void _id; void _t; void _c;
  const { data } = await supabase
    .from("campaigns")
    .insert({ ...rest, title: c.title + " (copy)", slug: (c.slug + "-copy-" + Date.now().toString(36)).slice(0, 64), status: "draft", starts_at: null, ends_at: null })
    .select("id")
    .single();
  all();
  if (data) redirect(`/admin/campaigns/${data.id}`);
}

export async function deleteCampaign(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const { count } = await supabase.from("submissions").select("id", { count: "exact", head: true }).eq("campaign_id", id);
  if (count) {
    // keep history: never hard-delete a campaign with submissions
    await supabase.from("campaigns").update({ status: "complete" }).eq("id", id);
  } else {
    await supabase.from("campaigns").delete().eq("id", id);
  }
  await log("campaign.delete", "campaign", id, { archived: !!count });
  all();
  redirect("/admin/campaigns");
}

export async function rotateReportLink(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  await supabase.from("campaigns").update({ report_token: token }).eq("id", id);
  await log("campaign.rotate_report", "campaign", id);
  revalidatePath(`/admin/campaigns/${id}`);
}

// ---------------- REVIEW ----------------
export async function reviewSubmission(fd: FormData) {
  const { supabase, profile } = await requireAdmin();
  const ids = fd.getAll("id").map(String).filter(Boolean);
  const decision = String(fd.get("decision"));
  const reason = String(fd.get("reason") || "") || null;
  if (!ids.length) return;
  const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "remove" ? "removed" : "pending";
  const { data } = await supabase
    .from("submissions")
    .update({ status, reject_reason: status === "rejected" || status === "removed" ? reason : null, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
    .in("id", ids)
    .select("campaign_id");
  for (const c of new Set((data ?? []).map((d) => d.campaign_id))) await supabase.rpc("recalc_campaign", { p_campaign: c });
  await log(`submission.${decision}`, "submission", ids.join(","), { reason, count: ids.length });
  all();
}

export async function setManualViews(_: AState, fd: FormData): Promise<AState> {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const views = Number(fd.get("views"));
  const likes = Number(fd.get("likes") || 0);
  if (!Number.isFinite(views) || views < 0) return { error: "Enter a valid view count." };
  const { data, error } = await supabase
    .from("submissions")
    .update({ views, likes, last_synced_at: new Date().toISOString() })
    .eq("id", id)
    .select("campaign_id")
    .single();
  if (error) return { error: error.message };
  await supabase.from("view_snapshots").insert({ submission_id: id, views, likes, source: "manual" });
  await supabase.rpc("recalc_campaign", { p_campaign: data.campaign_id });
  await log("submission.manual_views", "submission", id, { views, likes });
  all();
  return { ok: true, message: "Updated." };
}

// ---------------- CLIPPERS & ACCOUNTS ----------------
export async function updateClipper(fd: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = String(fd.get("id"));
  const patch: Record<string, string> = {};
  for (const k of ["status", "trust", "role"]) {
    const v = fd.get(k);
    if (v) patch[k] = String(v);
  }
  if (id === profile.id && patch.role === "clipper") return; // don't demote yourself
  await supabase.from("profiles").update(patch).eq("id", id);
  if (patch.status === "banned") {
    await supabase.from("submissions").update({ status: "removed", reject_reason: "Account banned" }).eq("user_id", id).eq("status", "pending");
  }
  await log("clipper.update", "profile", id, patch);
  all();
}

export async function reviewAccount(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const op = String(fd.get("op"));
  const patch: Record<string, unknown> = {};
  if (op === "verify") patch.verified_at = new Date().toISOString();
  if (op === "unverify") patch.verified_at = null;
  if (op === "audience_approve") {
    patch.audience_status = "approved";
    const pct = String(fd.get("us_pct") || "");
    if (pct) patch.us_audience_pct = Number(pct);
  }
  if (op === "audience_reject") patch.audience_status = "rejected";
  const followers = String(fd.get("followers") || "");
  if (followers) patch.followers = Number(followers);
  await supabase.from("social_accounts").update(patch).eq("id", id);
  await log(`account.${op}`, "social_account", id, patch);
  all();
}

// ---------------- PAYOUTS ----------------
export async function recordPayout(_: AState, fd: FormData): Promise<AState> {
  const { supabase, profile } = await requireAdmin();
  const amount = Number(fd.get("amount"));
  if (!(amount > 0)) return { error: "Amount must be above $0." };
  const row = {
    user_id: String(fd.get("user_id")),
    campaign_id: String(fd.get("campaign_id") || "") || null,
    amount: Math.round(amount * 100) / 100,
    method: String(fd.get("method") || "") || null,
    reference: String(fd.get("reference") || "") || null,
    created_by: profile.id,
    is_test: fd.get("is_test") === "true",
  };
  const { data, error } = await supabase.from("payouts").insert(row).select("id").single();
  if (error) return { error: error.message };
  await log("payout.record", "payout", data.id, row);
  all();
  return { ok: true, message: `Recorded $${row.amount.toFixed(2)} as paid.` };
}

export async function voidPayout(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  await supabase.from("payouts").update({ status: "void" }).eq("id", id);
  await log("payout.void", "payout", id);
  all();
}

// ---------------- FLAGS ----------------
export async function resolveFlag(fd: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = String(fd.get("id"));
  const op = String(fd.get("op"));
  const { data: f } = await supabase.from("flags").update({ status: op === "dismiss" ? "dismissed" : "resolved" }).eq("id", id).select("*").single();
  if (f && op === "reject" && f.submission_id) {
    const { data: s } = await supabase
      .from("submissions")
      .update({ status: "rejected", reject_reason: "Failed view verification", reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq("id", f.submission_id)
      .select("campaign_id")
      .single();
    if (s) await supabase.rpc("recalc_campaign", { p_campaign: s.campaign_id });
  }
  if (f && op === "watch" && f.user_id) await supabase.from("profiles").update({ trust: "watch" }).eq("id", f.user_id);
  await log(`flag.${op}`, "flag", id);
  all();
}

export async function createFlag(fd: FormData) {
  const { supabase } = await requireAdmin();
  const submission_id = String(fd.get("submission_id"));
  const { data: s } = await supabase.from("submissions").select("user_id,is_test").eq("id", submission_id).single();
  await supabase.from("flags").insert({ submission_id, user_id: s?.user_id, type: "manual", detail: String(fd.get("detail") || "Flagged for review"), is_test: s?.is_test ?? false });
  all();
}

// ---------------- CLIENTS ----------------
export async function saveClient(_: AState, fd: FormData): Promise<AState> {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id") || "");
  const row = {
    name: String(fd.get("name") || "").trim(),
    contact: String(fd.get("contact") || "").trim() || null,
    notes: String(fd.get("notes") || "").trim() || null,
  };
  if (!row.name) return { error: "Name is required." };
  const { error } = id ? await supabase.from("clients").update(row).eq("id", id) : await supabase.from("clients").insert(row);
  if (error) return { error: error.message };
  await log(id ? "client.update" : "client.create", "client", id || null, row);
  revalidatePath("/admin/clients");
  return { ok: true, message: "Saved." };
}

// ---------------- SYNC ----------------
export async function syncNow(_: AState, fd: FormData): Promise<AState> {
  const { supabase } = await requireAdmin();
  const campaignId = String(fd.get("campaign_id") || "") || undefined;
  const simulate = fd.get("simulate") === "true";
  const r = await runSync(supabase, { trigger: "manual", campaignId, simulate });
  await log("sync.manual", "sync_run", String(r.runId), { ...r });
  all();
  const msg = `Checked ${r.checked}, updated ${r.updated}, flagged ${r.flagged}.`;
  return r.errors.length ? { ok: r.updated > 0, error: r.updated ? undefined : r.errors[0], message: msg + " " + r.errors.join(" · ") } : { ok: true, message: msg };
}

// ---------------- TEST LAB ----------------
export async function runTests(_: unknown, fd: FormData) {
  const { supabase, profile } = await requireAdmin();
  const only = fd.getAll("only").map(String).filter(Boolean);
  const keep = fd.get("keep") === "true";
  const liveUrl = String(fd.get("live_url") || "").trim() || undefined;
  const report = await runTestSuite(supabase, { only: only.length ? only : undefined, keepData: keep, liveUrl });
  await supabase.from("test_runs").insert({ started_by: profile.id, passed: report.passed, failed: report.failed, results: report.results });
  revalidatePath("/admin/test-lab");
  return report;
}

export async function purgeTests(): Promise<AState> {
  const { supabase } = await requireAdmin();
  const n = await purgeTestData(supabase);
  await log("testlab.purge", "test", null, n);
  all();
  return { ok: true, message: `Removed ${n.campaigns} test campaigns, ${n.profiles} test clippers, ${n.clients} test clients.` };
}

export async function seedDemoData(): Promise<AState> {
  const { supabase } = await requireAdmin();
  const r = await seedDemo(supabase);
  await log("testlab.seed", "test", null, r);
  all();
  return { ok: true, message: `Seeded demo: ${r.campaigns} campaigns, ${r.clippers} clippers, ${r.submissions} clips. All marked TEST.` };
}
