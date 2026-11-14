"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { authError } from "@/lib/i18n/dict";

export type AuthState = { error?: string; message?: string } | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = String(n ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/campaigns";
};

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const [sb, { t }] = await Promise.all([supabaseServer(), getT()]);
  const { error } = await sb.auth.signInWithPassword({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  });
  if (error) return { error: authError(error.message, t) };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const { lang, t } = await getT();
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return { error: t.authErr.username };
  if (!fd.get("agree")) return { error: t.authErr.terms };
  const sb = await supabaseServer();
  const { data: taken } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: t.authErr.taken };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const next = safeNext(fd.get("next"));
  const { data, error } = await sb.auth.signUp({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
    options: { data: { username, lang }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: authError(error.message, t) };
  if (!data.session) return { message: t.authErr.confirm };
  redirect(next === "/campaigns" || next === "/dashboard" ? "/dashboard/accounts" : next);
}

export async function sendReset(_: AuthState, fd: FormData): Promise<AuthState> {
  const [sb, { t }] = await Promise.all([supabaseServer(), getT()]);
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const { error } = await sb.auth.resetPasswordForEmail(String(fd.get("email") ?? "").trim(), {
    redirectTo: `${origin}/auth/callback?next=/dashboard/settings`,
  });
  if (error) return { error: authError(error.message, t) };
  return { message: t.authErr.resetSent };
}
