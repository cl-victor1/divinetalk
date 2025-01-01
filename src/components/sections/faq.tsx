import Section from "@/components/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { siteConfig } from "@/lib/config";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface FAQProps {
  lang: Locale;
}

export default async function FAQ({ lang }: FAQProps) {
  const intl = await getIntl(lang);

  const faqs = [
    {
      question: intl.formatMessage({ id: "page.home.faq.q1" }),
      answer: intl.formatMessage({ id: "page.home.faq.a1" }),
    },
    {
      question: intl.formatMessage({ id: "page.home.faq.q2" }),
      answer: intl.formatMessage({ id: "page.home.faq.a2" }),
    },
    {
      question: intl.formatMessage({ id: "page.home.faq.q3" }),
      answer: intl.formatMessage({ id: "page.home.faq.a3" }),
    },
    {
      question: intl.formatMessage({ id: "page.home.faq.q4" }),
      answer: intl.formatMessage({ id: "page.home.faq.a4" }),
    },
    {
      question: intl.formatMessage({ id: "page.home.faq.q5" }),
      answer: intl.formatMessage({ id: "page.home.faq.a5" }),
    },
  ];

  return (
    <Section 
      title={intl.formatMessage({ id: "page.home.faq.title" })} 
      subtitle={intl.formatMessage({ id: "page.home.faq.subtitle" })}
    >
      <div className="mx-auto my-12 md:max-w-[800px]">
        <Accordion
          type="single"
          collapsible
          className="flex w-full flex-col items-center justify-center space-y-2"
        >
          {faqs.map((faq, idx) => (
            <AccordionItem
              key={idx}
              value={faq.question}
              className="w-full border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="px-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <h4 className="mb-12 text-center text-sm font-medium tracking-tight text-foreground/80">
        {intl.formatMessage(
          { id: "page.home.faq.contact" },
          { email: siteConfig.links.email }
        )}{" "}
        <a href={`mailto:${siteConfig.links.email}`} className="underline">
          {siteConfig.links.email}
        </a>
      </h4>
    </Section>
  );
}
