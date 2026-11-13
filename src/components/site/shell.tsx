"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export type NavItem = { href: string; label: string; icon: ReactNode; badge?: number; exact?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

export function Shell({
  groups,
  children,
  footer,
  badge,
  id,
}: {
  groups: NavGroup[];
  children: ReactNode;
  footer?: ReactNode;
  badge?: ReactNode;
  id: string;
}) {
  const path = usePathname();
  const isActive = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-[#050505] md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href="/"><Logo /></Link>
          {badge}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {groups.map((g, gi) => (
            <div key={gi} className="mt-4">
              {g.title && <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-dim">{g.title}</div>}
              {g.items.map((i) => {
                const active = isActive(i);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={cn(
                      "relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors duration-150",
                      active ? "text-ink" : "text-mute hover:bg-s2 hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`${id}-active`}
                        className="absolute inset-0 rounded-lg border border-line2 bg-s3"
                        transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      />
                    )}
                    <span className="relative [&>svg]:size-4">{i.icon}</span>
                    <span className="relative flex-1">{i.label}</span>
                    {!!i.badge && (
                      <span className="num relative grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10px] font-semibold text-black">
                        {i.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        {footer && <div className="border-t border-line p-3">{footer}</div>}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex h-14 items-center gap-1 overflow-x-auto border-b border-line bg-black/80 px-3 backdrop-blur md:hidden">
          {groups.flatMap((g) => g.items).map((i) => (
            <Link key={i.href} href={i.href} className={cn("shrink-0 rounded-full px-3 py-1.5 text-[12px]", isActive(i) ? "bg-ink text-black" : "text-mute")}>
              {i.label}
            </Link>
          ))}
        </div>
        <main key={path} className="page-enter mx-auto max-w-[1180px] px-5 py-8 md:px-10 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-medium tracking-[-0.035em]">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-mute">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
