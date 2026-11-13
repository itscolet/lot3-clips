import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-[background,color,border,transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
const variants = {
  primary: "bg-ink text-black hover:bg-white",
  secondary: "bg-s3 text-ink border border-line2 hover:bg-[#222] hover:border-[#3a3a3a]",
  ghost: "text-mute hover:text-ink hover:bg-s2",
  danger: "bg-transparent text-ink border border-line2 hover:bg-ink hover:text-black",
} as const;
const sizes = { sm: "h-8 px-3.5", md: "h-10 px-5", lg: "h-12 px-7 text-[14px]" } as const;

export type BtnProps = { variant?: keyof typeof variants; size?: keyof typeof sizes };

export function btn({ variant = "primary", size = "md" }: BtnProps = {}) {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({ variant, size, className, ...p }: ComponentProps<"button"> & BtnProps) {
  return <button {...p} className={cn(btn({ variant, size }), className)} />;
}

export function LinkButton({ variant, size, className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return <Link {...p} className={cn(btn({ variant, size }), className)} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div {...p} className={cn("rounded-2xl border border-line bg-s1", className)} />;
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "solid" | "outline" | "dim";
  className?: string;
}) {
  const tones = {
    default: "bg-s3 text-ink border border-line2",
    solid: "bg-ink text-black",
    outline: "border border-line2 text-mute",
    dim: "bg-s2 text-dim",
  };
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium uppercase tracking-[0.06em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "default" | "solid" | "outline" | "dim"; dot?: boolean }> = {
    live: { tone: "solid", dot: true },
    approved: { tone: "solid" },
    pending: { tone: "default", dot: true },
    paused: { tone: "outline" },
    draft: { tone: "dim" },
    complete: { tone: "outline" },
    rejected: { tone: "dim" },
    removed: { tone: "dim" },
    open: { tone: "default", dot: true },
    resolved: { tone: "outline" },
    dismissed: { tone: "dim" },
    banned: { tone: "dim" },
    active: { tone: "outline" },
    paid: { tone: "solid" },
    owed: { tone: "default" },
    none: { tone: "dim" },
  };
  const m = map[status] ?? { tone: "outline" as const };
  return (
    <Badge tone={m.tone}>
      {m.dot && <span className="live-dot size-1.5 rounded-full bg-current" />}
      {status}
    </Badge>
  );
}

export function TestBadge() {
  return (
    <span className="inline-flex h-[18px] items-center rounded border border-dashed border-[#555] px-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-mute">
      Test
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-dim">{label}</span>
      <span className="num text-[26px] leading-none font-medium text-ink">{value}</span>
      {sub && <span className="text-[12px] text-mute">{sub}</span>}
    </div>
  );
}

export function Progress({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-s3", className)}>
      <div
        className="h-full rounded-full bg-ink transition-[width] duration-700 ease-[var(--ease-out-quint)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-[12px] font-medium text-mute">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-dim">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line2 bg-s2 px-3.5 text-[14px] text-ink placeholder:text-dim outline-none transition-[border,background] duration-150 focus:border-[#555] focus:bg-s3";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input {...p} className={cn(inputCls, "h-11", className)} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cn(inputCls, "min-h-28 py-3 leading-relaxed", className)} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select {...p} className={cn(inputCls, "h-11 appearance-none pr-8", className)} />;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line2 px-6 py-14 text-center">
      <span className="text-[14px] font-medium">{title}</span>
      {body && <span className="max-w-sm text-[13px] text-mute">{body}</span>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-mute">{children}</h2>
      {action}
    </div>
  );
}

export function Avatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover grayscale" style={{ width: size, height: size }} />;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border border-line2 bg-s3 text-[11px] font-semibold uppercase text-mute"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2)}
    </span>
  );
}
