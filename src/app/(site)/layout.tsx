import { Footer, Header } from "@/components/site/header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="page-enter">{children}</main>
      <Footer />
    </>
  );
}
