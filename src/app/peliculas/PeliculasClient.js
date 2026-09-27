'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Banner from '@/features/catalog/components/Banner';
import DonateStrip from '@/features/donations/components/DonateStrip';
import MovieRow from '@/features/catalog/components/MovieRow';
import PageLoader from '@/components/ui/PageLoader';
import { useMovieStore } from '@/features/catalog/store/useMovieStore';

export default function PeliculasClient() {
  const { movies, setMovies, setCachedAt, isMoviesCacheValid } = useMovieStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/media?type=movie&count=60');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  if (loading && movies.length === 0) return <PageLoader />;

  return (
    <main className="relative min-h-screen bg-background">
      <Navbar />
      <div className="relative pb-24 pt-20">
        <Banner movie={movies[0]} />
        <DonateStrip />
        <div className="space-y-8 -mt-24 md:-mt-32 relative z-10">
          <MovieRow title="Todas las Películas" items={movies} listingType="peliculas" />
          <MovieRow title="Acción y Suspenso" items={[...movies].reverse()} listingType="peliculas" />
        </div>
      </div>
    </main>
  );
}
