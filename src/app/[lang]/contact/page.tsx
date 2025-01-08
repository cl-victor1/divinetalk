import { Metadata } from 'next';
import ContactForm from '@/components/ui/ContactForm';
import Link from 'next/link';
import { getURL } from '@/utils/helpers';
import { Locale } from '@/lib/definitions';
import { getIntl } from '@/lib/intl';

// Metadata will need to be generated dynamically for each language
export async function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Promise<Metadata> {
  const intl = await getIntl(lang);
  
  return {
    metadataBase: new URL(getURL()),
    title: intl.formatMessage({ id: 'page.contact.title' }),
    description: intl.formatMessage({ id: 'page.contact.description' }),
    alternates: {
      canonical: `${getURL()}/contact`,
    },
  };
}

interface ContactPageProps {
  params: {
    lang: Locale;
  };
}

export default async function ContactPage({ params: { lang } }: ContactPageProps) {
  const intl = await getIntl(lang);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl text-black font-bold mb-6">
        {intl.formatMessage({ id: 'page.contact.title' })}
      </h1>
      <p className="mb-8 text-black">
        {intl.formatMessage({ id: 'page.contact.description' })}
      </p>
      <ContactForm />
      <p className="mt-8">
        <Link href={`/${lang}`} className="text-blue-600 hover:underline">
          {intl.formatMessage({ id: 'common.returnHome' })}
        </Link>
      </p>
    </div>
  );
}
