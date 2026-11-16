"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
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
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: t.authErr.badEmail };
  if (password.length < 8) return { error: t.authErr.weakPw };
  const emailOptIn = fd.get("email_opt_in") === "1";
  const smsOptIn = fd.get("sms_opt_in") === "1";
  const rawPhone = String(fd.get("phone") ?? "").replace(/[\s().-]/g, "");
  const phone = rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`) : "";
  if (smsOptIn && !/^\+[1-9]\d{7,14}$/.test(phone)) return { error: t.authErr.badPhone };
  const meta = {
    username,
    lang,
    terms_version: t.terms.version,
    email_opt_in: emailOptIn,
    sms_opt_in: smsOptIn,
    phone: smsOptIn ? phone : "",
  };
  const dest = next === "/campaigns" || next === "/dashboard" ? "/dashboard/accounts" : next;

  // We hand-pick who we invite, so skip email confirmation: create the account already confirmed, then sign in.
  const svc = supabaseService();
  if (svc) {
    const { error: createErr } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
    if (createErr) return { error: authError(createErr.message, t) };
    const { error: loginErr } = await sb.auth.signInWithPassword({ email, password });
    if (loginErr) return { error: authError(loginErr.message, t) };
    redirect(dest);
  }

  // Fallback if the service key isn't configured: normal signup (may require email confirmation).
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: meta, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: authError(error.message, t) };
  if (!data.session) return { message: t.authErr.confirm };
  redirect(dest);
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
