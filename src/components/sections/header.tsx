"use client";

import Drawer from "@/components/drawer";
import { Icons } from "@/components/icons";
import Menu from "@/components/menu";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Locale } from "@/lib/definitions";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

// Add language configuration
const LANGUAGES = {
  en: { label: 'English', flag: '🇺🇸' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  fr: { label: 'Français', flag: '🇫🇷' },
  es: { label: 'Español', flag: '🇪🇸' },
  "zh-TW": { label: '繁體中文', flag: '🇹🇼' },
  pt: { label: 'Português', flag: '🇧🇷' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  ru: { label: 'Русский', flag: '🇷🇺' },
  ko: { label: '한국어', flag: '🇰🇷' },
} as const;

interface HeaderProps {
  lang: Locale;
}

export default function Header({ lang }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [addBorder, setAddBorder] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setAddBorder(true);
      } else {
        setAddBorder(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handleLanguageChange(newLang: Locale) {
    const newPath = pathname.replace(`/${lang}`, `/${newLang}`);
    router.push(newPath);
  }

  return (
    <header
      className={
        "relative sticky top-0 z-50 py-2 bg-background/60 backdrop-blur"
      }
    >
      <div className="flex justify-between items-center container">
        <Link
          href={`/${lang}`}
          title="brand-logo"
          className="relative mr-6 flex items-center space-x-2"
        >
          <Icons.logo className="w-auto h-[40px]" />
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>

        <div className="hidden lg:block">
          <div className="flex items-center ">
            <nav className="mr-10">
              <Menu />
            </nav>

            <div className="gap-2 flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-[130px] justify-start gap-2"
                  >
                    <span>{LANGUAGES[lang].flag}</span>
                    <span>{LANGUAGES[lang].label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[130px]">
                  {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
                    <DropdownMenuItem
                      key={code}
                      onClick={() => handleLanguageChange(code as Locale)}
                      className="gap-2 cursor-pointer"
                      disabled={code === lang}
                    >
                      <span>{flag}</span>
                      <span>{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                href={`/${lang}/login`}
                className={buttonVariants({ variant: "outline" })}
              >
                Login
              </Link>
              <Link
                href={`/${lang}/signup`}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full sm:w-auto text-background flex gap-2"
                )}
              >
                <Icons.logo className="h-6 w-6" />
                Get Started for Free
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-2 cursor-pointer block lg:hidden">
          <Drawer />
        </div>
      </div>
      <hr
        className={cn(
          "absolute w-full bottom-0 transition-opacity duration-300 ease-in-out",
          addBorder ? "opacity-100" : "opacity-0"
        )}
      />
    </header>
  );
}
