import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getAllPosts, BlogPost } from "../../lib/blog";

type Props = { posts: BlogPost[] };

export const getStaticProps: GetStaticProps<Props> = async () => {
  const posts = getAllPosts();
  return { props: { posts } };
};

const CATEGORY_ORDER = ["Destinations", "Guides", "Comparatifs", "Conseils"] as const;

// Palette d'images par destination/catégorie
const CATEGORY_IMAGES: Record<string, string> = {
  Destinations: "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=800",
  Guides: "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=800",
  Comparatifs: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=800",
  Conseils: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800",
};

const DESTINATION_IMAGES: Record<string, string> = {
  japon: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800",
  japan: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800",
  usa: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=800",
  "états-unis": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=800",
  europe: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=800",
  australie: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=800",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800",
  thaïlande: "https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=800",
  maroc: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=800",
  italie: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=800",
  iphone: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=800",
  android: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800",
  roaming: "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=800",
};

function getPostImage(post: BlogPost): string {
  if (post.image) return post.image;
  const titleLower = (post.title + " " + post.slug).toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (titleLower.includes(key)) return url;
  }
  return CATEGORY_IMAGES[post.category] || CATEGORY_IMAGES["Guides"];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Destinations: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-400" },
  Guides:       { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  Comparatifs:  { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  Conseils:     { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
};

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] || { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {category}
    </span>
  );
}

export default function BlogIndexPage({ posts }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Tous");

  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of posts) counts[p.category] = (counts[p.category] || 0) + 1;
    return [
      { name: "Tous", count: posts.length },
      ...CATEGORY_ORDER.map((c) => ({ name: c, count: counts[c] || 0 })),
    ];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchCategory = activeCategory === "Tous" || p.category === activeCategory;
      const matchQuery = q.length === 0 || (p.title || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [posts, query, activeCategory]);

  const featured = posts[0];
  const rest = filtered.filter((p) => p.slug !== featured?.slug);
  const showFeaturedInGrid = activeCategory !== "Tous" || query.trim().length > 0;

  return (
    <>
      <Head>
        <title>Blog | FENUA SIM — Guides eSIM & Destinations</title>
        <meta name="description" content="Guides eSIM, destinations, comparatifs et conseils voyageurs pour rester connecté partout." />
        <meta property="og:title" content="Blog FENUA SIM — Voyager connecté, sans stress" />
        <meta property="og:description" content="Guides eSIM, destinations, comparatifs et conseils voyageurs." />
        <meta property="og:image" content={featured ? getPostImage(featured) : ""} />
      </Head>

      <main className="min-h-screen bg-gray-50">

        {/* ── HERO HEADER ──────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-bold text-purple-700 mb-4">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  {posts.length} articles
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                  Voyager connecté,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">sans stress.</span>
                </h1>
                <p className="mt-4 text-gray-500 max-w-lg text-base leading-relaxed">
                  Choisir le bon forfait, installer votre eSIM, éviter le roaming — tout ce qu'il faut savoir avant de partir.
                </p>
              </div>

              {/* Search */}
              <div className="lg:w-80">
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Australie, iPhone, roaming…"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>

                {/* Filtres */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoriesWithCounts.map((c) => {
                    const active = activeCategory === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => setActiveCategory(c.name)}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-semibold border transition-all",
                          active
                            ? "border-purple-500 bg-purple-600 text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-purple-200 hover:text-purple-700",
                        ].join(" ")}
                      >
                        {c.name}
                        <span className={`ml-1 ${active ? "opacity-80" : "opacity-50"}`}>({c.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10">

          {/* ── FEATURED ARTICLE ─────────────────────────────────────────────── */}
          {featured && !showFeaturedInGrid && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-px bg-purple-400" />
                <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">À la une</span>
              </div>

              <Link href={`/blog/${featured.slug}`} className="group block">
                <div className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-xl" style={{ minHeight: "420px" }}>
                  {/* Image de fond */}
                  <img
                    src={getPostImage(featured)}
                    alt={featured.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-50 group-hover:scale-[1.02] transition-all duration-700"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-transparent to-transparent" />

                  {/* Contenu */}
                  <div className="relative h-full flex flex-col justify-end p-8 sm:p-12" style={{ minHeight: "420px" }}>
                    {/* Badges */}
                    <div className="flex items-center gap-3 mb-4">
                      <CategoryBadge category={featured.category} />
                      <span className="text-xs text-white/60 font-medium">{featured.readingTimeMin} min de lecture</span>
                      <span className="text-xs text-white/60">·</span>
                      <span className="text-xs text-white/60">{new Date(featured.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight max-w-2xl group-hover:text-purple-200 transition-colors duration-300">
                      {featured.title}
                    </h2>

                    <p className="mt-3 text-white/70 max-w-xl text-sm sm:text-base leading-relaxed line-clamp-2">
                      {featured.description}
                    </p>

                    {/* CTA */}
                    <div className="mt-6 flex items-center gap-4">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-bold group-hover:bg-purple-50 transition-colors">
                        Lire l'article
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </span>
                      <span className="text-white/50 text-xs">Article le plus récent</span>
                    </div>
                  </div>

                  {/* Coin décoratif */}
                  <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* ── GRILLE D'ARTICLES ─────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-500 font-medium">Aucun résultat pour cette recherche.</p>
              <button onClick={() => { setQuery(""); setActiveCategory("Tous"); }} className="mt-4 text-purple-600 text-sm font-semibold hover:underline">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <>
              {(showFeaturedInGrid ? filtered : rest).length > 0 && (
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-6 h-px bg-gray-300" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {showFeaturedInGrid ? `${filtered.length} article${filtered.length > 1 ? "s" : ""}` : `${rest.length} autre${rest.length > 1 ? "s" : ""} article${rest.length > 1 ? "s" : ""}`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(showFeaturedInGrid ? filtered : rest).map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 overflow-hidden"
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-gray-100">
                      <img
                        src={getPostImage(p)}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-3 left-3">
                        <CategoryBadge category={p.category} />
                      </div>
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </span>
                      </div>
                    </div>

                    {/* Contenu */}
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="text-base font-extrabold text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug">
                        {p.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
                        {p.description}
                      </p>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {new Date(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {p.readingTimeMin} min
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* ── CTA BAS DE PAGE ───────────────────────────────────────────────── */}
          <div className="mt-16 rounded-3xl bg-gradient-to-r from-purple-600 to-orange-500 p-8 sm:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative">
              <div className="text-3xl mb-3">✈️</div>
              <h3 className="text-2xl font-extrabold mb-2">Prêt à voyager connecté ?</h3>
              <p className="text-white/80 mb-6 max-w-md mx-auto text-sm">Activez votre eSIM en 2 minutes. Couverture dans +180 pays dès l'atterrissage.</p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-purple-700 font-bold text-sm hover:bg-purple-50 transition-colors shadow-lg"
              >
                Choisir mon eSIM
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
