import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { timeAgoL } from "@/lib/i18n/dict";
import { NewTicketForm } from "@/components/support/new-ticket-form";
import { TicketStatusPill } from "@/components/support/status-pill";
import type { SupportTicket } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.support.nav };
}

export default async function SupportPage({ searchParams }: PageProps<"/support">) {
  const sp = await searchParams;
  const [{ supabase, profile }, { lang, t }] = await Promise.all([getSession(), getT()]);
  const S = t.support;
  const topic = typeof sp.topic === "string" ? sp.topic : "other";

  let campaigns: { id: string; title: string }[] = [];
  let recent: SupportTicket[] = [];
  if (profile) {
    const [c, r] = await Promise.all([
      supabase.from("campaigns").select("id,title").in("status", ["live", "paused", "complete"]).eq("is_test", false).order("created_at", { ascending: false }).limit(30),
      supabase.from("support_tickets").select("*").eq("user_id", profile.id).order("last_message_at", { ascending: false }).limit(4),
    ]);
    campaigns = c.data ?? [];
    recent = (r.data ?? []) as SupportTicket[];
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-14 md:pt-20">
      <div className="max-w-2xl">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-dim">{S.nav}</span>
        <h1 className="mt-4 text-[44px] font-medium leading-[0.98] tracking-[-0.045em] md:text-[64px]">
          {S.heroA}
          <span className="font-serif font-normal italic tracking-[-0.02em] text-mute">{S.heroB}</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mute">{S.heroSub}</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        <section className="rounded-3xl border border-line bg-s1 p-5 sm:p-7">
          <h2 className="mb-6 text-[18px] font-medium tracking-[-0.02em]">{S.formTitle}</h2>
          <NewTicketForm username={profile?.username} campaigns={campaigns} defaultCategory={topic} />
        </section>

        <div className="flex flex-col gap-6">
          {profile && recent.length > 0 && (
            <section className="rounded-3xl border border-line bg-s1 p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-medium">{S.yourConvos}</h2>
                <Link href="/dashboard/support" className="text-[12px] text-mute hover:text-ink">{S.viewAll}</Link>
              </div>
              <ul className="flex flex-col divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/dashboard/support/${r.number}`} className="flex items-center gap-3 py-3 text-[13px]">
                      {r.unread_user && <span className="size-2 shrink-0 rounded-full bg-ink" />}
                      <span className={r.unread_user ? "min-w-0 flex-1 truncate font-medium" : "min-w-0 flex-1 truncate text-mute"}>{r.subject}</span>
                      <span className="shrink-0 text-[11px] text-dim">{timeAgoL(r.last_message_at, lang)}</span>
                      <TicketStatusPill status={r.status} label={S.status[r.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="faq" className="scroll-mt-24">
            <h2 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-dim">{S.faqTitle}</h2>
            <div className="flex flex-col gap-2">
              {S.faq.map(([q, a]) => (
                <details key={q} className="group rounded-2xl border border-line bg-s1 px-5 open:bg-s2 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[14px] font-medium">
                    {q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line2 text-mute transition-transform duration-200 group-open:rotate-45">
                      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 text-[13px] leading-relaxed text-mute">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
