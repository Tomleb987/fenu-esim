import Link from "next/link";

export default function BlogCta({
  href = "/shop",
  title = "Prêt à partir ?",
  subtitle = "Choisissez votre eSIM en 2 minutes. Email immédiat, installation simple, support en français.",
  button = "Voir les forfaits",
}: {
  href?: string;
  title?: string;
  subtitle?: string;
  button?: string;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-orange-50 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base sm:text-lg font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-700 mt-1">{subtitle}</p>
          <p className="text-xs text-gray-600 mt-2">
            Email immédiat • Installation 3 min • Support FR
          </p>
        </div>

        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md
                     bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
        >
          {button}
        </Link>
      </div>
    </div>
  );
}
