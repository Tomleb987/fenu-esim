import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import BlogCta from "../../components/BlogCta";
import { getAllSlugs, getPostBySlug, BlogFrontmatter } from "../../lib/blog";

type Props = {
  slug: string;
  frontmatter: BlogFrontmatter;
  contentHtml: string;
  readingTimeMin: number;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || "");
  const post = await getPostBySlug(slug);

  return {
    props: {
      slug,
      frontmatter: post.frontmatter,
      contentHtml: post.contentHtml,
      readingTimeMin: post.readingTimeMin,
    },
  };
};

export default function BlogPostPage({ frontmatter, contentHtml, readingTimeMin }: Props) {
  return (
    <>
      <Head>
        <title>{frontmatter.title} | FENUA SIM</title>
        <meta name="description" content={frontmatter.description} />
      </Head>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/blog" className="text-sm font-semibold text-purple-700 hover:underline">
          ← Retour au blog
        </Link>

        <header className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-purple-700">{frontmatter.category}</span>
            <span className="text-xs text-gray-500">{readingTimeMin} min</span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
            {frontmatter.title}
          </h1>

          <p className="mt-3 text-gray-700">{frontmatter.description}</p>

          <p className="mt-3 text-xs text-gray-500">
            Publié le {new Date(frontmatter.date).toLocaleDateString("fr-FR")}
          </p>
        </header>

        <article
          className="prose prose-gray max-w-none mt-8
                     prose-h2:mt-8 prose-h2:scroll-mt-24
                     prose-a:text-purple-700 hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        <BlogCta />
      </main>
    </>
  );
}
