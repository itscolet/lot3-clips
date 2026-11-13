"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = String(n ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
};

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  });
  if (error) return { error: error.message === "Invalid login credentials" ? "Wrong email or password." : error.message };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return { error: "Username: 3–24 characters, letters, numbers, _ or ." };
  if (!fd.get("agree")) return { error: "Please accept the terms." };
  const sb = await supabaseServer();
  const { data: taken } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "That username is taken." };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const next = safeNext(fd.get("next"));
  const { data, error } = await sb.auth.signUp({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
    options: { data: { username }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email to confirm your account, then log in." };
  redirect(next === "/dashboard" ? "/dashboard/accounts" : next);
}

export async function sendReset(_: AuthState, fd: FormData): Promise<AuthState> {
  const sb = await supabaseServer();
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const { error } = await sb.auth.resetPasswordForEmail(String(fd.get("email") ?? "").trim(), {
    redirectTo: `${origin}/auth/callback?next=/dashboard/settings`,
  });
  if (error) return { error: error.message };
  return { message: "If that email has an account, a reset link is on its way." };
}
