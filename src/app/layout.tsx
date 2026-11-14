import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { getLang, getSavedLang } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";
import { LangProvider } from "@/lib/i18n/client";
import { LanguagePrompt } from "@/components/site/language-prompt";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = dict(await getLang());
  return {
    title: { default: t.meta.title, template: "%s · LOT3 Clips" },
    description: t.meta.description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  };
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, saved] = await Promise.all([getLang(), getSavedLang()]);
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black text-ink">
        <LangProvider lang={lang}>
          {children}
          <LanguagePrompt ask={!saved} />
        </LangProvider>
      </body>
    </html>
  );
}
