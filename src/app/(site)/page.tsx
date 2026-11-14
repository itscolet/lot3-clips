import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { LinkButton, SectionTitle } from "@/components/ui/ui";
import { PlatformIcon } from "@/components/ui/icons";

export default async function Home() {
  // Members go straight to the campaigns they've been invited to.
  const { profile } = await getSession();
  if (profile) redirect("/campaigns");

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
              Invite-only · Music, film & brand campaigns
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-7 max-w-4xl text-[52px] font-medium leading-[0.98] tracking-[-0.045em] md:text-[88px]">
              Post clips.
              <br />
              <span className="font-serif italic font-normal tracking-[-0.02em] text-mute">Get paid</span> per view.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-mute">
              Sign up to get invited to paid clipping campaigns from artists, labels, studios and brands. Post on your own page
              and earn a set rate for every 1,000 verified views.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-9 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup" size="lg">
              Get invited to campaigns
            </LinkButton>
            <LinkButton href="/login" size="lg" variant="ghost">
              I have an account
            </LinkButton>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-14 flex flex-wrap items-center gap-6 text-[12px] text-dim">
              <span className="flex items-center gap-2"><PlatformIcon platform="tiktok" className="size-3.5 text-mute" /> TikTok</span>
              <span className="flex items-center gap-2"><PlatformIcon platform="instagram" className="size-3.5 text-mute" /> Instagram Reels</span>
              <span className="h-3 w-px bg-line2" />
              <span>Free to join</span>
              <span>No follower minimum on most campaigns</span>
              <span>Paid per verified view</span>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="hairline" />

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24">
        <SectionTitle>How it works</SectionTitle>
        <Stagger className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {[
            ["01", "Create your account", "Takes a minute. Tell us which TikTok or Instagram pages you post from."],
            ["02", "Verify your page", "Put a short code in your bio so we know the page is yours. We never ask for passwords."],
            ["03", "Get invited", "You'll see every campaign you're invited to, with the sound, the brief, the rate and the budget."],
            ["04", "Post and get paid", "Post the clip, paste the link. Views are tracked automatically and paid when the campaign wraps."],
          ].map(([n, t, b]) => (
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
            Built for clippers
            <br />
            <span className="font-serif italic font-normal text-mute">who actually post.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-mute">
            LOT3 Clips is run by LOT3 Media, a creator agency. Every campaign is briefed by our team and every clip is reviewed by a person.
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {[
              ["Clear rates", "Every campaign shows its rate per 1,000 views and how much budget is left before you post."],
              ["Your page, your audience", "You post on your own account. We never touch your login."],
              ["Fair tracking", "Views are re-checked automatically. Botted views aren't paid, so honest clippers get a bigger share."],
              ["Real payouts", "Get paid by PayPal, Zelle, Venmo, Cash App or Wise when the campaign wraps."],
            ].map(([t, b]) => (
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
              Campaigns go to clippers <span className="font-serif italic font-normal text-mute">on the list.</span>
            </h3>
            <p className="max-w-md text-[14px] leading-relaxed text-mute">Create your account and verify your page to get invited.</p>
            <LinkButton href="/signup" size="lg">
              Get invited to campaigns
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
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-dim">For artists, labels & brands</span>
                <h3 className="mt-4 max-w-xl text-[36px] font-medium leading-[1.04] tracking-[-0.035em] md:text-[44px]">
                  Turn a budget into <span className="font-serif italic font-normal">organic reach.</span>
                </h3>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-mute">
                  You set the budget and the rate per 1,000 views. We brief our clippers, review every post and send you a live report.
                </p>
              </div>
              <LinkButton href="mailto:partnerships@lot3media.com" size="lg">
                Launch a campaign
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
