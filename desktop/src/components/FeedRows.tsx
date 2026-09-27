import MovieRow from "@/components/MovieRow";
import type { FeedSection } from "@/api/client";

const LISTING_BY_TYPE = { movie: "peliculas", series: "series" } as const;

export default function FeedRows({ sections }: { sections: FeedSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <MovieRow
          key={section.id}
          title={section.title}
          items={section.items}
          listingType={LISTING_BY_TYPE[section.type]}
        />
      ))}
    </>
  );
}
