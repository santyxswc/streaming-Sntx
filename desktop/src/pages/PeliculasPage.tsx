import Banner from "@/components/Banner";
import FeedRows from "@/components/FeedRows";
import PageLoader from "@/components/PageLoader";
import { useFeed } from "@/hooks/useFeed";

export default function PeliculasPage() {
  const { sections, featured, loading, error } = useFeed("movies");

  if (loading) return <PageLoader />;

  return (
    <div className="relative min-h-screen bg-[var(--background)] overflow-x-hidden">
      <div className="relative pb-24 pt-20">
        <Banner movie={featured} />
        <div className="space-y-8 -mt-24 md:-mt-32 relative z-10">
          {error ? (
            <p className="px-4 md:px-12 text-center text-gray-400">No se pudo cargar el catálogo. Inténtalo de nuevo.</p>
          ) : (
            <FeedRows sections={sections} />
          )}
        </div>
      </div>
    </div>
  );
}
