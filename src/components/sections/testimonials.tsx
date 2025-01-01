"use client";

import Marquee from "@/components/magicui/marquee";
import Section from "@/components/section";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";
import { Locale } from "@/lib/definitions";

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={cn(
        "bg-primary/20 p-1 py-0.5 font-bold text-primary dark:bg-primary/20 dark:text-primary",
        className
      )}
    >
      {children}
    </span>
  );
};

export interface TestimonialCardProps {
  name: string;
  role: string;
  img?: string;
  description: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const TestimonialCard = ({
  description,
  name,
  img,
  role,
  className,
  ...props
}: TestimonialCardProps) => (
  <div
    className={cn(
      "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4",
      "border border-neutral-200 bg-white",
      "dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className
    )}
    {...props}
  >
    <div className="select-none text-sm font-normal text-neutral-700 dark:text-neutral-400">
      {description}
      <div className="flex flex-row py-1">
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
      </div>
    </div>

    <div className="flex w-full select-none items-center justify-start gap-5">
      <Image
        width={40}
        height={40}
        src={img || ""}
        alt={name}
        className="h-10 w-10 rounded-full ring-1 ring-border ring-offset-4"
      />

      <div>
        <p className="font-medium text-neutral-500">{name}</p>
        <p className="text-xs font-normal text-neutral-400">{role}</p>
      </div>
    </div>
  </div>
);

interface TestimonialsProps {
  lang: Locale;
  messages: Record<string, string>;
}

export default function Testimonials({ lang, messages }: TestimonialsProps) {
  const testimonials = [
    {
      name: messages["page.home.testimonials.alex.name"],
      role: messages["page.home.testimonials.alex.role"],
      img: "https://randomuser.me/api/portraits/men/91.jpg",
      description: messages["page.home.testimonials.alex.description"],
    },
    {
      name: messages["page.home.testimonials.samantha.name"],
      role: messages["page.home.testimonials.samantha.role"],
      img: "https://randomuser.me/api/portraits/women/12.jpg",
      description: messages["page.home.testimonials.samantha.description"],
    },
    {
      name: messages["page.home.testimonials.raj.name"],
      role: messages["page.home.testimonials.raj.role"],
      img: "https://randomuser.me/api/portraits/men/45.jpg",
      description: messages["page.home.testimonials.raj.description"],
    }
  ];

  return (
    <Section 
      title={messages["page.home.testimonials.title"]}
      subtitle={messages["page.home.testimonials.subtitle"]}
    >
      <Marquee
        pauseOnHover
        className="py-8"
        reverse
      >
        {testimonials.map((testimonial, idx) => (
          <div key={idx} className="mx-2 w-[400px]">
            <TestimonialCard {...testimonial} />
          </div>
        ))}
      </Marquee>
    </Section>
  );
}
