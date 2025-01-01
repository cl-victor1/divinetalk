import { Icons } from "@/components/icons";
import Section from "@/components/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface CtaSectionProps {
  lang: Locale;
}

export default async function CtaSection({ lang }: CtaSectionProps) {
  const intl = await getIntl(lang);

  return (
    <Section
      id="cta"
      title={intl.formatMessage({ id: "page.home.cta.title" })}
      subtitle={intl.formatMessage({ id: "page.home.cta.subtitle" })}
      className="bg-primary/10 rounded-xl py-16"
    >
      <div className="flex flex-col w-full sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
        <Link
          href={`/${lang}/signup`}
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full sm:w-auto text-background flex gap-2"
          )}
        >
          <Icons.logo className="h-6 w-6" />
          {intl.formatMessage({ id: "page.home.cta.button" })}
        </Link>
      </div>
    </Section>
  );
}
