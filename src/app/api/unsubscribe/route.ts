import { NextResponse, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase/server";

/** One-click unsubscribe (List-Unsubscribe-Post) and the link in every campaign email. */
async function unsubscribe(token: string | null) {
  if (!token) return false;
  const { data } = await supabasePublic().rpc("unsubscribe_email", { p_token: token });
  return data === true;
}

export async function POST(req: NextRequest) {
  const ok = await unsubscribe(req.nextUrl.searchParams.get("t"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function GET(req: NextRequest) {
  const ok = await unsubscribe(req.nextUrl.searchParams.get("t"));
  return NextResponse.redirect(new URL(`/unsubscribe?${ok ? "done=1" : "invalid=1"}`, req.nextUrl.origin));
}
