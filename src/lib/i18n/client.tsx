"use client";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dict, type Lang } from "./dict";
import { setLanguage } from "./actions";

const Ctx = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export const useT = () => dict(useContext(Ctx));

/** Save a language choice and re-render the page in it. */
export function useSetLang() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    set: (lang: Lang) =>
      start(async () => {
        await setLanguage(lang);
        router.refresh();
      }),
  };
}
