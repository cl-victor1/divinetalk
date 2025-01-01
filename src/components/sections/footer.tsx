import { Icons } from "@/components/icons";
import { siteConfig } from "@/lib/config";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";
import { FaTwitter } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";
import { RiInstagramFill } from "react-icons/ri";

interface FooterProps {
  lang: Locale;
}

export default async function Footer({ lang }: FooterProps) {
  const intl = await getIntl(lang);

  const footerSections = [
    {
      title: intl.formatMessage({ id: "footer.product.title" }),
      links: [
        { href: `/${lang}/features`, text: intl.formatMessage({ id: "footer.product.features" }), icon: null },
        { href: `/${lang}/pricing`, text: intl.formatMessage({ id: "footer.product.pricing" }), icon: null },
        { href: `/${lang}/docs`, text: intl.formatMessage({ id: "footer.product.documentation" }), icon: null },
        { href: `/${lang}/api`, text: intl.formatMessage({ id: "footer.product.api" }), icon: null },
      ],
    },
    {
      title: intl.formatMessage({ id: "footer.company.title" }),
      links: [
        { href: `/${lang}/about`, text: intl.formatMessage({ id: "footer.company.about" }), icon: null },
        { href: `/${lang}/careers`, text: intl.formatMessage({ id: "footer.company.careers" }), icon: null },
        { href: `/${lang}/blog`, text: intl.formatMessage({ id: "footer.company.blog" }), icon: null },
        { href: `/${lang}/press`, text: intl.formatMessage({ id: "footer.company.press" }), icon: null },
        { href: `/${lang}/partners`, text: intl.formatMessage({ id: "footer.company.partners" }), icon: null },
      ],
    },
    {
      title: intl.formatMessage({ id: "footer.resources.title" }),
      links: [
        { href: `/${lang}/community`, text: intl.formatMessage({ id: "footer.resources.community" }), icon: null },
        { href: `/${lang}/contact`, text: intl.formatMessage({ id: "footer.resources.contact" }), icon: null },
        { href: `/${lang}/support`, text: intl.formatMessage({ id: "footer.resources.support" }), icon: null },
        { href: `/${lang}/status`, text: intl.formatMessage({ id: "footer.resources.status" }), icon: null },
      ],
    },
    {
      title: intl.formatMessage({ id: "footer.social.title" }),
      links: [
        {
          href: siteConfig.links.twitter,
          text: intl.formatMessage({ id: "footer.social.twitter" }),
          icon: <FaTwitter className="h-4 w-4" />,
        },
        {
          href: siteConfig.links.instagram,
          text: intl.formatMessage({ id: "footer.social.instagram" }),
          icon: <RiInstagramFill className="h-4 w-4" />,
        },
        {
          href: siteConfig.links.youtube,
          text: intl.formatMessage({ id: "footer.social.youtube" }),
          icon: <FaYoutube className="h-4 w-4" />,
        },
      ],
    },
  ];

  return (
    <footer>
      <div className="max-w-6xl mx-auto py-16 sm:px-10 px-5 pb-0">
        <Link
          href={`/${lang}`}
          title={siteConfig.name}
          className="relative mr-6 flex items-center space-x-2"
        >
          <Icons.logo className="w-auto h-[40px]" />
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 sm:grid-cols-2 mt-8">
          {footerSections.map((section, index) => (
            <div key={index} className="mb-5">
              <h2 className="font-semibold">{section.title}</h2>
              <ul>
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex} className="my-2">
                    <Link
                      href={link.href}
                      className="group inline-flex cursor-pointer items-center justify-start gap-1 text-muted-foreground duration-200 hover:text-foreground hover:opacity-90"
                    >
                      {link.icon && link.icon}
                      {link.text}
                      <ChevronRight className="h-4 w-4 translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto border-t py-2 grid md:grid-cols-2 h-full justify-between w-full grid-cols-1 gap-1">
          <span className="text-sm tracking-tight text-foreground">
            {intl.formatMessage(
              { id: "footer.copyright" },
              {
                year: new Date().getFullYear(),
                name: siteConfig.name,
                description: siteConfig.description
              }
            )}
          </span>
          <ul className="flex justify-start md:justify-end text-sm tracking-tight text-foreground">
            <li className="mr-3 md:mx-4">
              <Link href={`/${lang}/privacy`} target="_blank" rel="noopener noreferrer">
                {intl.formatMessage({ id: "footer.legal.privacy" })}
              </Link>
            </li>
            <li className="mr-3 md:mx-4">
              <Link href={`/${lang}/terms`} target="_blank" rel="noopener noreferrer">
                {intl.formatMessage({ id: "footer.legal.terms" })}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
