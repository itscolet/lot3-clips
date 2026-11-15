"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useT } from "@/lib/i18n/client";

export function NavLinks({ member }: { member: boolean }) {
  const path = usePathname();
  const t = useT();
  const links: [string, string][] = member
    ? [[t.common.campaigns, "/campaigns"], [t.common.leaderboard, "/leaderboard"], [t.support.nav, "/support"]]
    : [[t.common.howItWorks, "/#how"], [t.common.forBrands, "/#brands"], [t.support.nav, "/support"]];
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map(([label, href]) => {
        const active = !href.startsWith("/#") && path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="relative rounded-full px-3.5 py-1.5 text-[13px] text-mute transition-colors duration-150 hover:text-ink"
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-s3"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className={`relative ${active ? "text-ink" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
