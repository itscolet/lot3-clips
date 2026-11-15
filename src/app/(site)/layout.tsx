import { Footer, Header } from "@/components/site/header";
import { SupportLauncherSlot } from "@/components/support/launcher-slot";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="page-enter">{children}</main>
      <Footer />
      <SupportLauncherSlot />
    </>
  );
}
