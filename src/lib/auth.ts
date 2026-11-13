import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";
import type { Profile } from "./types";

export const getSession = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (profile as Profile | null) ?? null };
});

export async function requireUser() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect("/login");
  return s as typeof s & { profile: Profile };
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect("/login?next=/admin");
  if (s.profile.role !== "admin") redirect("/dashboard");
  return s as typeof s & { profile: Profile };
}
