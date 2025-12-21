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
      const matchCategory = activeCategory === "Tous" ? true : p.category === activeCategory;
      const matchQuery =
        q.length === 0
          ? true
          : (p.title || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q);

      return matchCategory && matchQuery;
    });
  }, [posts, query, activeCategory]);

  const featured = posts.slice(0, 1)[0]; // 1 article mis en avant (le + récent)

  return (
    <>
      <Head>
        <title>Blog | FENUA SIM</title>
        <meta
          name="description"
          content="Guides eSIM, destinations, comparatifs et conseils voyageurs pour rester connecté partout."
        />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* HERO */}
          <header className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                Guides • Destinations • Comparatifs
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Blog FENUA SIM
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500">
                  Voyager connecté, sans stress
                </span>
              </h1>

              <p className="mt-3 text-gray-700 max-w-2xl">
                Des contenus actionnables : choisir le bon forfait, installer votre eSIM, éviter le roaming, gagner du temps.
              </p>

              {/* Search */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher : Australie, iPhone, roaming…"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md
                             bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
                >
                  Voir les eSIM
                </Link>
              </div>

              {/* Categories */}
              <div className="mt-6 flex flex-wrap gap-2">
                {categoriesWithCounts.map((c) => {
                  const active = activeCategory === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setActiveCategory(c.name)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold border transition",
                        active
                          ? "border-purple-300 bg-purple-50 text-purple-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50/30",
                      ].join(" ")}
                    >
                      {c.name} <span className="opacity-60">({c.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Featured */}
            {featured && (
              <div className="border-t border-gray-200 bg-gradient-to-r from-purple-50 to-orange-50 p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-purple-700">{featured.category}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">{featured.readingTimeMin} min</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">
                        {new Date(featured.date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900">
                      {featured.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-700 max-w-2xl line-clamp-2">
                      {featured.description}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md
                                 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
                    >
                      Lire l’article
                    </Link>
                    <Link
                      href="/shop"
                      className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold
                                 border border-purple-200 text-purple-700 bg-white hover:bg-purple-50"
                    >
                      Choisir une eSIM
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </header>

          {/* LIST */}
          <section className="mt-8">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700">
                Aucun résultat. Essaie une autre recherche (ex : “USA”, “Android”, “Go”).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-purple-700">{p.category}</span>
                      <span className="text-xs text-gray-500">{p.readingTimeMin} min</span>
                    </div>

                    <h3 className="mt-2 text-lg font-extrabold text-gray-900 group-hover:text-purple-700 transition line-clamp-2">
                      {p.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-700 line-clamp-3">{p.description}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(p.date).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="text-xs font-semibold text-purple-700">Lire →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
