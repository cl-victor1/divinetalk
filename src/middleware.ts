import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { i18n } from "./../i18n-config";

function getLocale(request: NextRequest): string | undefined {
  // Negotiator expects plain object so we need to transform headers
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  // @ts-ignore locales are readonly
  const locales: string[] = i18n.locales;

  // Use negotiator and intl-localematcher to get best locale
  let languages = new Negotiator({ headers: negotiatorHeaders }).languages(locales);

  const locale = matchLocale(languages, locales, i18n.defaultLocale);

  return locale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Add check for static file extensions
  const isStaticFile = /\.(jpg|jpeg|png|gif|ico|css|js|xml|svg)$/i.test(pathname);
  if (isStaticFile) {
    return;
  }

  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    const sanitizedPathname = pathname.startsWith("/") ? pathname.substring(1) : pathname;
    
    // Redirect to /{locale} instead of /{locale}/home
    return NextResponse.redirect(new URL(`/${locale}/${sanitizedPathname}`, request.url));
  }

  const pathnameIsMissingPage = pathname.split("/").slice(2).join("/") === "";

  // Remove the redirect to fallback page since we want the root path
  if (pathnameIsMissingPage) {
    return;
  }
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ["/((?!api|_next/static|_next/image|images|public|favicon.ico).*)"],
};
