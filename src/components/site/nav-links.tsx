"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const memberLinks = [
  ["Campaigns", "/campaigns"],
  ["Leaderboard", "/leaderboard"],
] as const;
const visitorLinks = [
  ["How it works", "/#how"],
  ["For brands", "/#brands"],
] as const;

export function NavLinks({ member }: { member: boolean }) {
  const path = usePathname();
  const links = member ? memberLinks : visitorLinks;
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
