import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublic } from "./supabase/server";
import { runSync } from "./sync";
import { apifyConfigured, fetchMetrics } from "./apify";
import { detectPlatform } from "./format";

export type Step = { label: string; ok: boolean; detail?: string };
export type TestResult = {
  key: string;
  name: string;
  area: string;
  status: "pass" | "fail" | "warn" | "skip";
  ms: number;
  steps: Step[];
};
export type SuiteReport = { passed: number; failed: number; warned: number; results: TestResult[]; ranAt: string };

type Ctx = {
  sb: SupabaseClient;
  anon: SupabaseClient;
  ns: string;
  liveUrl?: string;
  ids: {
    client?: string;
    campaign?: string;
    slug?: string;
    token?: string;
    clipper?: string;
    clipper2?: string;
    account?: string;
    account2?: string;
    sub?: string;
    sub2?: string;
  };
};

class Steps {
  list: Step[] = [];
  warn = false;
  check(label: string, ok: boolean, detail?: string) {
    this.list.push({ label, ok, detail });
    if (!ok) throw new StepFail(label + (detail ? ` — ${detail}` : ""));
  }
  note(label: string, detail?: string) {
    this.list.push({ label, ok: true, detail });
  }
  soft(label: string, ok: boolean, detail?: string) {
    this.list.push({ label, ok, detail });
    if (!ok) this.warn = true;
  }
}
class StepFail extends Error {}
class Skip extends Error {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const must = (r: { data: unknown; error: { message: string } | null }, what: string): any => {
  if (r.error) throw new StepFail(`${what}: ${r.error.message}`);
  if (r.data === null || r.data === undefined) throw new StepFail(`${what}: no data`);
  return r.data;
};

// ---------------- FIXTURES (lazy, so any single test can run alone) ----------------
async function ensureClient(c: Ctx) {
  if (c.ids.client) return c.ids.client;
  const d = must(await c.sb.from("clients").insert({ name: `Test Label ${c.ns}`, contact: "test@lot3clips.test", is_test: true }).select("id").single(), "create client");
  return (c.ids.client = d.id);
}
async function ensureCampaign(c: Ctx, status: "draft" | "live" = "live") {
  if (c.ids.campaign) return c.ids.campaign;
  const client_id = await ensureClient(c);
  const slug = `test-${c.ns}`;
  const d = must(
    await c.sb
      .from("campaigns")
      .insert({
        slug,
        title: `Test Campaign ${c.ns.slice(-4).toUpperCase()}`,
        artist: "Test Artist",
        client_id,
        label: "music",
        description: "Automated Test Lab campaign. Safe to delete.",
        content_rules: ["Use the provided sound", "No overly sexual edits"],
        cpm: 2,
        budget: 1000,
        platforms: ["tiktok", "instagram"],
        territory: "US",
        status,
        is_test: true,
      })
      .select("id,slug,report_token")
      .single(),
    "create campaign",
  );
  c.ids.slug = d.slug;
  c.ids.token = d.report_token;
  return (c.ids.campaign = d.id);
}
async function makeClipper(c: Ctx, suffix: string) {
  const username = `t_${c.ns}_${suffix}`.slice(0, 24).toLowerCase();
  const p = must(await c.sb.from("profiles").insert({ username, display_name: `Test ${suffix}`, is_test: true }).select("id").single(), "create clipper");
  await c.sb.from("payout_settings").insert({ user_id: p.id, method: "paypal", handle: `${username}@lot3clips.test` });
  return p.id as string;
}
async function makeAccount(c: Ctx, user: string, platform: "tiktok" | "instagram", opts: { verified?: boolean; audience?: string } = {}) {
  const a = must(
    await c.sb
      .from("social_accounts")
      .insert({
        user_id: user,
        platform,
        handle: `t_${c.ns}_${platform}_${user.slice(0, 4)}`,
        followers: 12000,
        verified_at: opts.verified === false ? null : new Date().toISOString(),
        audience_status: opts.audience ?? "approved",
        us_audience_pct: 71,
        is_test: true,
      })
      .select("id,verify_code")
      .single(),
    "create account",
  );
  return a as { id: string; verify_code: string };
}
async function ensureClipper(c: Ctx) {
  if (c.ids.clipper && c.ids.account) return;
  c.ids.clipper = await makeClipper(c, "a");
  c.ids.account = (await makeAccount(c, c.ids.clipper, "tiktok")).id;
}
async function ensureClipper2(c: Ctx) {
  if (c.ids.clipper2 && c.ids.account2) return;
  c.ids.clipper2 = await makeClipper(c, "b");
  c.ids.account2 = (await makeAccount(c, c.ids.clipper2, "tiktok")).id;
}
const fakeUrl = (c: Ctx, n: number) => `https://www.tiktok.com/@t_${c.ns}/video/7${c.ns.replace(/\D/g, "").padEnd(6, "1").slice(0, 6)}${String(n).padStart(12, "0")}`;
async function insertSub(c: Ctx, user: string, account: string, n: number, status = "pending") {
  const campaign_id = await ensureCampaign(c);
  return must(
    await c.sb
      .from("submissions")
      .insert({ campaign_id, user_id: user, social_account_id: account, platform: "tiktok", url: fakeUrl(c, n), status, is_test: true })
      .select("id")
      .single(),
    "insert submission",
  ).id as string;
}
async function setViews(c: Ctx, id: string, views: number, likes = Math.round(views * 0.05)) {
  must(await c.sb.from("submissions").update({ views, likes }).eq("id", id).select("id").single(), "set views");
}
async function earnings(c: Ctx, id: string) {
  const d = must(await c.sb.from("submissions").select("earnings").eq("id", id).single(), "read earnings");
  return Number(d.earnings);
}

// ---------------- TESTS ----------------
type TestDef = { key: string; name: string; area: string; run: (c: Ctx, s: Steps) => Promise<void> };

export const TESTS: TestDef[] = [
  {
    key: "security",
    name: "Database & security rules",
    area: "Platform",
    async run(c, s) {
      const admin = await c.sb.rpc("is_admin");
      s.check("Your session is recognized as admin", admin.data === true, admin.error?.message);
      const tables = ["profiles", "campaigns", "submissions", "social_accounts", "payouts", "flags", "clients", "view_snapshots", "sync_runs"];
      for (const t of tables) {
        const r = await c.sb.from(t).select("*", { count: "exact", head: true });
        s.check(`Table "${t}" reachable`, !r.error, r.error?.message);
      }
      const anonClients = await c.anon.from("clients").select("id").limit(1);
      s.check("Public visitors can't read clients", (anonClients.data ?? []).length === 0);
      const anonPay = await c.anon.from("payout_settings").select("user_id").limit(1);
      s.check("Public visitors can't read payout details", (anonPay.data ?? []).length === 0);
      const anonLedger = await c.anon.rpc("payout_ledger");
      s.check("Public visitors can't open the payout ledger", !!anonLedger.error || (anonLedger.data ?? []).length === 0);
      const anonDraft = await c.anon.from("campaigns").select("id").eq("status", "draft").limit(1);
      s.check("Draft campaigns are hidden from the public", (anonDraft.data ?? []).length === 0);
      const anonPending = await c.anon.from("submissions").select("id").neq("status", "approved").limit(1);
      s.check("Pending/rejected clips are hidden from the public", (anonPending.data ?? []).length === 0);
    },
  },
  {
    key: "campaigns",
    name: "Create, publish & edit a campaign",
    area: "Campaigns",
    async run(c, s) {
      const client = await ensureClient(c);
      s.note("Created test client", client);
      const slug = `test-draft-${c.ns}`;
      const d = must(
        await c.sb.from("campaigns").insert({ slug, title: "Draft Check", cpm: 1.5, budget: 500, platforms: ["tiktok"], status: "draft", is_test: true, client_id: client }).select("id,report_token").single(),
        "create draft",
      );
      s.check("Draft campaign created", !!d.id);
      s.check("Report link token generated", typeof d.report_token === "string" && d.report_token.length === 32);
      const hidden = await c.anon.from("campaigns").select("id").eq("id", d.id);
      s.check("Draft not visible publicly", (hidden.data ?? []).length === 0);
      must(await c.sb.from("campaigns").update({ status: "live", title: "Draft Check (live)", cpm: 1.75 }).eq("id", d.id).select("id").single(), "publish");
      const shown = await c.anon.from("campaigns").select("id,title,cpm").eq("id", d.id).single();
      s.check("Live campaign visible publicly", shown.data?.id === d.id, shown.error?.message);
      s.check("Edits saved (title + CPM)", shown.data?.title === "Draft Check (live)" && Number(shown.data?.cpm) === 1.75);
      const cards = await c.anon.rpc("campaign_cards", { p_include_test: true });
      s.check("Appears in campaign board data", (cards.data ?? []).some((x: { id: string }) => x.id === d.id));
      const pub = await c.anon.rpc("campaign_cards");
      s.check("Test campaigns hidden from the public board", !(pub.data ?? []).some((x: { id: string }) => x.id === d.id));
      const dupe = await c.sb.from("campaigns").insert({ slug, title: "x", cpm: 1, budget: 1, is_test: true });
      s.check("Duplicate URL slug is blocked", !!dupe.error);
      const bad = await c.sb.from("campaigns").insert({ slug: `bad-${c.ns}`, title: "x", cpm: 0, budget: 1, is_test: true });
      s.check("CPM of $0 is rejected", !!bad.error);
      await c.sb.from("campaigns").delete().eq("id", d.id);
    },
  },
  {
    key: "accounts",
    name: "Clipper signup, account connect & verification",
    area: "Clippers",
    async run(c, s) {
      const user = await makeClipper(c, "acc");
      s.check("Clipper profile created", !!user);
      const badName = await c.sb.from("profiles").insert({ username: "No Spaces!", is_test: true });
      s.check("Invalid usernames rejected", !!badName.error);
      const acc = await makeAccount(c, user, "instagram", { verified: false, audience: "none" });
      s.check("Verification code generated (L3-XXXXXX)", /^L3-[A-F0-9]{6}$/.test(acc.verify_code), acc.verify_code);
      const dup = await c.sb.from("social_accounts").insert({ user_id: user, platform: "instagram", handle: `t_${c.ns}_instagram_${user.slice(0, 4)}`, is_test: true });
      s.check("Same handle can't be connected twice", !!dup.error);
      must(await c.sb.from("social_accounts").update({ verified_at: new Date().toISOString() }).eq("id", acc.id).select("id").single(), "verify");
      must(await c.sb.from("social_accounts").update({ audience_status: "approved", us_audience_pct: 64 }).eq("id", acc.id).select("id").single(), "approve audience");
      const r = must(await c.sb.from("social_accounts").select("verified_at,audience_status,us_audience_pct").eq("id", acc.id).single(), "read");
      s.check("Admin can verify account", !!r.verified_at);
      s.check("Admin can approve US audience with %", r.audience_status === "approved" && Number(r.us_audience_pct) === 64);
      const ps = await c.sb.from("payout_settings").select("method,handle").eq("user_id", user).single();
      s.check("Payout details saved", ps.data?.method === "paypal", ps.error?.message);
    },
  },
  {
    key: "eligibility",
    name: "Submission eligibility rules",
    area: "Submissions",
    async run(c, s) {
      const campaign = await ensureCampaign(c);
      await ensureClipper(c);
      const user = c.ids.clipper!;
      const ok = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: c.ids.account, p_platform: "tiktok", p_user: user });
      s.check("Verified US account on live campaign → allowed", ok.data === null, ok.data ?? ok.error?.message);
      const wrongPlat = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: c.ids.account, p_platform: "youtube", p_user: user });
      s.check("Platform not in campaign → blocked", typeof wrongPlat.data === "string", wrongPlat.data ?? "");
      const mismatch = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: c.ids.account, p_platform: "instagram", p_user: user });
      s.check("Link platform ≠ account platform → blocked", typeof mismatch.data === "string", mismatch.data ?? "");
      const unv = await makeAccount(c, user, "instagram", { verified: false });
      const r1 = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: unv.id, p_platform: "instagram", p_user: user });
      s.check("Unverified account → blocked", r1.data === "Verify this account before submitting", r1.data ?? "");
      await c.sb.from("social_accounts").update({ verified_at: new Date().toISOString(), audience_status: "pending" }).eq("id", unv.id);
      const r2 = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: unv.id, p_platform: "instagram", p_user: user });
      s.check("US campaign + audience not approved → blocked", (r2.data ?? "").includes("audience"), r2.data ?? "");
      const other = await makeClipper(c, "oth");
      const r3 = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: c.ids.account, p_platform: "tiktok", p_user: other });
      s.check("Someone else's account → blocked", typeof r3.data === "string", r3.data ?? "");
      await c.sb.from("profiles").update({ status: "banned" }).eq("id", other);
      const otherAcc = await makeAccount(c, other, "tiktok");
      const r4 = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: otherAcc.id, p_platform: "tiktok", p_user: other });
      s.check("Banned clipper → blocked", r4.data === "Account suspended", r4.data ?? "");
      await c.sb.from("campaigns").update({ status: "paused" }).eq("id", campaign);
      const r5 = await c.sb.rpc("submission_check", { p_campaign: campaign, p_account: c.ids.account, p_platform: "tiktok", p_user: user });
      s.check("Paused campaign → blocked", (r5.data ?? "").includes("not accepting"), r5.data ?? "");
      await c.sb.from("campaigns").update({ status: "live" }).eq("id", campaign);
    },
  },
  {
    key: "review",
    name: "Submit, de-duplicate & review clips",
    area: "Submissions",
    async run(c, s) {
      await ensureClipper(c);
      await ensureClipper2(c);
      const a = await insertSub(c, c.ids.clipper!, c.ids.account!, 1);
      const b = await insertSub(c, c.ids.clipper2!, c.ids.account2!, 2);
      c.ids.sub = a;
      c.ids.sub2 = b;
      s.check("Two clips submitted as pending", !!a && !!b);
      const dupe = await c.sb.from("submissions").insert({ campaign_id: c.ids.campaign, user_id: c.ids.clipper, social_account_id: c.ids.account, platform: "tiktok", url: fakeUrl(c, 1), is_test: true });
      s.check("Same link twice in one campaign → blocked", !!dupe.error);
      s.check("Platform detected from link", detectPlatform(fakeUrl(c, 1)) === "tiktok");
      must(await c.sb.from("submissions").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", a).select("id").single(), "approve");
      must(await c.sb.from("submissions").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", b).select("id").single(), "approve b");
      const extra = await insertSub(c, c.ids.clipper!, c.ids.account!, 3);
      must(await c.sb.from("submissions").update({ status: "rejected", reject_reason: "Wrong sound" }).eq("id", extra).select("id").single(), "reject");
      const st = must(await c.sb.rpc("campaign_stats", { p_campaign: c.ids.campaign }).single<{ approved: number; rejected: number }>(), "stats");
      s.check("Campaign counts update (2 approved, 1 denied)", Number(st.approved) === 2 && Number(st.rejected) === 1, JSON.stringify(st));
      const pubApproved = await c.anon.from("submissions").select("id").eq("id", a);
      s.check("Approved clip visible publicly", (pubApproved.data ?? []).length === 1);
      const pubRejected = await c.anon.from("submissions").select("id").eq("id", extra);
      s.check("Rejected clip hidden publicly", (pubRejected.data ?? []).length === 0);
    },
  },
  {
    key: "sync",
    name: "View tracking (simulated sync)",
    area: "Tracking",
    async run(c, s) {
      if (!c.ids.sub) await TESTS.find((t) => t.key === "review")!.run(c, new Steps());
      await setViews(c, c.ids.sub!, 10_000);
      const r = await runSync(c.sb, { trigger: "test", campaignId: c.ids.campaign, simulated: { [c.ids.sub!]: { views: 14_000, likes: 900, comments: 40, shares: 12 } } });
      s.check("Sync run finished", r.runId !== null && r.errors.length === 0, r.errors.join(" | "));
      s.check("Clips checked", r.checked >= 2, `${r.checked} checked`);
      const sub = must(await c.sb.from("submissions").select("views,likes,last_synced_at").eq("id", c.ids.sub!).single(), "read");
      s.check("Views updated from tracker", Number(sub.views) === 14_000, String(sub.views));
      s.check("Last-checked time stamped", !!sub.last_synced_at);
      const snaps = await c.sb.from("view_snapshots").select("id").eq("submission_id", c.ids.sub!);
      s.check("View history snapshot saved", (snaps.data ?? []).length >= 1);
      const run = must(await c.sb.from("sync_runs").select("status").eq("id", r.runId!).single(), "run row");
      s.check("Sync logged in history", run.status === "ok", run.status);
      s.check("Earnings recalculated after sync", (await earnings(c, c.ids.sub!)) === 28, String(await earnings(c, c.ids.sub!)));
    },
  },
  {
    key: "cpm",
    name: "CPM earnings math, caps & budget",
    area: "Money",
    async run(c, s) {
      if (!c.ids.sub) await TESTS.find((t) => t.key === "review")!.run(c, new Steps());
      const id = c.ids.campaign!;
      await c.sb.from("campaigns").update({ cpm: 2, budget: 1000, max_payout_per_clip: null }).eq("id", id);
      await setViews(c, c.ids.sub!, 100_000);
      await setViews(c, c.ids.sub2!, 50_000);
      await c.sb.rpc("recalc_campaign", { p_campaign: id });
      s.check("100K views × $2 CPM = $200.00", (await earnings(c, c.ids.sub!)) === 200, String(await earnings(c, c.ids.sub!)));
      s.check("50K views × $2 CPM = $100.00", (await earnings(c, c.ids.sub2!)) === 100);
      await c.sb.from("campaigns").update({ max_payout_per_clip: 150 }).eq("id", id);
      await c.sb.rpc("recalc_campaign", { p_campaign: id });
      s.check("Per-clip cap of $150 applied", (await earnings(c, c.ids.sub!)) === 150, String(await earnings(c, c.ids.sub!)));
      await c.sb.from("campaigns").update({ max_payout_per_clip: null, budget: 240 }).eq("id", id);
      await c.sb.rpc("recalc_campaign", { p_campaign: id });
      const e1 = await earnings(c, c.ids.sub!);
      const e2 = await earnings(c, c.ids.sub2!);
      s.check("Over budget → split pro rata ($160 / $80)", e1 === 160 && e2 === 80, `${e1} / ${e2}`);
      const st = must(await c.sb.rpc("campaign_stats", { p_campaign: id }).single<{ spent: number }>(), "stats");
      s.check("Total spend never exceeds budget", Number(st.spent) <= 240, String(st.spent));
      await c.sb.from("submissions").update({ status: "rejected" }).eq("id", c.ids.sub2!);
      await c.sb.rpc("recalc_campaign", { p_campaign: id });
      s.check("Rejected clip earns $0", (await earnings(c, c.ids.sub2!)) === 0);
      s.check("Freed budget goes back to approved clips", (await earnings(c, c.ids.sub!)) === 200, String(await earnings(c, c.ids.sub!)));
      await c.sb.from("submissions").update({ status: "approved" }).eq("id", c.ids.sub2!);
      await c.sb.from("campaigns").update({ budget: 1000 }).eq("id", id);
      await c.sb.rpc("recalc_campaign", { p_campaign: id });
    },
  },
  {
    key: "fraud",
    name: "Fraud flags (spikes & low engagement)",
    area: "Tracking",
    async run(c, s) {
      await ensureClipper(c);
      const id = await insertSub(c, c.ids.clipper!, c.ids.account!, 77, "approved");
      await setViews(c, id, 2_000, 150);
      const r = await runSync(c.sb, { trigger: "test", submissionIds: [id], simulated: { [id]: { views: 90_000, likes: 120, comments: 2, shares: 0 } } });
      s.check("Sync ran", r.errors.length === 0, r.errors.join(" | "));
      const flags = must(await c.sb.from("flags").select("id,type,status").eq("submission_id", id), "flags") as { id: string; type: string; status: string }[];
      s.check("View spike flagged", flags.some((f) => f.type === "view_spike"), flags.map((f) => f.type).join(","));
      s.check("Low like-rate flagged", flags.some((f) => f.type === "low_engagement"));
      const r2 = await runSync(c.sb, { trigger: "test", submissionIds: [id], simulated: { [id]: { views: 95_000, likes: 130, comments: 2, shares: 0 } } });
      const again = must(await c.sb.from("flags").select("id").eq("submission_id", id).eq("status", "open"), "flags2");
      s.check("No duplicate flags on the next sync", again.length === flags.length, `${again.length} open (sync ${r2.updated} updated)`);
      const spike = flags.find((f) => f.type === "view_spike")!;
      await c.sb.from("flags").update({ status: "resolved" }).eq("id", spike.id);
      await c.sb.from("submissions").update({ status: "rejected", reject_reason: "Failed view verification" }).eq("id", id);
      await c.sb.rpc("recalc_campaign", { p_campaign: c.ids.campaign });
      s.check("Rejecting a flagged clip zeroes its earnings", (await earnings(c, id)) === 0);
      const live = await insertSub(c, c.ids.clipper!, c.ids.account!, 78, "approved");
      await setViews(c, live, 5_000);
      await runSync(c.sb, { trigger: "test", submissionIds: [live], simulated: { [live]: null } });
      const miss = must(await c.sb.from("flags").select("type").eq("submission_id", live), "missing flags") as { type: string }[];
      s.check("Deleted/private post flagged as missing", miss.some((f) => f.type === "missing"));
    },
  },
  {
    key: "payouts",
    name: "Payout ledger: owed → paid → void",
    area: "Money",
    async run(c, s) {
      if (!c.ids.sub) await TESTS.find((t) => t.key === "review")!.run(c, new Steps());
      await setViews(c, c.ids.sub!, 60_000);
      await c.sb.rpc("recalc_campaign", { p_campaign: c.ids.campaign });
      await c.sb.from("campaigns").update({ status: "complete" }).eq("id", c.ids.campaign!);
      type L = { user_id: string; campaign_id: string; owed: number; earned: number; paid: number; campaign_status: string };
      const led = (await c.sb.rpc("payout_ledger", { p_include_test: true })).data as L[] | null;
      const row = (led ?? []).find((r) => r.user_id === c.ids.clipper && r.campaign_id === c.ids.campaign);
      s.check("Clipper shows in ledger after campaign completes", !!row && row.campaign_status === "complete");
      const owed = Number(row!.owed);
      s.check("Owed equals earned (60K × $2 = $120)", owed === 120, String(owed));
      const p = must(await c.sb.from("payouts").insert({ user_id: c.ids.clipper, campaign_id: c.ids.campaign, amount: owed, method: "paypal", reference: "TEST-TXN", is_test: true }).select("id").single(), "record payout");
      const led2 = ((await c.sb.rpc("payout_ledger", { p_include_test: true })).data as L[]).find((r) => r.user_id === c.ids.clipper && r.campaign_id === c.ids.campaign)!;
      s.check("Marked paid → owed drops to $0", Number(led2.owed) === 0, String(led2.owed));
      await c.sb.from("payouts").update({ status: "void" }).eq("id", p.id);
      const led3 = ((await c.sb.rpc("payout_ledger", { p_include_test: true })).data as L[]).find((r) => r.user_id === c.ids.clipper && r.campaign_id === c.ids.campaign)!;
      s.check("Voiding a payout restores what's owed", Number(led3.owed) === owed, String(led3.owed));
      const neg = await c.sb.from("payouts").insert({ user_id: c.ids.clipper, amount: -5, is_test: true });
      s.check("Negative payouts rejected", !!neg.error);
      await c.sb.from("campaigns").update({ status: "live" }).eq("id", c.ids.campaign!);
    },
  },
  {
    key: "report",
    name: "Client report link",
    area: "Clients",
    async run(c, s) {
      if (!c.ids.sub) await TESTS.find((t) => t.key === "review")!.run(c, new Steps());
      const r = await c.anon.rpc("campaign_report", { p_token: c.ids.token });
      const d = r.data as { campaign: { title: string }; stats: { approved: number; total_views: number }; clips: unknown[] } | null;
      s.check("Report opens without logging in", !!d && !r.error, r.error?.message);
      s.check("Report has campaign, stats and clips", !!d?.campaign?.title && Array.isArray(d?.clips));
      s.check("Report only lists approved clips", (d?.clips.length ?? 0) === Number(d?.stats.approved), `${d?.clips.length} clips / ${d?.stats.approved} approved`);
      const bad = await c.anon.rpc("campaign_report", { p_token: "0".repeat(32) });
      s.check("Wrong token shows nothing", bad.data === null);
    },
  },
  {
    key: "pages",
    name: "Every page loads",
    area: "Platform",
    async run(c, s) {
      const base = process.env.NEXT_PUBLIC_SITE_URL;
      if (!base) throw new Skip("NEXT_PUBLIC_SITE_URL not set");
      await ensureCampaign(c);
      const paths = ["/", "/campaigns", `/campaigns/${c.ids.slug}`, "/leaderboard", "/terms", "/login", "/signup", `/report/${c.ids.token}`];
      for (const p of paths) {
        try {
          const t = Date.now();
          const res = await fetch(base + p, { cache: "no-store", redirect: "manual" });
          s.check(`${p} → ${res.status}`, res.status === 200, `${Date.now() - t}ms`);
        } catch (e) {
          s.check(`${p}`, false, (e as Error).message);
        }
      }
      const res = await fetch(base + "/admin", { cache: "no-store", redirect: "manual" });
      s.check("/admin redirects logged-out visitors", res.status === 307 || res.status === 308 || res.status === 302, String(res.status));
    },
  },
  {
    key: "config",
    name: "Live config: tracking, cron & keys",
    area: "Platform",
    async run(c, s) {
      s.soft("Apify token set (live view tracking)", apifyConfigured(), apifyConfigured() ? "APIFY_TOKEN present" : "Add APIFY_TOKEN in Railway → Variables");
      s.soft("Service key set (cron sync + auto-verify)", !!process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY ? "present" : "Add SUPABASE_SERVICE_ROLE_KEY");
      s.soft("Cron secret set", !!process.env.CRON_SECRET);
      s.soft("Site URL set", !!process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_SITE_URL);
      const last = await c.sb.from("sync_runs").select("trigger,status,finished_at").eq("trigger", "cron").order("id", { ascending: false }).limit(1).maybeSingle();
      const fresh = last.data?.finished_at && Date.now() - new Date(last.data.finished_at).getTime() < 8 * 3600_000;
      s.soft("Scheduled sync ran in the last 8h", !!fresh, last.data ? `last: ${last.data.finished_at} (${last.data.status})` : "no scheduled runs yet");
    },
  },
  {
    key: "apify",
    name: "Live Apify fetch (real post)",
    area: "Tracking",
    async run(c, s) {
      if (!apifyConfigured()) throw new Skip("APIFY_TOKEN not set");
      let url = c.liveUrl;
      if (!url) {
        const { data } = await c.sb.from("submissions").select("url").eq("is_test", false).in("platform", ["tiktok", "instagram"]).limit(1).maybeSingle();
        url = data?.url;
      }
      if (!url) throw new Skip("Paste a public TikTok/Instagram link in “Live test URL”");
      const platform = detectPlatform(url);
      s.check("Link platform recognized", platform === "tiktok" || platform === "instagram", url);
      const t = Date.now();
      const m = await fetchMetrics(platform!, [url]);
      const got = m.get(url);
      s.check("Apify returned metrics", !!got, `${Date.now() - t}ms`);
      s.check("View count is a number", typeof got!.views === "number" && got!.views >= 0, `${got!.views.toLocaleString()} views · ${got!.likes.toLocaleString()} likes`);
    },
  },
];

// ---------------- RUNNER ----------------
export async function runTestSuite(
  sb: SupabaseClient,
  opts: { only?: string[]; keepData?: boolean; liveUrl?: string } = {},
): Promise<SuiteReport> {
  const ctx: Ctx = { sb, anon: supabasePublic(), ns: Date.now().toString(36), ids: {}, liveUrl: opts.liveUrl };
  const results: TestResult[] = [];
  for (const t of TESTS) {
    if (opts.only && !opts.only.includes(t.key)) continue;
    const steps = new Steps();
    const t0 = Date.now();
    let status: TestResult["status"] = "pass";
    try {
      await t.run(ctx, steps);
      if (steps.warn) status = "warn";
    } catch (e) {
      if (e instanceof Skip) {
        status = "skip";
        steps.list.push({ label: "Skipped", ok: true, detail: e.message });
      } else {
        status = "fail";
        if (!(e instanceof StepFail)) steps.list.push({ label: "Unexpected error", ok: false, detail: (e as Error).message });
      }
    }
    results.push({ key: t.key, name: t.name, area: t.area, status, ms: Date.now() - t0, steps: steps.list });
  }
  if (!opts.keepData) await purgeTestData(sb);
  return {
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    warned: results.filter((r) => r.status === "warn").length,
    results,
    ranAt: new Date().toISOString(),
  };
}

export async function purgeTestData(sb: SupabaseClient) {
  const camp = await sb.from("campaigns").delete().eq("is_test", true).select("id");
  await sb.from("payouts").delete().eq("is_test", true);
  await sb.from("flags").delete().eq("is_test", true);
  await sb.from("submissions").delete().eq("is_test", true);
  await sb.from("social_accounts").delete().eq("is_test", true);
  const prof = await sb.from("profiles").delete().eq("is_test", true).select("id");
  const cli = await sb.from("clients").delete().eq("is_test", true).select("id");
  return { campaigns: camp.data?.length ?? 0, profiles: prof.data?.length ?? 0, clients: cli.data?.length ?? 0 };
}

/** Realistic demo data (all is_test) so every admin screen has something to click. */
export async function seedDemo(sb: SupabaseClient) {
  const ns = Date.now().toString(36);
  const { data: client } = await sb.from("clients").insert({ name: "Demo Label (TEST)", contact: "demo@lot3clips.test", is_test: true }).select("id").single();
  const camps = [
    { title: "ROA", artist: "ROA", cpm: 2, budget: 4000, platforms: ["tiktok", "instagram"], description: "Use “sonido original”. Creative refs in the Dropbox. US only." },
    { title: "Brray — Angelica", artist: "Brray", cpm: 1.75, budget: 4000, platforms: ["tiktok"], description: "Livestream clip (10:26–11:11, blue T-shirt) + listening-event moments." },
    { title: "Slum Beach Posse", artist: "Slum Beach Posse", cpm: 1.5, budget: 2000, platforms: ["tiktok"], description: "Surf/beach edits: Outer Banks, Blue Crush, Chasing Mavericks vibe + artist surf footage. Sound: The Ocean." },
  ];
  const campIds: string[] = [];
  for (const [i, cp] of camps.entries()) {
    const { data } = await sb
      .from("campaigns")
      .insert({ ...cp, slug: `demo-${i}-${ns}`, label: "music", client_id: client?.id, territory: "US", status: "live", starts_at: new Date(Date.now() - 6 * 86400_000).toISOString(), content_rules: ["Use the campaign sound at audible volume", "No overly sexual edits", "Keep it live 30+ days"], is_test: true })
      .select("id")
      .single();
    if (data) campIds.push(data.id);
  }
  const names = ["wavecuts", "clipdept", "nightedits", "reelroom", "surfclips", "hookhouse"];
  const users: { id: string; acc: string }[] = [];
  for (const n of names) {
    const { data: p } = await sb.from("profiles").insert({ username: `${n}_${ns}`.slice(0, 24), display_name: n, is_test: true }).select("id").single();
    if (!p) continue;
    await sb.from("payout_settings").insert({ user_id: p.id, method: "paypal", handle: `${n}@lot3clips.test` });
    const { data: a } = await sb
      .from("social_accounts")
      .insert({ user_id: p.id, platform: "tiktok", handle: `${n}_${ns}`, followers: 5000 + Math.round(Math.random() * 90000), verified_at: new Date().toISOString(), audience_status: "approved", us_audience_pct: 60 + Math.round(Math.random() * 30), is_test: true })
      .select("id")
      .single();
    if (a) users.push({ id: p.id, acc: a.id });
  }
  // one pending verification for the queue
  if (users[0]) await sb.from("social_accounts").insert({ user_id: users[0].id, platform: "instagram", handle: `pending_${ns}`, audience_status: "pending", is_test: true });
  let subs = 0;
  const statuses = ["approved", "approved", "approved", "pending", "approved", "rejected"];
  for (const [ci, cid] of campIds.entries()) {
    for (const [ui, u] of users.entries()) {
      const status = statuses[(ui + ci) % statuses.length];
      const views = status === "approved" ? 4000 + Math.round(Math.random() * 180000) : 0;
      const { data: s } = await sb
        .from("submissions")
        .insert({ campaign_id: cid, user_id: u.id, social_account_id: u.acc, platform: "tiktok", url: `https://www.tiktok.com/@demo/video/7${ns.replace(/\D/g, "").padEnd(4, "0").slice(0, 4)}${ci}${ui}${Math.floor(Math.random() * 1e12)}`, status, views, likes: Math.round(views * 0.07), comments: Math.round(views * 0.003), reject_reason: status === "rejected" ? "Sound too quiet" : null, is_test: true, created_at: new Date(Date.now() - (ui + 1) * 3600_000 * 7).toISOString() })
        .select("id")
        .single();
      if (!s) continue;
      subs++;
      if (status === "approved") {
        const snaps = [5, 4, 3, 2, 1, 0].map((d) => ({ submission_id: s.id, views: Math.round(views * (1 - d * 0.15)), likes: Math.round(views * 0.07 * (1 - d * 0.15)), source: "test", captured_at: new Date(Date.now() - d * 86400_000).toISOString() }));
        await sb.from("view_snapshots").insert(snaps);
      }
    }
    await sb.rpc("recalc_campaign", { p_campaign: cid });
  }
  // a flag to look at
  const { data: anySub } = await sb.from("submissions").select("id,user_id").in("campaign_id", campIds).eq("status", "approved").limit(1).maybeSingle();
  if (anySub) await sb.from("flags").insert({ submission_id: anySub.id, user_id: anySub.user_id, type: "view_spike", detail: "+120,000 views since last check (was 3,100). Demo flag.", is_test: true });
  return { campaigns: campIds.length, clippers: users.length, submissions: subs };
}
