import type { Metadata } from "next";
import { SignupForm } from "./form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/campaigns";
  return <SignupForm next={next} />;
}
