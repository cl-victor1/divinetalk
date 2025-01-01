import { siteConfig } from "@/lib/config";
import fs from "fs";
import path from "path";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { Locale } from "./definitions";

export type Post = {
  title: string;
  publishedAt: string;
  summary: string;
  author: string;
  slug: string;
  image?: string;
  locale: Locale;
};

function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  let match = frontmatterRegex.exec(fileContent);
  let frontMatterBlock = match![1];
  let content = fileContent.replace(frontmatterRegex, "").trim();
  let frontMatterLines = frontMatterBlock.trim().split("\n");
  let metadata: Partial<Post> = {};

  frontMatterLines.forEach((line) => {
    let [key, ...valueArr] = line.split(": ");
    let value = valueArr.join(": ").trim();
    value = value.replace(/^['"](.*)['"]$/, "$1"); // Remove quotes
    metadata[key.trim() as keyof Post] = value as any;
  });

  return { data: metadata as Post, content };
}

function getMDXFiles(dir: string) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === ".mdx");
}

export async function markdownToHTML(markdown: string) {
  const p = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypePrettyCode, {
      theme: {
        light: "min-light",
        dark: "min-dark",
      },
      keepBackground: false,
    })
    .use(rehypeStringify)
    .process(markdown);

  return p.toString();
}

export async function getPost(slug: string, locale: Locale) {
  const filePath = path.join("content", locale, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    // Fallback to default locale if translation doesn't exist
    const defaultFilePath = path.join("content", "en", `${slug}.mdx`);
    if (!fs.existsSync(defaultFilePath)) {
      throw new Error(`Post not found: ${slug}`);
    }
    const source = fs.readFileSync(defaultFilePath, "utf-8");
    const { content: rawContent, data: metadata } = parseFrontmatter(source);
    const content = await markdownToHTML(rawContent);
    const defaultImage = `${siteConfig.url}/og?title=${encodeURIComponent(
      metadata.title
    )}`;
    return {
      source: content,
      metadata: {
        ...metadata,
        image: metadata.image || defaultImage,
        locale: "en" as Locale,
      },
      slug,
    };
  }

  const source = fs.readFileSync(filePath, "utf-8");
  const { content: rawContent, data: metadata } = parseFrontmatter(source);
  const content = await markdownToHTML(rawContent);
  const defaultImage = `${siteConfig.url}/og?title=${encodeURIComponent(
    metadata.title
  )}`;
  return {
    source: content,
    metadata: {
      ...metadata,
      image: metadata.image || defaultImage,
      locale,
    },
    slug,
  };
}

async function getAllPosts(dir: string, locale: Locale) {
  const mdxFiles = getMDXFiles(path.join(dir, locale));
  return Promise.all(
    mdxFiles.map(async (file) => {
      const slug = path.basename(file, path.extname(file));
      const { metadata, source } = await getPost(slug, locale);
      return {
        ...metadata,
        slug,
        source,
      };
    })
  );
}

export async function getBlogPosts(locale: Locale = "en") {
  return getAllPosts(path.join(process.cwd(), "content"), locale);
}
