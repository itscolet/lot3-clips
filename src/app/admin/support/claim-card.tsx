"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { resolveClaim, type InboxState } from "./actions";
import { cn, money, timeAgo } from "@/lib/format";

type M = {
  type: "claim_conflict";
  attempts?: number;
  platform: string;
  handle: string;
  url: string;
  owner_id: string;
  owner_username: string;
  owner_email: string | null;
  owner_claimed_at: string;
  owner_joined_at: string;
  owner_clips: number;
  owner_approved: number;
  owner_earned: number;
  owner_other_pages: string;
  claimant_id: string;
  claimant_username: string;
  claimant_email: string | null;
  claimant_joined_at: string;
  claimant_pages: string;
  claimant_prior_conflicts: number;
  risk: string;
  decision?: "transfer" | "keep";
  decided_by?: string;
  decided_at?: string;
};

const PLATFORM: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" };

/** Everything needed to settle a blocked page claim, with one-click Transfer / Keep. */
export function ClaimCard({ ticketId, meta, lang }: { ticketId: string; meta: M; lang: string }) {
  const [confirm, setConfirm] = useState<"transfer" | "keep" | null>(null);
  const [result, setResult] = useState<InboxState>(null);
  const [pending, start] = useTransition();
  const level = meta.risk.split(":")[0];
  const decide = (d: "transfer" | "keep") =>
    start(async () => {
      const fd = new FormData();
      fd.set("ticket_id", ticketId);
      fd.set("decision", d);
      setResult(await resolveClaim(fd));
      setConfirm(null);
    });

  return (
    <div className="rounded-2xl border border-ink/40 bg-s1 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black">Claim blocked</span>
        {(meta.attempts ?? 1) > 1 && <span className="rounded border border-ink/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]">{meta.attempts} attempts</span>}
        <a href={meta.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[13px] font-medium hover:underline">
          @{meta.handle} on {PLATFORM[meta.platform] ?? meta.platform} ↗
        </a>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Side
          title="Trying to claim"
          id={meta.claimant_id}
          user={meta.claimant_username}
          email={meta.claimant_email}
          rows={[
            ["Joined", timeAgo(meta.claimant_joined_at)],
            ["Pages they hold", meta.claimant_pages],
            ["Past blocked claims", String(meta.claimant_prior_conflicts)],
          ]}
        />
        <Side
          title="Current owner"
          id={meta.owner_id}
          user={meta.owner_username}
          email={meta.owner_email}
          rows={[
            ["Claimed page", timeAgo(meta.owner_claimed_at)],
            ["Clips on page", `${meta.owner_clips} (${meta.owner_approved} approved)`],
            ["Earned on page", money(Number(meta.owner_earned))],
            ["Other pages", meta.owner_other_pages],
          ]}
        />
      </div>

      <p className="mt-4 rounded-xl border border-line2 px-3.5 py-2.5 text-[12px] leading-relaxed text-mute">
        <span className={cn("mr-1 font-semibold", level === "HIGH" || level === "CAREFUL" ? "text-ink" : "text-mute")}>{level}</span>
        {meta.risk.slice(level.length + 1).trim()}
      </p>

      {meta.decision ? (
        <p className="mt-4 text-[12px] text-mute">
          {meta.decision === "transfer" ? `Transferred to @${meta.claimant_username}` : `Kept with @${meta.owner_username}`}
          {meta.decided_by ? ` by @${meta.decided_by}` : ""}
          {meta.decided_at ? ` · ${timeAgo(meta.decided_at)}` : ""}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {confirm ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-mute">
                {confirm === "transfer"
                  ? `Move @${meta.handle} to @${meta.claimant_username}? Past clips and earnings stay with @${meta.owner_username}.`
                  : `Keep @${meta.handle} with @${meta.owner_username}?`}
              </span>
              <button onClick={() => decide(confirm)} disabled={pending} className="h-8 rounded-full bg-ink px-4 text-[12px] font-medium text-black disabled:opacity-50">
                {pending ? "Working…" : "Confirm"}
              </button>
              <button onClick={() => setConfirm(null)} disabled={pending} className="h-8 rounded-full px-3 text-[12px] text-mute hover:text-ink">Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setConfirm("transfer")} className="h-9 rounded-full bg-ink px-4 text-[12px] font-medium text-black transition-transform active:scale-[0.97]">
                Transfer to @{meta.claimant_username}
              </button>
              <button onClick={() => setConfirm("keep")} className="h-9 rounded-full border border-line2 px-4 text-[12px] text-ink transition-colors hover:border-[#555]">
                Keep with @{meta.owner_username}
              </button>
            </div>
          )}
          <span className="text-[11px] text-dim">Either way, @{meta.claimant_username} gets a message in {lang === "es" ? "Spanish" : "English"} and the ticket is resolved.</span>
        </div>
      )}
      {result?.error && <p className="mt-2 text-[12px] text-ink">{result.error}</p>}
      {result?.ok && <p className="mt-2 text-[12px] text-mute">✓ {result.message}</p>}
    </div>
  );
}

function Side({ title, id, user, email, rows }: { title: string; id: string; user: string; email: string | null; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-line bg-black/30 p-3.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-dim">{title}</div>
      <Link href={`/admin/clippers/${id}`} className="mt-1 block text-[14px] font-medium hover:underline">@{user}</Link>
      {email && <a href={`mailto:${email}`} className="block truncate text-[12px] text-mute hover:text-ink">{email}</a>}
      <dl className="mt-2.5 flex flex-col gap-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 text-[12px]">
            <dt className="shrink-0 text-dim">{k}</dt>
            <dd className="min-w-0 text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
