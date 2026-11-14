import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.login };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/campaigns";
  return <LoginForm next={next} />;
}
