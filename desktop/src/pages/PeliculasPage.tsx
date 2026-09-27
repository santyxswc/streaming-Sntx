import { useEffect, useState } from "react";
import Banner from "@/components/Banner";
import MovieRow from "@/components/MovieRow";
import PageLoader from "@/components/PageLoader";
import { useMovieStore } from "@/store/useMovieStore";
import { api } from "@/config/api";

export default function PeliculasPage() {
  const { movies, setMovies, setCachedAt, isMoviesCacheValid } = useMovieStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(api.media({ type: "movie", count: 60 }));
        const data = await res.json();
        if (data.success) {
          setMovies(data.data);
          setCachedAt(Date.now());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const run = async () => {
      if (isMoviesCacheValid()) {
        setLoading(false);
        return;
      }
      await fetchData();
    };

    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading && movies.length === 0) return <PageLoader />;

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      <div className="relative pb-24 pt-20">
        <Banner movie={movies[0] || null} />
        <div className="space-y-8 -mt-24 md:-mt-32 relative z-10">
          <MovieRow title="Todas las Películas" items={movies} listingType="peliculas" />
          <MovieRow title="Acción y Suspenso" items={[...movies].reverse()} listingType="peliculas" />
        </div>
      </div>
    </div>
  );
}
