"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export type NavItem = { href: string; label: string; short?: string; icon: ReactNode; badge?: number; exact?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

const ease = [0.22, 1, 0.36, 1] as const;

export function Shell({
  groups,
  children,
  footer,
  badge,
  id,
  mobileTabs = [],
}: {
  groups: NavGroup[];
  children: ReactNode;
  footer?: ReactNode;
  badge?: ReactNode;
  id: string;
  /** hrefs (max 4) shown in the mobile bottom bar; everything else lives in the menu */
  mobileTabs?: string[];
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  const all = groups.flatMap((g) => g.items);
  const tabs = mobileTabs.map((h) => all.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const current = all.find(isActive);
  const menuBadge = all.filter((i) => !mobileTabs.includes(i.href)).reduce((a, i) => a + (i.badge ?? 0), 0);

  // close the menu on navigation, lock scroll while open
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navList = (layoutKey: string) =>
    groups.map((g, gi) => (
      <div key={gi} className="mt-4">
        {g.title && <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-dim">{g.title}</div>}
        {g.items.map((i) => {
          const active = isActive(i);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors duration-150 md:h-9 md:rounded-lg md:text-[13px]",
                active ? "text-ink" : "text-mute hover:bg-s2 hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${id}-${layoutKey}-active`}
                  className="absolute inset-0 rounded-xl border border-line2 bg-s3 md:rounded-lg"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              )}
              <span className="relative [&>svg]:size-[18px] md:[&>svg]:size-4">{i.icon}</span>
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
    ));

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-[#050505] md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href="/"><Logo /></Link>
          {badge}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">{navList("desk")}</nav>
        {footer && <div className="border-t border-line p-3">{footer}</div>}
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-black/85 px-4 backdrop-blur-xl md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            {badge}
          </Link>
          <span className="min-w-0 flex-1 truncate text-right text-[13px] text-mute">{current?.label}</span>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="relative grid size-10 place-items-center rounded-full border border-line2 bg-s1 active:scale-95"
          >
            <span className="flex w-4 flex-col gap-[4px]">
              <span className="h-[1.5px] w-full rounded bg-ink" />
              <span className="h-[1.5px] w-full rounded bg-ink" />
              <span className="h-[1.5px] w-2/3 rounded bg-ink" />
            </span>
            {menuBadge > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-ink ring-2 ring-black" />}
          </button>
        </header>

        <main key={path} className={cn("page-enter mx-auto max-w-[1180px] px-4 py-6 sm:px-5 md:px-10 md:py-10", tabs.length > 0 && "pb-28 md:pb-10")}>
          {children}
        </main>

        {/* mobile bottom tabs */}
        {tabs.length > 0 && (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-black/90 backdrop-blur-xl md:hidden"
            style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {tabs.map((i) => {
              const active = isActive(i);
              return (
                <Link key={i.href} href={i.href} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[10px]">
                  {active && <motion.span layoutId={`${id}-tab`} className="absolute top-0 h-[2px] w-8 rounded-full bg-ink" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                  <span className={cn("relative [&>svg]:size-5", active ? "text-ink" : "text-dim")}>
                    {i.icon}
                    {!!i.badge && (
                      <span className="num absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-semibold text-black">
                        {i.badge}
                      </span>
                    )}
                  </span>
                  <span className={active ? "text-ink" : "text-dim"}>{i.short ?? i.label}</span>
                </Link>
              );
            })}
            <button onClick={() => setOpen(true)} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] text-dim">
              <span className="relative grid size-5 place-items-center">
                <span className="flex gap-[3px]">
                  <span className="size-[4px] rounded-full bg-current" />
                  <span className="size-[4px] rounded-full bg-current" />
                  <span className="size-[4px] rounded-full bg-current" />
                </span>
                {menuBadge > 0 && <span className="absolute -right-1.5 -top-0.5 size-2 rounded-full bg-ink" />}
              </span>
              More
            </button>
          </nav>
        )}
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-[340px] flex-col border-l border-line bg-[#070707] md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.26, ease }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) setOpen(false);
              }}
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <span className="text-[13px] text-mute">Menu</span>
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-full border border-line2 text-[18px] leading-none">
                  ×
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 pb-6">{navList("drawer")}</nav>
              {footer && <div className="border-t border-line p-3">{footer}</div>}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PageHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] font-medium tracking-[-0.035em] md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-mute">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2 max-md:[&>*]:flex-1">{action}</div>}
    </div>
  );
}
