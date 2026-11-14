import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Table({ children, className, desktopOnly }: { children: ReactNode; className?: string; desktopOnly?: boolean }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-s1", desktopOnly && "hidden md:block", className)}>
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
    <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[12px] transition-colors duration-150 sm:h-8",
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
      <div className="num mt-2 text-[20px] leading-none md:mt-2.5 md:text-[26px]">{value}</div>
      {sub && <div className="mt-2 text-[12px] text-mute">{sub}</div>}
    </>
  );
  return href ? (
    <a href={href} className="block bg-s1 p-4 transition-colors duration-150 hover:bg-s2 md:p-5">{inner}</a>
  ) : (
    <div className="bg-s1 p-4 md:p-5">{inner}</div>
  );
}

/** Card list shown instead of a table on phones. */
export function MobileList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 md:hidden">{children}</div>;
}

export function MobileCard({
  title,
  sub,
  right,
  stats,
  footer,
  href,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  stats?: [ReactNode, ReactNode][];
  footer?: ReactNode;
  href?: string;
}) {
  const head = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{title}</div>
        {sub && <div className="mt-0.5 truncate text-[12px] text-dim">{sub}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
  return (
    <div className="rounded-2xl border border-line bg-s1 p-4">
      {href ? <a href={href} className="block">{head}</a> : head}
      {stats && stats.length > 0 && (
        <div className="mt-3 grid gap-2 border-t border-line pt-3 text-[11px] text-dim" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map(([v, l], i) => (
            <div key={i} className="min-w-0">
              <div className="num truncate text-[14px] text-ink">{v}</div>
              {l}
            </div>
          ))}
        </div>
      )}
      {footer && <div className="mt-3 border-t border-line pt-3">{footer}</div>}
    </div>
  );
}
