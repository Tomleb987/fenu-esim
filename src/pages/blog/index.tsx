import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { getAllPosts, BlogPost } from "@/lib/blog";

type Props = { posts: BlogPost[] };

export const getStaticProps: GetStaticProps<Props> = async () => {
  const posts = getAllPosts();
  return { props: { posts } };
};

export default function BlogIndexPage({ posts }: Props) {
  return (
    <>
      <Head>
        <title>Blog | FENUA SIM</title>
        <meta
          name="description"
          content="Guides eSIM, destinations, comparatifs et conseils voyageurs pour rester connecté partout."
        />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Blog FENUA SIM
          </h1>
          <p className="mt-2 text-gray-700 max-w-2xl">
            Du concret : choisir le bon forfait, installer votre eSIM, éviter les pièges du roaming.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {["Destinations", "Guides", "Comparatifs", "Conseils"].map((c) => (
              <span
                key={c}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700"
              >
                {c}
              </span>
            ))}
          </div>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700">
            Aucun article pour le moment.
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-purple-700">{p.category}</span>
                  <span className="text-xs text-gray-500">{p.readingTimeMin} min</span>
                </div>

                <h2 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-purple-700 transition">
                  {p.title}
                </h2>

                <p className="mt-2 text-sm text-gray-700 line-clamp-3">
                  {p.description}
                </p>

                <div className="mt-4 text-xs text-gray-500">
                  {new Date(p.date).toLocaleDateString("fr-FR")}
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
