import BlurFade from "@/components/magicui/blur-fade";
import Section from "@/components/section";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import { MdOutlineFormatQuote } from "react-icons/md";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

const companies = [
  "Google",
  "Microsoft",
  "Amazon",
  "Netflix",
  "YouTube",
  "Instagram",
  "Uber",
  "Spotify",
];

interface TestimonialsCarouselProps {
  lang: Locale;
}

export default async function TestimonialsCarousel({ lang }: TestimonialsCarouselProps) {
  const intl = await getIntl(lang);

  const testimonials = [
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.1.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.1.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.1.role" }),
    },
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.2.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.2.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.2.role" }),
    },
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.3.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.3.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.3.role" }),
    },
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.4.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.4.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.4.role" }),
    },
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.5.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.5.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.5.role" }),
    },
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.6.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.6.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.6.role" }),
    },
    {
      text: intl.formatMessage({ id: "page.home.testimonials-carousel.7.text" }),
      name: intl.formatMessage({ id: "page.home.testimonials-carousel.7.name" }),
      role: intl.formatMessage({ id: "page.home.testimonials-carousel.7.role" }),
    },
  ];

  return (
    <Section
      title={intl.formatMessage({ id: "page.home.testimonials-carousel.title" })}
      subtitle={intl.formatMessage({ id: "page.home.testimonials-carousel.subtitle" })}
    >
      <Carousel>
        <div className="max-w-2xl mx-auto relative">
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index}>
                <div className="p-2 pb-5">
                  <div className="text-center">
                    <MdOutlineFormatQuote className="text-4xl text-themeDarkGray my-4 mx-auto" />
                    <BlurFade delay={0.25} inView>
                      <h4 className="text-1xl font-semibold max-w-lg mx-auto px-10">
                        {testimonial.text}
                      </h4>
                    </BlurFade>
                    <BlurFade delay={0.25 * 2} inView>
                      <div className="mt-8">
                        <Image
                          width={0}
                          height={40}
                          key={index}
                          src={`https://cdn.magicui.design/companies/${
                            companies[index % companies.length]
                          }.svg`}
                          alt={`${companies[index % companies.length]} Logo`}
                          className="mx-auto w-auto h-[40px] grayscale opacity-30"
                        />
                      </div>
                    </BlurFade>
                    <div className="">
                      <BlurFade delay={0.25 * 3} inView>
                        <h4 className="text-1xl font-semibold my-2">
                          {testimonial.name}
                        </h4>
                      </BlurFade>
                    </div>
                    <BlurFade delay={0.25 * 4} inView>
                      <div className=" mb-3">
                        <span className="text-sm text-themeDarkGray">
                          {testimonial.role}
                        </span>
                      </div>
                    </BlurFade>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-2/12 bg-gradient-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full  w-2/12 bg-gradient-to-l from-background"></div>
        </div>
        <div className="md:block hidden">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </Carousel>
    </Section>
  );
}
