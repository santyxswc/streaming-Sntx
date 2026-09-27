import { useEffect, useState } from "react";
import Banner from "@/components/Banner";
import MovieRow from "@/components/MovieRow";
import NetflixLoader from "@/components/NetflixLoader";
import { useMovieStore } from "@/store/useMovieStore";
import { api } from "@/config/api";

export default function SeriesPage() {
  const { series, setSeries, setCachedAt, isSeriesCacheValid } = useMovieStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(api.media({ type: "series", count: 60 }));
        const data = await res.json();
        if (data.success) {
          setSeries(data.data);
          setCachedAt(Date.now());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const run = async () => {
      if (isSeriesCacheValid()) {
        setLoading(false);
        return;
      }
      await fetchData();
    };

    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading && series.length === 0) return <NetflixLoader />;

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      <div className="relative pb-24 pt-20">
        <Banner movie={series[0] || null} />
        <div className="space-y-8 -mt-24 md:-mt-32 relative z-10">
          <MovieRow title="Todas las Series" items={series} listingType="series" />
          <MovieRow title="Estrenos Recientes" items={[...series].reverse()} listingType="series" />
        </div>
      </div>
    </div>
  );
}
