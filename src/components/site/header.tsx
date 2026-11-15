import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { Logo } from "@/components/ui/icons";
import { LinkButton } from "@/components/ui/ui";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { LangSwitch } from "./lang-switch";

export async function Header() {
  const [{ profile }, { t }] = await Promise.all([getSession(), getT()]);
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="LOT3 Clips">
            <Logo />
          </Link>
          <NavLinks member={!!profile} />
        </div>
        <div className="flex items-center gap-2">
          <LangSwitch className="max-md:hidden" />
          {profile ? (
            <>
              {profile.role === "admin" && (
                <LinkButton href="/admin" variant="ghost" size="sm" className="max-md:hidden">
                  {t.common.admin}
                </LinkButton>
              )}
              <LinkButton href="/dashboard" variant="secondary" size="sm" className="max-md:hidden">
                <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] font-semibold uppercase text-black">
                  {profile.username.slice(0, 1)}
                </span>
                {t.common.dashboard}
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="max-md:hidden">
                {t.common.login}
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                {t.common.getInvited}
              </LinkButton>
            </>
          )}
          <MobileNav member={!!profile} admin={profile?.role === "admin"} />
        </div>
      </div>
    </header>
  );
}

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-[13px] leading-relaxed text-mute">{t.footer.blurb}</p>
          <p className="text-[12px] text-dim">{t.footer.company}</p>
          <LangSwitch className="self-start" />
        </div>
        <FooterCol
          title={t.footer.clippers}
          links={[[t.common.getInvited, "/signup"], [t.common.login, "/login"], [t.common.howItWorks, "/#how"], [t.support.nav, "/support"]]}
        />
        <FooterCol title={t.footer.brands} links={[[t.home.launch, "mailto:partnerships@lot3media.com"], ["LOT3 Media", "https://lot3media.com"]]} />
        <FooterCol title={t.footer.policy} links={[[t.footer.terms, "/terms"]]} />
      </div>
      <div className="mx-auto flex max-w-[1240px] justify-between border-t border-line px-5 py-6 text-[12px] text-dim">
        <span>© {new Date().getFullYear()} LOT3 Media LLC</span>
        <span>{t.footer.tagline}</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-dim">{title}</span>
      {links.map(([l, h]) => (
        <Link key={h} href={h} className="text-[13px] text-mute transition-colors duration-150 hover:text-ink">
          {l}
        </Link>
      ))}
    </div>
  );
}
