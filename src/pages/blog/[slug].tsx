import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
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

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Destinations: { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200" },
  Guides:       { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Comparatifs:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  Conseils:     { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
};

const DESTINATION_IMAGES: Record<string, string> = {
  japon:        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1600",
  japan:        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1600",
  usa:          "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1600",
  "états-unis": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1600",
  europe:       "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1600",
  australie:    "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=1600",
  bali:         "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1600",
  thaïlande:    "https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=1600",
  maroc:        "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=1600",
  italie:       "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1600",
  iphone:       "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1600",
  android:      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=1600",
  roaming:      "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1600",
  voyage:       "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1600",
  réseau:       "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600",
  dépannage:    "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600",
};

const CATEGORY_IMAGES: Record<string, string> = {
  Destinations: "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1600",
  Guides:       "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600",
  Comparatifs:  "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1600",
  Conseils:     "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600",
};

function getHeroImage(frontmatter: BlogFrontmatter, slug: string): string {
  if ((frontmatter as any).image) return (frontmatter as any).image;
  const text = (frontmatter.title + " " + slug).toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (text.includes(key)) return url;
  }
  return CATEGORY_IMAGES[frontmatter.category] || CATEGORY_IMAGES["Guides"];
}

// Barre de progression de lecture
function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 bg-gray-100 z-50">
      <div
        className="h-full bg-gradient-to-r from-purple-500 to-orange-400 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function BlogPostPage({ frontmatter, contentHtml, readingTimeMin, slug }: Props) {
  const heroImage = getHeroImage(frontmatter, slug);
  const cat = CATEGORY_STYLES[frontmatter.category] || CATEGORY_STYLES["Guides"];
  const formattedDate = new Date(frontmatter.date).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      <Head>
        <title>{frontmatter.title} | FENUA SIM</title>
        <meta name="description" content={frontmatter.description} />
        <meta property="og:title" content={frontmatter.title} />
        <meta property="og:description" content={frontmatter.description} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="article" />
      </Head>

      <ReadingProgress />

      <main className="min-h-screen bg-white">

        {/* ── HERO IMAGE ───────────────────────────────────────────────────────── */}
        <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-gray-900">
          <img
            src={heroImage}
            alt={frontmatter.title}
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/50 to-transparent" />

          {/* Breadcrumb sur l'image */}
          <div className="absolute top-6 left-0 right-0 max-w-3xl mx-auto px-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Retour au blog
            </Link>
          </div>

          {/* Titre sur l'image */}
          <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-4 pb-8">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cat.bg} ${cat.text} ${cat.border} mb-3`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {frontmatter.category}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
              {frontmatter.title}
            </h1>
          </div>
        </div>

        {/* ── CONTENU ──────────────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4">

          {/* Meta bar */}
          <div className="flex items-center gap-4 py-5 border-b border-gray-100 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {formattedDate}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {readingTimeMin} min de lecture
            </span>
          </div>

          {/* Description mise en avant */}
          <p className="mt-6 text-lg text-gray-600 leading-relaxed font-medium border-l-4 border-purple-200 pl-5 py-1">
            {frontmatter.description}
          </p>

          {/* Corps de l'article */}
          <article
            className="
              mt-8 pb-12
              prose prose-gray max-w-none

              prose-headings:font-extrabold
              prose-headings:text-gray-900
              prose-headings:tracking-tight

              prose-h2:text-2xl
              prose-h2:mt-10
              prose-h2:mb-4
              prose-h2:pb-2
              prose-h2:border-b
              prose-h2:border-gray-100
              prose-h2:scroll-mt-24

              prose-h3:text-lg
              prose-h3:mt-6
              prose-h3:mb-3

              prose-p:text-gray-700
              prose-p:leading-relaxed
              prose-p:text-base

              prose-a:text-purple-700
              prose-a:font-semibold
              prose-a:no-underline
              hover:prose-a:underline

              prose-strong:text-gray-900
              prose-strong:font-bold

              prose-li:text-gray-700
              prose-li:leading-relaxed

              prose-table:text-sm
              prose-thead:bg-gray-50
              prose-th:font-bold
              prose-th:text-gray-900
              prose-th:py-3
              prose-th:px-4
              prose-td:py-3
              prose-td:px-4
              prose-tr:border-b
              prose-tr:border-gray-100

              prose-blockquote:border-l-4
              prose-blockquote:border-purple-300
              prose-blockquote:bg-purple-50
              prose-blockquote:rounded-r-xl
              prose-blockquote:px-5
              prose-blockquote:py-3
              prose-blockquote:not-italic
              prose-blockquote:text-purple-900

              prose-code:bg-gray-100
              prose-code:text-purple-700
              prose-code:px-1.5
              prose-code:py-0.5
              prose-code:rounded
              prose-code:text-sm
              prose-code:font-mono
              prose-code:before:content-none
              prose-code:after:content-none

              prose-hr:border-gray-200
              prose-hr:my-8
            "
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* CTA */}
          <div className="border-t border-gray-100 pt-10">
            <BlogCta />
          </div>

          {/* Retour blog */}
          <div className="py-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-purple-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Voir tous les articles
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
