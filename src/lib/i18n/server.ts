import { cache } from "react";
import { cookies, headers } from "next/headers";
import { dict, isLang, LANG_COOKIE, type Lang } from "./dict";

/** The saved language, or null if the visitor hasn't picked one yet. */
export const getSavedLang = cache(async (): Promise<Lang | null> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : null;
});

/** Saved language, else a best guess from the browser (Spanish browsers start in Spanish). */
export const getLang = cache(async (): Promise<Lang> => {
  const saved = await getSavedLang();
  if (saved) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*es\b/i.test(accept) ? "es" : "en";
});

export async function getT() {
  const lang = await getLang();
  return { lang, t: dict(lang) };
}
