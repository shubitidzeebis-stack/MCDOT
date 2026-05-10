import Link from "next/link";
import type { CityData } from "@/lib/areas-types";

type Props = {
  stateSlug: string;
  nearbySlugs: string[];
  allCities: CityData[];
};

export function NearbyAreasBar({ stateSlug, nearbySlugs, allCities }: Props) {
  const nearbyCities = allCities.filter((city) =>
    nearbySlugs.includes(city.slug)
  );

  if (nearbyCities.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12">
      <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] mb-4 md:text-[11px]">
        Nearby cities
      </p>
      <div className="flex flex-wrap gap-2">
        {nearbyCities.map((city) => (
          <Link
            key={city.slug}
            href={`/areas/${stateSlug}/${city.slug}`}
            className="text-sm px-4 py-1.5 rounded-full border border-white/15 text-white/65 hover:border-[#ff8a1a]/40 hover:text-white transition-colors"
          >
            {city.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
