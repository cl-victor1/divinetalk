import { Metadata } from 'next';
import ContactForm from '@/components/ui/ContactForm';
import Link from 'next/link';
import { getURL } from '@/utils/helpers';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: 'Contact Notebooklm Podcast - Get in Touch with Our AI Podcast Team',
  description: 'Reach out to Notebooklm Podcast, your AI-powered personalized podcast generator. Have questions, feedback, or partnership inquiries? Our team is ready to assist. Connect with us today and explore how our innovative technology can transform your content into engaging audio experiences.',
  alternates: {
    canonical: `${getURL()}/contact`,
  },
};
export default function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl text-black font-bold mb-6">Tell us what you want</h1>
      <p className="mb-8 text-black">
      What kind of religious conversations would you like to have? Let us know which religious figures or topics you'd like to explore in your dialogues.
      </p>
      <ContactForm />
      <p className="mt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Home
        </Link>
      </p>
    </div>
  );
}

export const runtime = 'edge';