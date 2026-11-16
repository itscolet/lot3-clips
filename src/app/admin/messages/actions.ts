"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { announceCampaign, sendTest } from "@/lib/notify";

export type MsgState = { ok?: boolean; error?: string; message?: string } | null;

export async function announce(_: MsgState, fd: FormData): Promise<MsgState> {
  const { supabase, profile } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const testOnly = fd.get("test") === "1";
  const r = await announceCampaign(id, testOnly);
  if ("error" in r && r.error) return { error: r.error };
  if (!("emails" in r) || !r.emails) return { error: "Something went wrong." };
  await supabase.from("activity_log").insert({ actor_id: profile.id, action: testOnly ? "campaign.announce_test" : "campaign.announce", entity: "campaign", entity_id: id, meta: { emails: r.emails, sms: r.sms } });
  revalidatePath(`/admin/campaigns/${id}`);
  revalidatePath("/admin/messages");
  const parts: string[] = [];
  if (r.emailReady) parts.push(`${r.emails.sent} email${r.emails.sent === 1 ? "" : "s"} sent${r.emails.failed ? `, ${r.emails.failed} failed` : ""}`);
  else parts.push("Email not set up yet (logged as skipped)");
  if (r.sms) parts.push(r.smsReady ? `${r.sms} text${r.sms === 1 ? "" : "s"} sending in the background` : "Texts not set up yet");
  return { ok: true, message: `${testOnly ? "Test: " : ""}${parts.join(" · ")}.` };
}

export async function test(_: MsgState, fd: FormData): Promise<MsgState> {
  await requireAdmin();
  const r = await sendTest(fd.get("channel") === "sms" ? "sms" : "email");
  revalidatePath("/admin/messages");
  return r;
}
