import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { withAttachmentUrls } from "@/lib/support";
import { TicketView } from "@/components/support/ticket-view";
import type { SupportMessage, SupportTicket } from "@/lib/types";

export default async function ClipperTicketPage({ params, searchParams }: PageProps<"/dashboard/support/[number]">) {
  const [{ number }, sp, { supabase, profile }, { lang, t }] = await Promise.all([params, searchParams, requireUser(), getT()]);
  const n = Number(number);
  const { data: ticket } = Number.isFinite(n)
    ? await supabase.from("support_tickets").select("*").eq("number", n).eq("user_id", profile.id).maybeSingle<SupportTicket>()
    : { data: null };

  if (!ticket) {
    return (
      <div className="py-20 text-center">
        <p className="text-[15px] font-medium">{t.support.notFound}</p>
        <Link href="/dashboard/support" className="mt-4 inline-block text-[13px] text-mute underline underline-offset-4 hover:text-ink">{t.support.back}</Link>
      </div>
    );
  }
  const { data: msgs } = await supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at");
  const messages = await withAttachmentUrls(supabase, (msgs ?? []) as SupportMessage[]);
  if (ticket.unread_user) await supabase.rpc("support_user_action", { p_ticket: ticket.id, p_action: "read" });

  return (
    <TicketView
      lang={lang}
      ticket={ticket}
      messages={messages.map((m) => ({ id: m.id, author_role: m.author_role, body: m.body, created_at: m.created_at, attachment_url: m.attachment_url }))}
      canAttach
      backHref="/dashboard/support"
      justCreated={sp.new === "1"}
    />
  );
}
