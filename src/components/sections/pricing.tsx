"use client";

import Section from "@/components/section";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import useWindowSize from "@/lib/hooks/use-window-size";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaStar } from "react-icons/fa";
import { Locale } from "@/lib/definitions";

interface PricingSectionProps {
  lang: Locale;
  messages: Record<string, string>;
}

export default function PricingSection({ lang, messages }: PricingSectionProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const { isDesktop } = useWindowSize();

  const plans = [
    {
      name: messages["page.home.pricing.basic.name"],
      href: `/${lang}/pricing/basic`,
      price: "$19",
      period: "month",
      yearlyPrice: "$16",
      features: [
        "1 User",
        "5GB Storage",
        "Basic Support",
        "Limited API Access",
        "Standard Analytics"
      ],
      description: messages["page.home.pricing.basic.description"],
      buttonText: messages["page.home.pricing.button.subscribe"],
      isPopular: false,
    },
    {
      name: messages["page.home.pricing.pro.name"],
      href: `/${lang}/pricing/pro`,
      price: "$49",
      period: "month",
      yearlyPrice: "$40",
      features: [
        "5 Users",
        "50GB Storage",
        "Priority Support",
        "Full API Access",
        "Advanced Analytics"
      ],
      description: messages["page.home.pricing.pro.description"],
      buttonText: messages["page.home.pricing.button.subscribe"],
      isPopular: true,
    },
    {
      name: messages["page.home.pricing.enterprise.name"],
      href: `/${lang}/pricing/enterprise`,
      price: "$99",
      period: "month",
      yearlyPrice: "$82",
      features: [
        "Unlimited Users",
        "500GB Storage",
        "24/7 Premium Support",
        "Custom Integrations",
        "AI-Powered Insights"
      ],
      description: messages["page.home.pricing.enterprise.description"],
      buttonText: messages["page.home.pricing.button.subscribe"],
      isPopular: false,
    },
  ];

  return (
    <Section 
      title={messages["page.home.pricing.title"]}
      subtitle={messages["page.home.pricing.subtitle"]}
    >
      <div className="flex justify-center mb-10">
        <span className="mr-2 font-semibold">
          {messages["page.home.pricing.toggle.monthly"]}
        </span>
        <Label>
          <Switch 
            checked={!isMonthly} 
            onCheckedChange={() => setIsMonthly(!isMonthly)} 
          />
        </Label>
        <span className="ml-2 font-semibold">
          {messages["page.home.pricing.toggle.yearly"]}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: 0,
                    opacity: 1,
                    x: index === plans.length - 1 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === plans.length - 1 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl border-[1px] p-6 bg-background text-center lg:flex lg:flex-col lg:justify-center relative`,
              plan.isPopular ? "border-primary border-[2px]" : "border-border"
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                <FaStar className="text-white" />
                <span className="text-white ml-1 font-sans font-semibold">
                  {messages["page.home.pricing.popular"]}
                </span>
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-muted-foreground">
                {plan.name}
              </p>
              <p className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  {isMonthly ? plan.price : plan.yearlyPrice}
                </span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                  / {plan.period}
                </span>
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {messages[isMonthly ? "page.home.pricing.billing.monthly" : "page.home.pricing.billing.yearly"]}
              </p>
              <ul className="mt-5 gap-2 flex flex-col">
                {plan.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    <span>{messages[`page.home.pricing.${plan.name.toLowerCase()}.features.${idx}`] || feature}</span>
                  </li>
                ))}
              </ul>
              <hr className="w-full my-4" />
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                  "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-white",
                  plan.isPopular ? "bg-primary text-white" : "bg-white text-black"
                )}
              >
                {plan.buttonText}
              </Link>
              <p className="mt-6 text-xs leading-5 text-muted-foreground">
                {plan.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
