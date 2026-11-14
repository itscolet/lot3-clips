import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/ui/icons";
import { LinkButton } from "@/components/ui/ui";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";

export async function Header() {
  const { profile } = await getSession();
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="LOT3 Clips home">
            <Logo />
          </Link>
          <NavLinks member={!!profile} />
        </div>
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              {profile.role === "admin" && (
                <LinkButton href="/admin" variant="ghost" size="sm" className="max-md:hidden">
                  Admin
                </LinkButton>
              )}
              <LinkButton href="/dashboard" variant="secondary" size="sm" className="max-md:hidden">
                <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] font-semibold uppercase text-black">
                  {profile.username.slice(0, 1)}
                </span>
                Dashboard
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="max-md:hidden">
                Log in
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                Get invited
              </LinkButton>
            </>
          )}
          <MobileNav member={!!profile} admin={profile?.role === "admin"} />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-[13px] leading-relaxed text-mute">
            Post clips for music, film and brand campaigns. Get paid for every verified view.
          </p>
          <p className="text-[12px] text-dim">A LOT3 Media company.</p>
        </div>
        <FooterCol title="Clippers" links={[["Get invited", "/signup"], ["Log in", "/login"], ["How it works", "/#how"]]} />
        <FooterCol title="Brands & labels" links={[["Launch a campaign", "mailto:partnerships@lot3media.com"], ["LOT3 Media", "https://lot3media.com"]]} />
        <FooterCol title="Policy" links={[["Terms & rules", "/terms"]]} />
      </div>
      <div className="mx-auto flex max-w-[1240px] justify-between border-t border-line px-5 py-6 text-[12px] text-dim">
        <span>© {new Date().getFullYear()} LOT3 Media LLC</span>
        <span>Paid per verified view.</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-dim">{title}</span>
      {links.map(([l, h]) => (
        <Link key={l} href={h} className="text-[13px] text-mute transition-colors duration-150 hover:text-ink">
          {l}
        </Link>
      ))}
    </div>
  );
}
