"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { purgeTests, runTests, seedDemoData, type AState } from "../actions";
import type { SuiteReport, TestResult } from "@/lib/testlab";
import { Card, Input } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { cn, timeAgo } from "@/lib/format";

type Meta = { key: string; name: string; area: string };

const ICON: Record<TestResult["status"], string> = { pass: "✓", fail: "✕", warn: "!", skip: "–" };

export function Lab({
  tests,
  last,
  history,
  testData,
}: {
  tests: Meta[];
  last: SuiteReport | null;
  history: { id: number; passed: number; failed: number; at: string }[];
  testData: { campaigns: number; clippers: number };
}) {
  const [report, run, running] = useActionState<SuiteReport | null, FormData>(runTests as never, last);
  const [seedState, seed] = useActionState<AState, FormData>(seedDemoData as never, null);
  const [purgeState, purge] = useActionState<AState, FormData>(purgeTests as never, null);
  const [open, setOpen] = useState<string | null>(null);
  const byKey = new Map((report?.results ?? []).map((r) => [r.key, r]));
  const areas = [...new Set(tests.map((t) => t.area))];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden">
          <form action={run} className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <SubmitButton pendingText="Running all tests">Run all tests</SubmitButton>
            <label className="flex items-center gap-2 text-[12px] text-mute">
              <input type="checkbox" name="keep" value="true" className="accent-white" /> Keep test data afterwards
            </label>
            <Input name="live_url" placeholder="Live test URL (optional TikTok/IG post)" className="ml-auto h-9 w-72 text-[12px]" />
          </form>
          {report && (
            <div className="flex items-center gap-6 border-b border-line bg-s2/50 px-5 py-3 text-[12px]">
              <span><span className="num text-[15px] text-ink">{report.passed}</span> <span className="text-mute">passed</span></span>
              <span><span className={cn("num text-[15px]", report.failed ? "text-ink underline decoration-2 underline-offset-4" : "text-dim")}>{report.failed}</span> <span className="text-mute">failed</span></span>
              {!!report.warned && <span><span className="num text-[15px]">{report.warned}</span> <span className="text-mute">warnings</span></span>}
              <span className="ml-auto text-dim">Last run {timeAgo(report.ranAt)}</span>
            </div>
          )}
          {running && (
            <div className="h-0.5 w-full overflow-hidden bg-s3">
              <motion.div className="h-full w-1/3 bg-ink" animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} />
            </div>
          )}
          {areas.map((area) => (
            <div key={area}>
              <div className="border-b border-line px-5 pb-2 pt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-dim">{area}</div>
              {tests
                .filter((t) => t.area === area)
                .map((t) => {
                  const r = byKey.get(t.key);
                  const isOpen = open === t.key;
                  return (
                    <div key={t.key} className="border-b border-line last:border-0">
                      <div className="flex items-center gap-3 px-5 py-3">
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                            !r && "border border-line2 text-dim",
                            r?.status === "pass" && "bg-ink text-black",
                            r?.status === "fail" && "border-2 border-ink text-ink",
                            r?.status === "warn" && "border border-dashed border-ink text-ink",
                            r?.status === "skip" && "border border-line2 text-dim",
                          )}
                        >
                          {r ? ICON[r.status] : ""}
                        </span>
                        <button onClick={() => setOpen(isOpen ? null : t.key)} className="min-w-0 flex-1 text-left">
                          <span className="text-[13px]">{t.name}</span>
                          {r && <span className="ml-2 text-[11px] text-dim">{r.steps.filter((s) => s.ok).length}/{r.steps.length} checks · {r.ms}ms</span>}
                        </button>
                        <form action={run}>
                          <input type="hidden" name="only" value={t.key} />
                          <button disabled={running} className="h-7 rounded-full border border-line2 px-3 text-[11px] text-mute transition-colors hover:text-ink disabled:opacity-40">Run</button>
                        </form>
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && r && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                            <div className="flex flex-col gap-1 bg-black/40 px-5 pb-4 pl-14 pt-1">
                              {r.steps.map((s, i) => (
                                <div key={i} className="flex gap-3 text-[12px]">
                                  <span className={s.ok ? "text-mute" : "font-semibold text-ink"}>{s.ok ? "✓" : "✕"}</span>
                                  <span className={s.ok ? "text-mute" : "text-ink"}>{s.label}</span>
                                  {s.detail && <span className="truncate font-mono text-[11px] text-dim">{s.detail}</span>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          ))}
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-[14px] font-medium">Click-through checklist</div>
          <p className="mb-4 text-[12px] text-mute">For testing by hand. Seed demo data first so every screen has something in it.</p>
          <ol className="grid gap-2 text-[13px] sm:grid-cols-2">
            {[
              ["Create a campaign, publish it", "/admin/campaigns/new"],
              ["See it on the public board", "/campaigns"],
              ["Sign up as a clipper in an incognito window", "/signup"],
              ["Connect + verify an account", "/dashboard/accounts"],
              ["Approve the account & audience", "/admin/verification"],
              ["Submit a clip from the campaign page", "/campaigns"],
              ["Approve / reject in the queue", "/admin/review"],
              ["Run a sync (simulated or live)", "/admin/sync"],
              ["Resolve a fraud flag", "/admin/flags"],
              ["Complete the campaign, mark payouts paid", "/admin/payouts"],
              ["Open the client report link", "/admin/clients"],
              ["Check the activity log", "/admin/activity"],
            ].map(([l, h], i) => (
              <li key={l}>
                <Link href={h} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 transition-colors hover:border-[#3a3a3a] hover:bg-s2">
                  <span className="num text-[11px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">{l}</span>
                  <span className="text-dim">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="text-[14px] font-medium">Test data</div>
          <p className="mt-1 text-[12px] text-mute">
            {testData.campaigns} test campaigns · {testData.clippers} test clippers. Test data shows a TEST badge, never appears on the public board, and is never synced with Apify.
          </p>
          <form action={seed} className="mt-4">
            <SubmitButton variant="secondary" className="w-full" pendingText="Seeding">Seed demo data</SubmitButton>
          </form>
          <form action={purge} className="mt-2">
            <SubmitButton variant="ghost" className="w-full" pendingText="Purging">Delete all test data</SubmitButton>
          </form>
          <div className="mt-3"><FormNote state={seedState ?? purgeState} /></div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-[14px] font-medium">Recent runs</div>
          {history.length ? (
            <div className="flex flex-col divide-y divide-line">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 text-[12px]">
                  <span className="text-dim">{timeAgo(h.at)}</span>
                  <span className="num">
                    <span className="text-ink">{h.passed} ✓</span>
                    <span className={cn("ml-3", h.failed ? "text-ink" : "text-dim")}>{h.failed} ✕</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-dim">No runs yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
