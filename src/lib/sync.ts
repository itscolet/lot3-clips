import type { SupabaseClient } from "@supabase/supabase-js";
import { apifyConfigured, fetchMetrics, type Metrics } from "./apify";
import type { Platform } from "./types";

type Row = {
  id: string;
  url: string;
  platform: Platform;
  views: number;
  likes: number;
  campaign_id: string;
  user_id: string;
  is_test: boolean;
};

export type SyncOptions = {
  trigger?: "cron" | "manual" | "test";
  campaignId?: string;
  submissionIds?: string[];
  /** Only process TEST submissions with simulated metrics (never calls Apify, never touches real clips). */
  simulate?: boolean;
  /** Override simulated metrics per submission id (Test Lab). */
  simulated?: Record<string, Metrics | null>;
};

export type SyncResult = { runId: number | null; checked: number; updated: number; flagged: number; errors: string[] };

export const FLAG_RULES = {
  spikeMinDelta: 50_000,
  spikeMultiplier: 5,
  spikeMinPrev: 1_000,
  lowEngagementMinViews: 20_000,
  lowEngagementRatio: 0.003,
};

function simulate(r: Row): Metrics {
  // deterministic-ish organic growth for test data
  const base = r.views || 1500 + (parseInt(r.id.slice(0, 4), 16) % 4000);
  const views = Math.round(base * 1.35);
  return { views, likes: Math.round(views * 0.06), comments: Math.round(views * 0.004), shares: Math.round(views * 0.002) };
}

export async function runSync(sb: SupabaseClient, opts: SyncOptions = {}): Promise<SyncResult> {
  const errors: string[] = [];
  const { data: run } = await sb
    .from("sync_runs")
    .insert({ trigger: opts.trigger ?? "manual" })
    .select("id")
    .single();
  const runId = (run?.id as number | undefined) ?? null;

  let q = sb
    .from("submissions")
    .select("id,url,platform,views,likes,campaign_id,user_id,is_test,campaigns!inner(status)")
    .in("status", ["approved", "pending"])
    .in("campaigns.status", ["live", "paused"]);
  if (opts.campaignId) q = q.eq("campaign_id", opts.campaignId);
  if (opts.submissionIds?.length) q = q.in("id", opts.submissionIds);
  const { data, error } = await q.limit(5000);
  if (error) {
    await finish(sb, runId, "error", 0, 0, 0, error.message);
    return { runId, checked: 0, updated: 0, flagged: 0, errors: [error.message] };
  }
  // Simulated syncs only ever touch TEST data — real clips are never overwritten with fake numbers.
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !opts.simulate || r.is_test);

  const results = new Map<string, Metrics | null>();
  const real = rows.filter((r) => !r.is_test);
  const fake = rows.filter((r) => r.is_test);
  for (const r of fake) results.set(r.id, opts.simulated && r.id in opts.simulated ? opts.simulated[r.id] : simulate(r));

  if (real.length) {
    if (!apifyConfigured()) {
      errors.push("APIFY_TOKEN not set — skipped live tracking for " + real.length + " clips");
    } else {
      const byPlatform = new Map<Platform, Row[]>();
      for (const r of real) byPlatform.set(r.platform, [...(byPlatform.get(r.platform) ?? []), r]);
      for (const [platform, list] of byPlatform) {
        for (let i = 0; i < list.length; i += 40) {
          const chunk = list.slice(i, i + 40);
          try {
            const m = await fetchMetrics(platform, chunk.map((r) => r.url));
            for (const r of chunk) results.set(r.id, m.get(r.url) ?? null);
          } catch (e) {
            errors.push((e as Error).message);
          }
        }
      }
    }
  }

  const { data: openFlags } = await sb.from("flags").select("submission_id,type").eq("status", "open");
  const hasFlag = new Set((openFlags ?? []).map((f) => `${f.submission_id}:${f.type}`));

  let updated = 0;
  let flagged = 0;
  const now = new Date().toISOString();
  const snapshots: Record<string, unknown>[] = [];
  const newFlags: Record<string, unknown>[] = [];
  const touched = new Set<string>();

  for (const r of rows) {
    if (!results.has(r.id)) continue;
    const m = results.get(r.id);
    if (!m) {
      if (r.views > 0 && !hasFlag.has(`${r.id}:missing`)) {
        newFlags.push({ submission_id: r.id, user_id: r.user_id, type: "missing", detail: "Post not found on last check — may be deleted or private.", is_test: r.is_test });
        flagged++;
      }
      continue;
    }
    const delta = m.views - r.views;
    if (
      delta >= FLAG_RULES.spikeMinDelta &&
      r.views >= FLAG_RULES.spikeMinPrev &&
      delta > r.views * FLAG_RULES.spikeMultiplier &&
      !hasFlag.has(`${r.id}:view_spike`)
    ) {
      newFlags.push({ submission_id: r.id, user_id: r.user_id, type: "view_spike", detail: `+${delta.toLocaleString()} views since last check (was ${r.views.toLocaleString()}).`, is_test: r.is_test });
      flagged++;
    }
    if (
      m.views >= FLAG_RULES.lowEngagementMinViews &&
      m.likes / Math.max(1, m.views) < FLAG_RULES.lowEngagementRatio &&
      !hasFlag.has(`${r.id}:low_engagement`)
    ) {
      newFlags.push({ submission_id: r.id, user_id: r.user_id, type: "low_engagement", detail: `${((m.likes / m.views) * 100).toFixed(2)}% like rate on ${m.views.toLocaleString()} views.`, is_test: r.is_test });
      flagged++;
    }
    const { error: upErr } = await sb
      .from("submissions")
      .update({ views: m.views, likes: m.likes, comments: m.comments, shares: m.shares, last_synced_at: now })
      .eq("id", r.id);
    if (upErr) {
      errors.push(upErr.message);
      continue;
    }
    snapshots.push({ submission_id: r.id, ...m, source: r.is_test ? "test" : "apify" });
    touched.add(r.campaign_id);
    updated++;
  }

  if (snapshots.length) await sb.from("view_snapshots").insert(snapshots);
  if (newFlags.length) await sb.from("flags").insert(newFlags);
  for (const c of touched) {
    const { error: rc } = await sb.rpc("recalc_campaign", { p_campaign: c });
    if (rc) errors.push(rc.message);
  }

  await finish(sb, runId, errors.length && !updated ? "error" : "ok", rows.length, updated, flagged, errors.join(" | ") || null);
  return { runId, checked: rows.length, updated, flagged, errors };
}

async function finish(sb: SupabaseClient, id: number | null, status: string, checked: number, updated: number, flagged: number, error: string | null) {
  if (!id) return;
  await sb.from("sync_runs").update({ status, checked, updated, flagged, error, finished_at: new Date().toISOString() }).eq("id", id);
}
