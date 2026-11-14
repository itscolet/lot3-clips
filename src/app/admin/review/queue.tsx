"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { reviewSubmission } from "../actions";
import { PlatformIcon } from "@/components/ui/icons";
import { Badge, StatusBadge, TestBadge } from "@/components/ui/ui";
import { compact, timeAgo, cn } from "@/lib/format";
import type { Platform } from "@/lib/types";

export type QueueItem = {
  id: string;
  url: string;
  platform: Platform;
  status: string;
  views: number;
  likes: number;
  reject_reason: string | null;
  created_at: string;
  is_test: boolean;
  campaign_id: string;
  campaigns: { id: string; title: string; slug: string; platforms: Platform[]; territory: string; content_rules: string[]; sound_url: string | null } | null;
  profiles: { id: string; username: string; trust: string; status: string; created_at: string } | null;
  social_accounts: { handle: string; followers: number | null; verified_at: string | null; audience_status: string; us_audience_pct: number | null } | null;
};

const REASONS = ["Wrong or missing sound", "Off-brief content", "Low quality / reupload", "Not a US audience", "Duplicate post", "Account not eligible", "Suspected botting"];

export function ReviewQueue({ items, history }: { items: QueueItem[]; history: Record<string, { approved: number; rejected: number }> }) {
  const [list, setList] = useState(items);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pending, start] = useTransition();
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setList(items);
  }
  const cur = list[Math.min(idx, list.length - 1)];

  const decide = useCallback(
    (ids: string[], decision: "approve" | "reject", reason?: string) =>
      start(async () => {
        const fd = new FormData();
        ids.forEach((i) => fd.append("id", i));
        fd.set("decision", decision);
        if (reason) fd.set("reason", reason);
        setList((l) => l.filter((x) => !ids.includes(x.id) || x.status !== "pending"));
        setSelected(new Set());
        setRejecting(false);
        await reviewSubmission(fd);
      }),
    [],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (!cur) return;
      if (e.key === "j" || e.key === "ArrowDown") setIdx((i) => Math.min(list.length - 1, i + 1));
      else if (e.key === "k" || e.key === "ArrowUp") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "a") decide([cur.id], "approve");
      else if (e.key === "r") setRejecting((r) => !r);
      else if (e.key === "o") window.open(cur.url, "_blank");
      else if (e.key === "Escape") setRejecting(false);
      else if (rejecting && /^[1-7]$/.test(e.key)) decide([cur.id], "reject", REASONS[Number(e.key) - 1]);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cur, list.length, decide, rejecting]);

  if (!list.length) return <p className="py-20 text-center text-[14px] text-mute">All caught up.</p>;
  const pos = Math.min(idx, list.length - 1) + 1;

  const detail = cur ? (
    <>

              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase tracking-[0.1em] text-dim">Clip {pos} of {list.length}</span>
                <StatusBadge status={cur.status} />
              </div>
              <a href={cur.url} target="_blank" className="group flex items-center justify-between gap-3 rounded-xl border border-line2 bg-black px-4 py-4 transition-colors hover:border-[#555]">
                <span className="flex min-w-0 items-center gap-3">
                  <PlatformIcon platform={cur.platform} className="size-5 shrink-0" />
                  <span className="truncate text-[13px] text-mute group-hover:text-ink">{cur.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                </span>
                <span className="text-[12px] text-ink">Open ↗</span>
              </a>

              <Section title="Clipper">
                <Row k="User" v={<Link href={`/admin/clippers/${cur.profiles?.id}`} className="hover:underline">{cur.profiles?.username}</Link>} />
                <Row k="Posted from" v={`@${cur.social_accounts?.handle ?? "—"}`} />
                <Row k="Followers" v={cur.social_accounts?.followers ? compact(cur.social_accounts.followers) : "—"} />
                <Row k="US audience" v={cur.social_accounts?.audience_status === "approved" ? `Approved${cur.social_accounts.us_audience_pct ? ` · ${cur.social_accounts.us_audience_pct}%` : ""}` : cur.social_accounts?.audience_status ?? "—"} />
                <Row k="Track record" v={`${history[cur.profiles?.id ?? ""]?.approved ?? 0} approved · ${history[cur.profiles?.id ?? ""]?.rejected ?? 0} rejected`} />
                <Row k="Trust" v={cur.profiles?.trust === "watch" ? <Badge tone="solid">Watch</Badge> : cur.profiles?.trust ?? "—"} />
              </Section>

              <Section title={`Campaign · ${cur.campaigns?.title ?? ""}`}>
                {(cur.campaigns?.content_rules ?? []).map((r, i) => (
                  <div key={i} className="py-1.5 text-[12px] text-mute">• {r}</div>
                ))}
                {cur.campaigns?.sound_url && (
                  <a href={cur.campaigns.sound_url} target="_blank" className="py-1.5 text-[12px] text-ink underline underline-offset-2">Campaign sound ↗</a>
                )}
              </Section>

              {cur.reject_reason && <p className="rounded-lg bg-s2 px-3 py-2 text-[12px] text-mute">Reason: {cur.reject_reason}</p>}

              <div className="flex gap-2">
                <button disabled={pending || cur.status === "approved"} onClick={() => decide([cur.id], "approve")} className="h-12 flex-1 rounded-full bg-ink lg:h-11 text-[13px] font-medium text-black transition-[transform,opacity] active:scale-[0.98] disabled:opacity-30">
                  Approve <span className="ml-1 text-black/40 max-lg:hidden">A</span>
                </button>
                <button disabled={pending} onClick={() => setRejecting((r) => !r)} className="h-12 flex-1 rounded-full border lg:h-11 border-line2 text-[13px] font-medium transition-colors hover:border-[#555]">
                  Reject <span className="ml-1 text-dim max-lg:hidden">R</span>
                </button>
              </div>
              <AnimatePresence>
                {rejecting && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden">
                    <div className="grid gap-1">
                      {REASONS.map((r, i) => (
                        <button key={r} disabled={pending} onClick={() => decide([cur.id], "reject", r)} className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-[13px] lg:py-2 lg:text-[12px] text-mute hover:bg-s3 hover:text-ink">
                          {r} <span className="num text-dim max-lg:hidden">{i + 1}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
    </>
  ) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="mb-1 flex h-9 items-center gap-3 px-1 text-[12px] text-mute">
          <input
            type="checkbox"
            className="accent-white"
            checked={selected.size === list.length && list.length > 0}
            onChange={(e) => setSelected(e.target.checked ? new Set(list.map((i) => i.id)) : new Set())}
          />
          {selected.size ? (
            <>
              <span>{selected.size} selected</span>
              <button disabled={pending} onClick={() => decide([...selected], "approve")} className="h-7 rounded-full bg-ink px-3 text-[11px] font-medium text-black">Approve all</button>
              <button disabled={pending} onClick={() => decide([...selected], "reject", "Off-brief content")} className="h-7 rounded-full border border-line2 px-3 text-[11px]">Reject all</button>
            </>
          ) : (
            <span>{list.length} clips</span>
          )}
        </div>
        <AnimatePresence initial={false}>
          {list.map((it, i) => (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 16, height: 0, marginTop: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => {
                setIdx(i);
                setSheet(true);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px] transition-colors duration-100",
                cur?.id === it.id ? "border-[#4a4a4a] bg-s3" : "border-line bg-s1 hover:bg-s2",
              )}
            >
              <input
                type="checkbox"
                className="accent-white"
                checked={selected.has(it.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const n = new Set(selected);
                  if (e.target.checked) n.add(it.id);
                  else n.delete(it.id);
                  setSelected(n);
                }}
              />
              <PlatformIcon platform={it.platform} className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium">{it.profiles?.username}</span>
                  <span className="text-dim">→</span>
                  <span className="truncate text-mute">{it.campaigns?.title}</span>
                  {it.is_test && <TestBadge />}
                </div>
                <div className="truncate text-[11px] text-dim">{it.url.replace(/^https?:\/\/(www\.)?/, "")}</div>
              </div>
              <span className="text-[11px] text-dim">{timeAgo(it.created_at)}</span>
              {it.status !== "pending" && <StatusBadge status={it.status} />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {cur && (
        <div className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-s1 p-5"
            >
              {detail}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* phone: bottom sheet */}
      <AnimatePresence>
        {cur && sheet && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSheet(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-line2 bg-[#0a0a0a] px-4 pt-3 lg:hidden"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120) setSheet(false);
              }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line2" />
              <AnimatePresence mode="wait">
                <motion.div key={cur.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }} className="flex flex-col gap-4">
                  {detail}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[0.1em] text-dim">{title}</div>
      <div className="flex flex-col divide-y divide-line">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-[12px]">
      <span className="text-mute">{k}</span>
      <span>{v}</span>
    </div>
  );
}
