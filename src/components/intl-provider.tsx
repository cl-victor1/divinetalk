'use server'

import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface IntlProviderProps {
  children: (messages: Record<string, string>) => React.ReactNode;
  locale: Locale;
}



export async function IntlProvider({ children, locale }: IntlProviderProps) {
  const intl = await getIntl(locale);
  return children(intl.messages as Record<string, string>);
} 