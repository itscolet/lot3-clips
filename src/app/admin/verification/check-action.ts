"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { checkBioCode, apifyConfigured } from "@/lib/apify";

export async function autoCheckBio(id: string): Promise<string> {
  const { supabase } = await requireAdmin();
  const { data: a } = await supabase.from("social_accounts").select("*").eq("id", id).single();
  if (!a) return "Account not found.";
  if (!apifyConfigured()) return "APIFY_TOKEN not set — verify manually.";
  const r = await checkBioCode(a.platform, a.handle, a.verify_code);
  if (r.status === "found") {
    await supabase.from("social_accounts").update({ verified_at: new Date().toISOString(), followers: r.followers ?? a.followers }).eq("id", id);
    revalidatePath("/admin", "layout");
    return "Code found — verified.";
  }
  if (r.status === "not_found") return "Code not in bio yet.";
  return "Couldn't reach the profile. Try again or verify manually.";
}
