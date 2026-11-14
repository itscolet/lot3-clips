"use client";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { reviewSubmission, setManualViews, syncNow, type AState } from "@/app/admin/actions";
import { SubmitButton, ActionForm } from "@/components/ui/motion";
import { FormNote } from "@/components/ui/form-note";
import { cn } from "@/lib/format";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-line2 bg-s2 p-1.5 pl-3.5">
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-mute md:text-[12px]">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="h-8 shrink-0 rounded-lg bg-ink px-3 text-[12px] font-medium text-black transition-transform active:scale-95"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <a href={value} target="_blank" className="grid h-8 shrink-0 place-items-center rounded-lg border border-line2 px-3 text-[12px] text-mute hover:text-ink">Open</a>
    </div>
  );
}

export function ConfirmButton({ action, id, label, confirmLabel }: { action: (fd: FormData) => void | Promise<void>; id: string; label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type={armed ? "submit" : "button"}
        onClick={(e) => {
          if (!armed) {
            e.preventDefault();
            setArmed(true);
          }
        }}
        className={cn("h-9 rounded-full px-4 text-[12px] font-medium transition-colors duration-150", armed ? "bg-ink text-black" : "border border-line2 text-mute hover:text-ink")}
      >
        {armed ? confirmLabel : label}
      </button>
    </ActionForm>
  );
}

const REASONS = ["Wrong or missing sound", "Off-brief content", "Low quality / reupload", "Not a US audience", "Duplicate post", "Account not eligible", "Suspected botting"];

export function ReviewButtons({ id, status, compact = true }: { id: string; status: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const send = (decision: string, reason?: string) =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("decision", decision);
      if (reason) fd.set("reason", reason);
      await reviewSubmission(fd);
      setOpen(false);
    });
  const b = "h-9 md:h-7 rounded-full px-3.5 md:px-3 text-[12px] md:text-[11px] font-medium transition-colors duration-150 disabled:opacity-40";
  return (
    <div className="relative flex items-center gap-1.5">
      {status !== "approved" && (
        <button disabled={pending} onClick={() => send("approve")} className={cn(b, "bg-ink text-black hover:bg-white")}>Approve</button>
      )}
      {status !== "rejected" && (
        <button disabled={pending} onClick={() => setOpen((o) => !o)} className={cn(b, "border border-line2 text-mute hover:text-ink")}>Reject</button>
      )}
      {status !== "pending" && !compact && (
        <button disabled={pending} onClick={() => send("reset")} className={cn(b, "text-dim hover:text-ink")}>Reset</button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-line2 bg-s2 p-1.5 shadow-2xl shadow-black"
          >
            {REASONS.map((r) => (
              <button key={r} disabled={pending} onClick={() => send("reject", r)} className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-mute hover:bg-s3 hover:text-ink">
                {r}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ManualViews({ id, views, likes }: { id: string; views: number; likes: number }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<AState, FormData>(async (prev, fd) => {
    const r = await setManualViews(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="h-9 rounded-full px-2.5 text-[12px] text-dim transition-colors hover:text-ink md:h-7 md:text-[11px]" title="Edit views manually">
        Edit views
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-line2 bg-s2 p-3 shadow-2xl shadow-black"
          >
            <ActionForm action={action} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={id} />
            <label className="text-[11px] text-dim">Views<input name="views" type="number" defaultValue={views} className="mt-1 h-8 w-full rounded-lg border border-line2 bg-black px-2.5 text-[12px]" /></label>
            <label className="text-[11px] text-dim">Likes<input name="likes" type="number" defaultValue={likes} className="mt-1 h-8 w-full rounded-lg border border-line2 bg-black px-2.5 text-[12px]" /></label>
            <SubmitButton size="sm" pendingText="Saving">Save & recalc</SubmitButton>
            <FormNote state={state?.error ? state : null} />
            </ActionForm>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SyncButton({ campaignId }: { campaignId?: string }) {
  const [state, action] = useActionState<AState, FormData>(syncNow, null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <ActionForm ref={ref} action={action} className="flex flex-col gap-3">
      {campaignId && <input type="hidden" name="campaign_id" value={campaignId} />}
      <div className="flex flex-wrap gap-2">
        <SubmitButton size="sm" name="simulate" value="false" pendingText="Syncing with Apify">Sync live views now</SubmitButton>
        <SubmitButton size="sm" variant="secondary" name="simulate" value="true" pendingText="Simulating">Simulated sync (test data only)</SubmitButton>
      </div>
      <FormNote state={state} />
    </ActionForm>
  );
}
