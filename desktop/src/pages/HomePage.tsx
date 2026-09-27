import Banner from "@/components/Banner";
import FeedRows from "@/components/FeedRows";
import PageLoader from "@/components/PageLoader";
import { useFeed } from "@/hooks/useFeed";

export default function HomePage() {
  const { sections, featured, loading, error } = useFeed("home");

  if (loading) return <PageLoader />;

  return (
    <div className="relative min-h-screen bg-[var(--background)] overflow-x-hidden">
      <div className="relative">
        <Banner movie={featured} />
        <div className="relative z-10 py-12 md:py-20 space-y-12 md:space-y-20 pb-40">
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
