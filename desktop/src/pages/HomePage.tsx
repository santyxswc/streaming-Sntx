import { useState, useEffect } from "react";
import Banner from "@/components/Banner";
import MovieRow from "@/components/MovieRow";
import { useMovieStore } from "@/store/useMovieStore";
import PageLoader from "@/components/PageLoader";
import { api } from "@/config/api";

export default function HomePage() {
  const {
    movies,
    series,
    popularMovies,
    popularSeries,
    latestMovies,
    latestSeries,
    setMovies,
    setSeries,
    setPopularMovies,
    setPopularSeries,
    setLatestMovies,
    setLatestSeries,
    loading,
    setLoading,
    setCachedAt,
    isCacheValid,
  } = useMovieStore();

  const [featuredMovie, setFeaturedMovie] = useState<typeof movies[0] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchAPI = async (url: string) => {
          const res = await fetch(url);
          const data = await res.json();
          return data.success ? data.data : [];
        };

        const [latestM, latestS, popM, popS, newM, newS] = await Promise.all([
          fetchAPI(api.media({ type: "movie", count: 60 })),
          fetchAPI(api.media({ type: "series", count: 60 })),
          fetchAPI(api.media({ type: "movie", count: 60, sortField: "rating" })),
          fetchAPI(api.media({ type: "series", count: 60, sortField: "rating" })),
          fetchAPI(api.media({ type: "movie", count: 60, sortField: "year" })),
          fetchAPI(api.media({ type: "series", count: 60, sortField: "year" })),
        ]);

        setMovies(latestM);
        setSeries(latestS);
        setPopularMovies(popM);
        setPopularSeries(popS);
        setLatestMovies(newM);
        setLatestSeries(newS);
        setCachedAt(Date.now());

        const premieres = newM
          .filter((m) => (m.year as number) >= 2025 && m.trailer)
          .sort((a, b) => (b.rating as number) - (a.rating as number))
          .slice(0, 10);

        if (premieres.length > 0) {
          const randomIndex = Math.floor(Math.random() * premieres.length);
          setFeaturedMovie(premieres[randomIndex]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    const run = async () => {
      if (isCacheValid()) {
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
    <div className="relative min-h-screen bg-[var(--background)] overflow-x-hidden">
      <div className="relative">
        <Banner movie={featuredMovie || movies[0] || popularMovies[0] || null} />
        <div className="relative z-10 py-12 md:py-20 space-y-12 md:space-y-20 pb-40">
          <MovieRow title="Tendencias ahora" items={movies} listingType="peliculas" />
          <MovieRow title="Aclamadas por la crítica" items={popularMovies} listingType="peliculas" />
          <MovieRow title="Series populares" items={series} listingType="series" />
          <MovieRow title="Estrenos recientes" items={latestMovies} listingType="peliculas" />
          <MovieRow title="Series que no te puedes perder" items={popularSeries} listingType="series" />
          <MovieRow title="Nuevas temporadas" items={latestSeries} listingType="series" />
        </div>
      </div>
    </div>
  );
}
