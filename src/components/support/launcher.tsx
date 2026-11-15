"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { NewTicketForm } from "./new-ticket-form";

/** Floating "Help" button on public pages. Opens a compact message form (popover on desktop, sheet on phones). */
export function SupportLauncher({ username, unread = 0 }: { username?: string | null; unread?: number }) {
  const t = useT();
  const S = t.support;
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (path.startsWith("/support")) return null;

  const panel = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-medium tracking-[-0.03em]">{S.launcherTitle}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-mute">{S.launcherSub}</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label={t.common.closeMenu} className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-mute hover:bg-s3 hover:text-ink">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-5">
        <NewTicketForm username={username} compact />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[12px]">
        <Link href="/support#faq" className="text-mute hover:text-ink">{S.launcherFaq} →</Link>
        {username && <Link href="/dashboard/support" className="text-mute hover:text-ink">{S.yourConvos} →</Link>}
      </div>
    </>
  );

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={S.help}
        className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-[13px] font-medium text-black shadow-[0_8px_30px_rgba(0,0,0,0.5)] sm:bottom-6 sm:right-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        whileTap={{ scale: 0.96 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
        {S.help}
        {unread > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-black px-1.5 text-[10px] font-semibold text-ink">{unread}</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] sm:bg-black/25 sm:backdrop-blur-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            {/* desktop popover */}
            <motion.div
              role="dialog"
              aria-label={S.launcherTitle}
              className="fixed bottom-24 right-6 z-50 hidden max-h-[calc(100vh-180px)] w-[400px] overflow-y-auto rounded-3xl border border-line2 bg-[#0c0c0c] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)] sm:block"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "bottom right" }}
            >
              {panel}
            </motion.div>
            {/* phone sheet */}
            <motion.div
              role="dialog"
              aria-label={S.launcherTitle}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-line2 bg-[#0a0a0a] px-5 pt-3 sm:hidden"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line2" />
              {panel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
