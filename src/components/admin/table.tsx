import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-s1", className)}>
      <table className="w-full min-w-[640px] text-[13px]">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-s2/60 text-left text-[11px] uppercase tracking-[0.08em] text-dim">
      <tr>{children}</tr>
    </thead>
  );
}
export function Th({ className, ...p }: ComponentProps<"th">) {
  return <th {...p} className={cn("whitespace-nowrap px-4 py-3 font-medium first:pl-5 last:pr-5", className)} />;
}
export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}
export function Tr({ className, ...p }: ComponentProps<"tr">) {
  return <tr {...p} className={cn("transition-colors duration-100 hover:bg-s2/70", className)} />;
}
export function Td({ className, ...p }: ComponentProps<"td">) {
  return <td {...p} className={cn("px-4 py-3 align-middle first:pl-5 last:pr-5", className)} />;
}

export function FilterTabs({ tabs, active }: { tabs: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          className={cn(
            "flex h-8 items-center gap-2 rounded-full border px-3.5 text-[12px] transition-colors duration-150",
            active === t.key ? "border-ink bg-ink text-black" : "border-line2 text-mute hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cn("num text-[11px]", active === t.key ? "text-black/60" : "text-dim")}>{t.count}</span>}
        </a>
      ))}
    </div>
  );
}

export function KPI({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const inner = (
    <>
      <div className="text-[11px] uppercase tracking-[0.1em] text-dim">{label}</div>
      <div className="num mt-2.5 text-[26px] leading-none">{value}</div>
      {sub && <div className="mt-2 text-[12px] text-mute">{sub}</div>}
    </>
  );
  return href ? (
    <a href={href} className="block bg-s1 p-5 transition-colors duration-150 hover:bg-s2">{inner}</a>
  ) : (
    <div className="bg-s1 p-5">{inner}</div>
  );
}
