import { cn } from "@/lib/format";

/** Greyscale status pill. open = waiting on the team, waiting = team replied, resolved = done. */
export function TicketStatusPill({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        status === "waiting" && "border-ink bg-ink text-black",
        status === "open" && "border-line2 text-ink",
        status === "resolved" && "border-line text-dim",
        className,
      )}
    >
      {status === "open" && <span className="live-dot size-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
