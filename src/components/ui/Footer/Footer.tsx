import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/icons/Logo';
import GitHub from '@/components/icons/GitHub';
import { 
  Discord, 
  Spotify, 
  Twitter, 
  Substack, 
  Youtube 
} from '@/components/icons/Social';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-[1920px] px-6 text-gray-800 ">
      <div className="grid grid-cols-1 gap-8 py-12 transition-colors duration-150 border-b lg:grid-cols-12 border-zinc-600">
        <div className="col-span-1 lg:col-span-3">
          <Link
            href="/"
            className="flex items-center flex-initial font-bold md:mr-24"
          >
            <span className="mr-2">
              <Image src="/extension_icon.svg" alt="Logo" width={45} height={45} />
            </span>
            <span>NotebookLM Podcast</span>
          </Link>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col space-y-0.5 sm:space-y-2">
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Home
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/generated-podcasts">Featured Podcasts</Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/about"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                About
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/blog"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Blog
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="https://climate.stripe.com/9OvxoR"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Climate Action
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/educational-podcasts">Educational</Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/nootbook-lm">Nootbook LM</Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/entertainment-podcasts">Entertainment</Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/NotebookAI-podcast">NotebookAI Podcast</Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/podcast-ai-generator">Podcast AI Generator</Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link href="/how-to-create-podcast">How to Create a Podcast</Link>
            </li>
          </ul>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col space-y-0.5 sm:space-y-2">
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/podcast-ai"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Podcast AI
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/ai-podcast"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                AI Podcast
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/ai-podcast-generator"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                AI Podcast Generator
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/ai-audiobook-generator"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                AI Audiobook Generator
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/notebookai"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                NotebookAI
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/notebook-lm"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Notebook Podcast
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="https://chatgpt.com/g/g-673b3c85d3c88191ad2198256b2ce90e-notebooklm-podcast-script-assistant"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                AI Script Assistant
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/notebook-ai-podcast"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Notebook AI Podcast
              </Link>
            </li>         
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/podcast-software"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Podcast Software
              </Link>
            </li>
            <li className="py-1 sm:py-3 md:py-0 md:pb-4">
              <Link
                href="/turn-notes-podcast"
                className="transition duration-150 ease-in-out hover:text-gray-1000"
              >
                Turn Notes into Podcast
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-1 lg:col-span-4">
          <div className="flex flex-col gap-3 md:gap-4 md:items-end">
            <a href="https://theresanaiforthat.com/ai/notebooklm-podcast/?ref=featured&v=2192187" target="_blank" rel="nofollow">
              <img width="300" src="https://media.theresanaiforthat.com/featured-on-taaft.png?width=600" alt="Featured on TAAFT" />
            </a>
            {/* <a 
              href="https://www.toolify.ai/tool/notebooklm-podcast/?ref=embed" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <Image 
                src="https://cdn.toolify.ai/featured_light.svg"
                width={250}
                height={60}
                alt="NotebookAI Podcast: Transform PDFs or any text into engaging audio content"
                priority
              />
            </a> */}
            <ul className="flex flex-col space-y-0.5 sm:space-y-2 mt-2 sm:mt-4">
              <li className="py-1 sm:py-3 md:py-0 md:pb-4">
                <p className="font-bold   transition duration-150 ease-in-out hover:text-gray-1000">
                  LEGAL
                </p>
              </li>
              <li className="py-1 sm:py-3 md:py-0 md:pb-4">
                <Link
                  href="/privacy"
                  className="  transition duration-150 ease-in-out hover:text-gray-1000"
                >
                  Privacy Policy
                </Link>
              </li>
              <li className="py-1 sm:py-3 md:py-0 md:pb-4">
                <Link
                  href="/terms"
                  className="  transition duration-150 ease-in-out hover:text-gray-1000"
                >
                  Terms of Use
                </Link>
              </li>
              <li className="py-1 sm:py-3 md:py-0 md:pb-4">
                <Link
                  href="/refund"
                  className="  transition duration-150 ease-in-out hover:text-gray-1000"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between py-6 space-y-2 md:flex-row">
        <div>
          <span>
            &copy; {new Date().getFullYear()} NotebookLM Podcast. All rights reserved.
          </span>
        </div>
      </div>  
            
      <div className="mx-auto max-w-[1920px] px-6">
        <div className="grid grid-cols-1 gap-2 py-4 text-sm text-black">
          <ul className="flex flex-wrap justify-center gap-3 auto-cols-auto">
            <li>
              <a 
                href="https://discord.com/invite/x6ZFSKB2pd" 
                title="Join Discord for Updates" 
                target="_blank" 
                rel="noopener noreferrer nofollow" 
                className="hover:text-gray-300 inline-flex items-center gap-2"
              >
                <Discord className="w-4 h-4" />
                <span>Join Discord for Updates</span>
              </a>
            </li>
            <li>
              <a 
                href="https://open.spotify.com/show/07BlbjGCoyLFF9W3FCQyxb" 
                title="NotebookAI Podcast Spotify" 
                className="hover:text-gray-300 inline-flex items-center gap-2" 
                rel="nofollow"
              >
                <Spotify className="w-4 h-4" />
                <span>Spotify</span>
              </a>
            </li>
            <li>
              <a 
                href="https://x.com/Notebookai_pod" 
                title="Notebookai Podcast X" 
                target="_blank" 
                rel="noopener noreferrer nofollow" 
                className="hover:text-gray-300 inline-flex items-center gap-2"
              >
                <Twitter className="w-4 h-4" />
                <span>Twitter</span>
              </a>
            </li>
            <li>
              <a 
                href="https://open.spotify.com/show/07BlbjGCoyLFF9W3FCQyxb?si=jQZsKWtESw2pFOizABi8vg" 
                title="NotebookAI Podcast Substack" 
                target="_blank" 
                rel="noopener noreferrer nofollow" 
                className="hover:text-gray-300 inline-flex items-center gap-2"
              >
                <Substack className="w-4 h-4" />
                <span>Substack</span>
              </a>
            </li>
            <li>
              <a 
                href="https://www.youtube.com/@NotebookaiPodcast" 
                title="NotebookaiPodcast youtube channel" 
                className="hover:text-gray-300 inline-flex items-center gap-2" 
                rel="nofollow"
              >
                <Youtube className="w-4 h-4" />
                <span>Youtube</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
