
import Features from "@/components/features-vertical";
import Section from "@/components/section";
import { Sparkles, Upload, Zap } from "lucide-react";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface HowItWorksProps {
  lang: Locale;
}

export default async function HowItWorks({ lang }: HowItWorksProps) {
  const intl = await getIntl(lang);

  const data = [
    {
      id: 1,
      title: intl.formatMessage({ id: "page.home.how-it-works.step1.title" }),
      content: intl.formatMessage({ id: "page.home.how-it-works.step1.content" }),
      image: "/jesusetal.png",
      icon: <Upload className="w-6 h-6 text-primary" />,
    },
    {
      id: 2,
      title: intl.formatMessage({ id: "page.home.how-it-works.step2.title" }),
      content: intl.formatMessage({ id: "page.home.how-it-works.step2.content" }),
      image: "/jesus2.png",
      icon: <Zap className="w-6 h-6 text-primary" />,
    },
    {
      id: 3,
      title: intl.formatMessage({ id: "page.home.how-it-works.step3.title" }),
      content: intl.formatMessage({ id: "page.home.how-it-works.step3.content" }),
      image: "/cross2.png",
      icon: <Sparkles className="w-6 h-6 text-primary" />,
    },
  ];

  return (
    <Section 
      title={intl.formatMessage({ id: "page.home.how-it-works.title" })}
      subtitle={intl.formatMessage({ id: "page.home.how-it-works.subtitle" })}
    >
      <Features data={data} />
    </Section>
  );
}
