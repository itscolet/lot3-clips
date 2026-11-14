import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { LinkButton, SectionTitle } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  // Members go straight to the campaigns they've been invited to.
  const [{ profile }, { t }] = await Promise.all([getSession(), getT()]);
  if (profile) redirect("/campaigns");
  const h = t.home;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 0%, #2a2a2a 0%, transparent 60%), radial-gradient(40% 40% at 10% 30%, #161616 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(70% 60% at 50% 30%, #000, transparent)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-28 pt-24 md:pt-36">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line2 bg-s1/80 px-3 py-1 text-[12px] text-mute">
              <span className="live-dot size-1.5 rounded-full bg-ink" />
              {h.badge}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-7 max-w-4xl text-[52px] font-medium leading-[0.98] tracking-[-0.045em] md:text-[88px]">
              {h.h1a}
              <br />
              <span className="font-serif italic font-normal tracking-[-0.02em] text-mute">{h.h1b}</span>
              {h.h1c}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-mute">
              {h.sub}
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-9 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup" size="lg">
              {t.common.getInvitedToCampaigns}
            </LinkButton>
            <LinkButton href="/login" size="lg" variant="ghost">
              {h.haveAccount}
            </LinkButton>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-14 flex flex-wrap items-center gap-6 text-[12px] text-dim">
              <span className="flex items-center gap-2"><PlatformIcon platform="tiktok" className="size-3.5 text-mute" /> TikTok</span>
              <span className="flex items-center gap-2"><PlatformIcon platform="instagram" className="size-3.5 text-mute" /> Instagram Reels</span>
              <span className="h-3 w-px bg-line2" />
              <span>{h.free}</span>
              <span>{h.noMin}</span>
              <span>{h.perView}</span>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="hairline" />

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24">
        <SectionTitle>{t.common.howItWorks}</SectionTitle>
        <Stagger className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {h.steps.map(([n, t, b]) => (
            <StaggerItem key={n} className="flex flex-col gap-4 bg-black p-7">
              <span className="num text-[12px] text-dim">{n}</span>
              <span className="text-[18px] font-medium tracking-[-0.02em]">{t}</span>
              <span className="text-[13px] leading-relaxed text-mute">{b}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* WHY */}
      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pt-28 md:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <h2 className="text-[40px] font-medium leading-[1.02] tracking-[-0.04em]">
            {h.whyA}
            <br />
            <span className="font-serif italic font-normal text-mute">{h.whyB}</span>
          </h2>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-mute">
            {h.whySub}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {h.why.map(([t, b]) => (
              <div key={t} className="bg-s1 p-6">
                <div className="text-[15px] font-medium tracking-[-0.01em]">{t}</div>
                <div className="mt-2 text-[13px] leading-relaxed text-mute">{b}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CLIPPER CTA */}
      <section className="mx-auto max-w-[1240px] px-5 pt-28">
        <Reveal>
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-line px-8 py-16 text-center">
            <h3 className="max-w-2xl text-[36px] font-medium leading-[1.04] tracking-[-0.035em] md:text-[44px]">
              {h.ctaA}<span className="font-serif italic font-normal text-mute">{h.ctaB}</span>
            </h3>
            <p className="max-w-md text-[14px] leading-relaxed text-mute">{h.ctaSub}</p>
            <LinkButton href="/signup" size="lg">
              {t.common.getInvitedToCampaigns}
            </LinkButton>
          </div>
        </Reveal>
      </section>

      {/* BRANDS CTA */}
      <section id="brands" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-10">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#1a1a1a] via-[#0b0b0b] to-black px-8 py-16 md:px-14">
            <div className="relative z-[2] flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-dim">{h.brandsKicker}</span>
                <h3 className="mt-4 max-w-xl text-[36px] font-medium leading-[1.04] tracking-[-0.035em] md:text-[44px]">
                  {h.brandsA}<span className="font-serif italic font-normal">{h.brandsB}</span>
                </h3>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-mute">
                  {h.brandsSub}
                </p>
              </div>
              <LinkButton href="mailto:partnerships@lot3media.com" size="lg">
                {h.launch}
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
