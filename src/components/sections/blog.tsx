import BlogCard from "@/components/blog-card";
import Section from "@/components/section";
import { getBlogPosts } from "@/lib/blog";
import { Locale } from "@/lib/definitions";
import { getIntl } from "@/lib/intl";

interface BlogSectionProps {
  lang: Locale;
}

export default async function BlogSection({ lang }: BlogSectionProps) {
  const intl = await getIntl(lang);
  const allPosts = await getBlogPosts(lang);

  const articles = await Promise.all(
    allPosts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  );

  return (
    <Section 
      title={intl.formatMessage({ id: "page.home.blog.title" })}
      subtitle={intl.formatMessage({ id: "page.home.blog.subtitle" })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((data, idx) => (
          <BlogCard key={data.slug} data={data} priority={idx <= 1} lang={lang} />
        ))}
      </div>
    </Section>
  );
}
