"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { LangSwitch } from "./lang-switch";

export function MobileNav({ member, admin }: { member: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const t = useT();
  const [last, setLast] = useState(path);
  if (path !== last) {
    setLast(path);
    setOpen(false);
  }
  const links: [string, string][] = member
    ? [[t.common.yourInvitations, "/campaigns"], [t.common.leaderboard, "/leaderboard"], [t.common.dashboard, "/dashboard"], ...(admin ? ([[t.common.admin, "/admin"]] as [string, string][]) : [])]
    : [[t.common.howItWorks, "/#how"], [t.common.forBrands, "/#brands"], [t.common.login, "/login"]];
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.common.closeMenu : t.common.openMenu}
        className="grid size-9 place-items-center rounded-full border border-line2 bg-s1 active:scale-95"
      >
        <span className="relative block h-3 w-4">
          <motion.span className="absolute left-0 h-[1.5px] w-4 rounded bg-ink" animate={open ? { top: 5, rotate: 45 } : { top: 0, rotate: 0 }} transition={{ duration: 0.18 }} />
          <motion.span className="absolute left-0 top-[5px] h-[1.5px] w-4 rounded bg-ink" animate={{ opacity: open ? 0 : 1 }} transition={{ duration: 0.12 }} />
          <motion.span className="absolute left-0 h-[1.5px] w-4 rounded bg-ink" animate={open ? { top: 5, rotate: -45 } : { top: 10, rotate: 0 }} transition={{ duration: 0.18 }} />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-16 border-b border-line bg-black/95 px-5 pb-6 pt-2 backdrop-blur-xl"
          >
            {links.map(([l, h]) => (
              <Link key={h} href={h} onClick={() => setOpen(false)} className="flex h-14 items-center justify-between border-b border-line text-[17px] tracking-[-0.01em]">
                {l}
                <span className="text-dim">→</span>
              </Link>
            ))}
            <div className="flex h-14 items-center justify-between border-b border-line text-[15px] text-mute">
              {t.lang.label}
              <LangSwitch />
            </div>
            {!member && (
              <Link href="/signup" onClick={() => setOpen(false)} className="mt-5 flex h-12 items-center justify-center rounded-full bg-ink text-[14px] font-medium text-black">
                {t.common.getInvitedToCampaigns}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
