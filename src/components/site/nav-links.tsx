"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const links = [
  ["Campaigns", "/campaigns"],
  ["Leaderboard", "/leaderboard"],
  ["How it works", "/#how"],
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map(([label, href]) => {
        const active = href !== "/#how" && path.startsWith(href);
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
