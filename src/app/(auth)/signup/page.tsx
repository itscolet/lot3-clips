import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { SignupForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.signup };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/campaigns";
  return <SignupForm next={next} />;
}
