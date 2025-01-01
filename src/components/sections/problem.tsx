import BlurFade from "@/components/magicui/blur-fade";
import Section from "@/components/section";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Shield, Zap } from "lucide-react";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface ProblemProps {
  lang: Locale;
}

export default async function Problem({ lang }: ProblemProps) {
  const intl = await getIntl(lang);

  const problems = [
    {
      title: intl.formatMessage({ id: "page.home.problem.data.title" }),
      description: intl.formatMessage({ id: "page.home.problem.data.description" }),
      icon: Brain,
    },
    {
      title: intl.formatMessage({ id: "page.home.problem.speed.title" }),
      description: intl.formatMessage({ id: "page.home.problem.speed.description" }),
      icon: Zap,
    },
    {
      title: intl.formatMessage({ id: "page.home.problem.security.title" }),
      description: intl.formatMessage({ id: "page.home.problem.security.description" }),
      icon: Shield,
    },
  ];

  return (
    <Section
      title={intl.formatMessage({ id: "page.home.problem.title" })}
      subtitle={intl.formatMessage({ id: "page.home.problem.subtitle" })}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {problems.map((problem, index) => (
          <BlurFade key={index} delay={0.2 + index * 0.2} inView>
            <Card className="bg-background border-none shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <problem.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
    </Section>
  );
}
