import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import { Locale } from "@/lib/definitions";
interface MarketingLayoutProps {
  children: React.ReactNode;
  params: { lang: Locale };
}

export default async function Layout({ children, params }: MarketingLayoutProps) {
  return (
    <>
      <Header lang={params.lang} />
      <main>{children}</main>
      <Footer lang={params.lang} />
    </>
  );
}
