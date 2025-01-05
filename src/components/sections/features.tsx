import Features from "@/components/features-horizontal";
import Section from "@/components/section";
import { BarChart3, Brain, FileText, LineChart } from "lucide-react";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface FeaturesProps {
  lang: Locale;
}

export default async function FeaturesSection({ lang }: FeaturesProps) {
  const intl = await getIntl(lang);

  const data = [
    {
      id: 1,
      title: intl.formatMessage({ id: "page.home.features.dashboard.title" }),
      content: intl.formatMessage({ id: "page.home.features.dashboard.content" }),
      image: "/people.png",
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
    },
    {
      id: 2,
      title: intl.formatMessage({ id: "page.home.features.nlp.title" }),
      content: intl.formatMessage({ id: "page.home.features.nlp.content" }),
      image: "/bible.png",
      icon: <Brain className="h-6 w-6 text-primary" />,
    },
    {
      id: 3,
      title: intl.formatMessage({ id: "page.home.features.analytics.title" }),
      content: intl.formatMessage({ id: "page.home.features.analytics.content" }),
      image: "/confess.png",
      icon: <LineChart className="h-6 w-6 text-primary" />,
    },
    {
      id: 4,
      title: intl.formatMessage({ id: "page.home.features.reporting.title" }),
      content: intl.formatMessage({ id: "page.home.features.reporting.content" }),
      image: "/jesus4.png",
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <Section 
      title={intl.formatMessage({ id: "page.home.features.title" })}
      subtitle={intl.formatMessage({ id: "page.home.features.subtitle" })}
    >
      <Features collapseDelay={5000} linePosition="bottom" data={data} />
    </Section>
  );
}
