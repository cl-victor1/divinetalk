import { getBlogPosts } from "@/lib/blog";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

// Define supported languages
const languages = ['en', 'zh', 'es', 'fr', 'de', 'it', 'pt'] // Add all supported languages

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getBlogPosts();
  const headersList = headers();
  const domain = headersList.get("host") as string;
  const protocol = "https";

  // Create base URLs for each language
  const baseUrls = languages.map(lang => ({
    url: `${protocol}://${domain}${lang === 'en' ? '' : `/${lang}`}`,
    lastModified: new Date(),
  }));

  // Create blog post URLs for each language
  const blogUrls = languages.flatMap(lang =>
    allPosts.map(post => ({
      url: `${protocol}://${domain}${lang === 'en' ? '' : `/${lang}`}/blog/${post.slug}`,
      lastModified: new Date(),
    }))
  );

  return [...baseUrls, ...blogUrls];
}
