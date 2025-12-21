import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

export type BlogCategory = "Destinations" | "Guides" | "Comparatifs" | "Conseils";

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: BlogCategory;
  cover?: string;
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
  readingTimeMin: number;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function estimateReadingTimeMin(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

function readFileBySlug(slug: string) {
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  const filePath = fs.existsSync(mdPath) ? mdPath : mdxPath;

  if (!fs.existsSync(filePath)) throw new Error(`Blog post not found: ${slug}`);
  return fs.readFileSync(filePath, "utf8");
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => f.replace(/\.(md|mdx)$/, ""));
}

export function getAllPosts(): BlogPost[] {
  const slugs = getAllSlugs();

  const posts = slugs.map((slug) => {
    const raw = readFileBySlug(slug);
    const { data, content } = matter(raw);
    const fm = data as BlogFrontmatter;

    return { slug, ...fm, readingTimeMin: estimateReadingTimeMin(content) };
  });

  // tri du + récent au + ancien
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string) {
  const raw = readFileBySlug(slug);
  const { data, content } = matter(raw);

  const processed = await remark().use(html, { sanitize: false }).process(content);
  const contentHtml = processed.toString();

  const fm = data as BlogFrontmatter;

  return {
    slug,
    frontmatter: fm,
    contentHtml,
    readingTimeMin: estimateReadingTimeMin(content),
  };
}
