import Blog from "@/components/sections/blog";
import CTA from "@/components/sections/cta";
import FAQ from "@/components/sections/faq";
import Features from "@/components/sections/features";
import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import Hero from "@/components/sections/hero";
import HowItWorks from "@/components/sections/how-it-works";
import Logos from "@/components/sections/logos";
import Pricing from "@/components/sections/pricing";
import Problem from "@/components/sections/problem";
import Solution from "@/components/sections/solution";
import Testimonials from "@/components/sections/testimonials";
import TestimonialsCarousel from "@/components/sections/testimonials-carousel";
import { getIntl } from "@/lib/intl";
import { Locale } from "@/lib/definitions";

interface HomeProps {
  params: {
    lang: Locale;
  };
}

export default async function Home({ params: { lang } }: HomeProps) {
  const intl = await getIntl(lang);
  const messages = {
    ...Object.fromEntries(
      Object.entries(intl.messages).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : intl.formatMessage({ id: key })
      ])
    )
  };

  return (
    <main>
      <Header lang={lang}  />
      <Hero lang={lang} messages={messages} />
      <Logos lang={lang} />
      <Problem lang={lang}  />
      <Solution lang={lang} messages={messages} />
      <HowItWorks lang={lang} />
      <TestimonialsCarousel lang={lang}  />
      <Features lang={lang}  />
      <Testimonials lang={lang} messages={messages} />
      <Pricing lang={lang} messages={messages} />
      <FAQ lang={lang} />
      <Blog lang={lang} />
      <CTA lang={lang}  />
      <Footer lang={lang} />
    </main>
  );
}