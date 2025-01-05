import { getBlogPosts } from "@/lib/blog";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

const languages = ['en', 'zh', 'es', 'fr', 'de', 'it', 'pt'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getBlogPosts();
  const headersList = headers();
  
  // Improved domain and protocol detection
  const host = headersList.get("host") || process.env.NEXT_PUBLIC_DOMAIN || "yourdomain.com";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  // Create base URLs for each language
  const baseUrls = languages.map(lang => ({
    url: `${protocol}://${host}${lang === 'en' ? '' : `/${lang}`}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  // Create blog post URLs for each language
  const blogUrls = languages.flatMap(lang =>
    allPosts.map(post => ({
      url: `${protocol}://${host}${lang === 'en' ? '' : `/${lang}`}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  return [...baseUrls, ...blogUrls];
}
