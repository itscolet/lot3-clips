import { getSession } from "@/lib/auth";
import { SupportLauncher } from "./launcher";

/** Server wrapper: passes who's signed in and how many unread replies they have. */
export async function SupportLauncherSlot() {
  const { supabase, profile } = await getSession();
  let unread = 0;
  if (profile) {
    const { count } = await supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("unread_user", true);
    unread = count ?? 0;
  }
  return <SupportLauncher username={profile?.username ?? null} unread={unread} />;
}
