import type { Metadata } from "next";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { TicketView } from "@/components/support/ticket-view";
import type { ThreadMessage } from "@/components/support/thread";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.support.nav, robots: { index: false, follow: false } };
}

type Thread = {
  ticket: { id: string; number: number; subject: string; category: string; status: string; created_at: string; unread_user: boolean };
  messages: ThreadMessage[];
} | null;

export default async function GuestTicketPage({ params, searchParams }: PageProps<"/support/t/[token]">) {
  const [{ token }, sp, { lang, t }] = await Promise.all([params, searchParams, getT()]);
  const sb = supabasePublic();
  const { data } = await sb.rpc("support_thread", { p_token: token });
  const thread = data as Thread;

  if (!thread) {
    return (
      <div className="mx-auto max-w-[560px] px-5 pt-24 text-center">
        <h1 className="text-[24px] font-medium tracking-[-0.03em]">{t.support.notFound}</h1>
        <Link href="/support" className="mt-6 inline-block text-[13px] text-mute underline underline-offset-4 hover:text-ink">
          {t.support.newMsg}
        </Link>
      </div>
    );
  }
  if (thread.ticket.unread_user) await sb.rpc("support_user_action", { p_ticket: thread.ticket.id, p_action: "read", p_token: token });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <div className="px-5 pt-10 md:pt-14">
      <TicketView
        lang={lang}
        ticket={thread.ticket}
        messages={thread.messages}
        token={token}
        canAttach={false}
        justCreated={sp.new === "1"}
        shareUrl={`${site}/support/t/${token}`}
      />
    </div>
  );
}
