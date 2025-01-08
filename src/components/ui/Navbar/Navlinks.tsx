'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import Logo from '@/components/icons/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import s from './Navbar.module.css';
import { FaDiscord } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';

interface NavlinksProps {
  user?: any;
}

export default function Navlinks({ user }: NavlinksProps) {
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVariantsOpen, setIsVariantsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const menuButton = document.querySelector('[aria-label="Toggle menu"]');
      if (menuButton && menuButton.contains(event.target as Node)) {
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex justify-between items-center w-full max-w-6xl mx-auto px-1 ">
      <div className="flex items-center space-x-1">
        <Link href="/" className={`${s.logo} mr-2`} aria-label="Logo">
          <Image src="/extension_icon.svg" alt="Logo" width={32} height={32} />
        </Link>
        <nav className="hidden md:flex space-x-1">
          <NavLink href="/podcast">Generate Podcast!</NavLink>
          <NavLink href="/price">Pricing</NavLink>
          <NavLink href="/blog">Blog</NavLink>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`${s.link} text-sm md:text-base py-1 px-2 inline-flex items-center`}
            >
              Podcasts
              <svg className={`ml-1 h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 flex flex-col">
                <NavLink href="/generated-podcasts" className="font-bold text-primary-600 hover:text-primary-700">
                  Featured Podcasts
                </NavLink>
                <NavLink href="/educational-podcasts">Educational</NavLink>
                <NavLink href="/entertainment-podcasts">Entertainment</NavLink>
                <NavLink href="/podcast-ai">Podcast AI</NavLink>
                <NavLink href="/ai-audiobook-generator">Audiobook Generator</NavLink>
                <NavLink href="https://chatgpt.com/g/g-673b3c85d3c88191ad2198256b2ce90e-notebooklm-podcast-script-assistant">
                  AI Script Assistant
                </NavLink>

                <div className="border-t border-gray-200 ">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsVariantsOpen(!isVariantsOpen);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span>NotebookAI Alternatives</span>
                    <svg 
                      className={`ml-2 h-4 w-4 transition-transform ${isVariantsOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isVariantsOpen && (
                    <div className="pl-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                      <NavLink href="/podcast-ai-generator">Podcast AI Generator</NavLink>
                      <NavLink href="/notebook-ai-podcast">Notebook AI Podcast</NavLink>
                      <NavLink href="/noteboolm-podcast">NotebooLM Podcast</NavLink>
                      <NavLink href="/notebookln-podcast">NotebookLN Podcast</NavLink>
                      <NavLink href="/notebookls-podcast">NotebookLS Podcast</NavLink>
                      <NavLink href="/notebookllm-podcast">NotebookLLM Podcast</NavLink>
                      <NavLink href="/notebookklm-podcast">NotebookKLM Podcast</NavLink>
                      <NavLink href="/noteboklm-podcast">NotebokLM Podcast</NavLink>
                      <NavLink href="/notbooklm-podcast">NotbookLM Podcast</NavLink>
                      <NavLink href="/notbook-lm-podcast">Notbook LM Podcast</NavLink>
                      <NavLink href="/notebok-lm-podcast">Notebok LM Podcast</NavLink>
                      <NavLink href="/nitebook-lm-podcast">Nitebook LM Podcast</NavLink>
                      <NavLink href="/botebook-lm-podcast">Botebook LM Podcast</NavLink>
                      <NavLink href="/nootbook-lm-podcast">Nootbook LM Podcast</NavLink>
                      <NavLink href="/noebook-lm-podcast">Noebook LM Podcast</NavLink>
                      <NavLink href="/notebookai-podcast">NotebookAI Podcast</NavLink>
                      <NavLink href="/ai-podcasts">AI Podcasts</NavLink>
                      <NavLink href="/the-nootbook">The Nootbook</NavLink>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <NavLink href="/contact">Contact</NavLink>
        </nav>
      </div>
      <div className="hidden md:flex items-center space-x-4">
        <NavLink href="https://discord.gg/x6ZFSKB2pd" external>
          <FaDiscord className="inline-block mr-1" /> Join Discord for Updates!
        </NavLink>
        <NavLink href="/your-podcasts">My Podcasts</NavLink>
        {user ? (
          <>
            <NavLink href="/account">Account</NavLink>
            <form onSubmit={(e) => handleRequest(e, SignOut, router)}>
              <input type="hidden" name="pathName" value={usePathname()} />
              <button type="submit" className={s.link}>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <NavLink href="/signin">Sign in</NavLink>
        )}
      </div>
      <div className="md:hidden">
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      {isMenuOpen && (
        <div ref={menuRef} className="absolute top-full right-0 w-48 mx-2 bg-white shadow-md z-50 md:hidden rounded-lg max-h-[80vh] overflow-y-auto">
          <nav className="flex flex-col p-2">
            {user ? (
              <>
                <NavLink href="/account" onClick={toggleMenu}>Account</NavLink>
                <form onSubmit={(e) => handleRequest(e, SignOut, router)}>
                  <input type="hidden" name="pathName" value={usePathname()} />
                  <button type="submit" className={`${s.link} text-xs`} onClick={toggleMenu}>
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <NavLink href="/signin" onClick={toggleMenu}>Sign in</NavLink>
            )}
            <NavLink href="/podcast" onClick={toggleMenu}>Generate Podcast!</NavLink>
            <NavLink href="/price" onClick={toggleMenu}>Pricing</NavLink>
            <NavLink href="/your-podcasts" onClick={toggleMenu}>My Podcasts</NavLink>
            <NavLink href="/blog" onClick={toggleMenu}>Blog</NavLink>
            <NavLink href="/about" onClick={toggleMenu}>About</NavLink>            
            <NavLink href="/contact" onClick={toggleMenu}>Contact</NavLink>
            <NavLink href="https://discord.gg/x6ZFSKB2pd" onClick={toggleMenu} external>
              <FaDiscord className="inline-block mr-1" /> Join Discord for Updates!
            </NavLink>        
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="text-sm font-medium text-gray-500 px-4 py-2">Podcasts</div>
              <NavLink href="/generated-podcasts" onClick={toggleMenu}>Featured Podcasts</NavLink>
              <NavLink href="/educational-podcasts" onClick={toggleMenu}>Educational</NavLink>
              <NavLink href="/entertainment-podcasts" onClick={toggleMenu}>Entertainment</NavLink>    
              <NavLink href="/podcast-ai" onClick={toggleMenu}>Podcast AI</NavLink>
              <NavLink href="/ai-podcast" onClick={toggleMenu}>AI Podcast</NavLink>
              <NavLink href="/ai-audiobook-generator" onClick={toggleMenu}>AI Audiobook Generator</NavLink>
             
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  external?: boolean;
  className?: string;
}

function NavLink({ href, children, onClick, external, className }: NavLinkProps) {
  const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Link
      href={href}
      className={`${s.link} text-xs md:text-base py-1.5 md:py-1 px-3 md:px-2 w-full md:w-auto text-left transition-colors duration-200 hover:bg-gray-100 md:hover:bg-transparent ${className}`}
      onClick={onClick}
      {...linkProps}
    >
      {children}
    </Link>
  );
}
