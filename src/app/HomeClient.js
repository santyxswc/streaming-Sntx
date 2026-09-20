'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import DonateStrip from '@/components/DonateStrip';
import MovieRow from '@/components/MovieRow';
import { useMovieStore } from '@/store/useMovieStore';
import NetflixLoader from '@/components/NetflixLoader';

export default function HomeClient() {
  const { 
    movies, series, 
    popularMovies, popularSeries,
    latestMovies, latestSeries,
    setMovies, setSeries, 
    setPopularMovies, setPopularSeries,
    setLatestMovies, setLatestSeries,
    loading, setLoading,
    setCachedAt,
    isCacheValid,
  } = useMovieStore();

  const [featuredMovie, setFeaturedMovie] = useState(null);

  const pickFeaturedFromPremieres = (latestM, latestS) => {
    const moviePremieres = (latestM || [])
      .filter((m) => (Number(m.year) || 0) >= 2025 && m.trailer)
      .map((m) => ({ ...m, type: m.type || 'movie' }));
    const seriesPremieres = (latestS || [])
      .filter((s) => (Number(s.year) || 0) >= 2025 && s.trailer)
      .map((s) => ({ ...s, type: s.type || 'series' }));
    const all = [...moviePremieres, ...seriesPremieres]
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      .slice(0, 10);
    if (all.length > 0) {
      return all[Math.floor(Math.random() * all.length)];
    }
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchAPI = async (url) => {
          const res = await fetch(url);
          const data = await res.json();
          return data.success ? data.data : [];
        };

        const [
          latestM,
          popM, popSeries,
          yearRatingSeries,
          newM, newS
        ] = await Promise.all([
          fetchAPI('/api/media?type=movie&count=60'),
          fetchAPI('/api/media?type=movie&count=60&sortField=yearRating'),
          fetchAPI('/api/media?type=series&count=60&sortField=rating'),
          fetchAPI('/api/media?type=series&count=60&sortField=yearRating'),
          fetchAPI('/api/media?type=movie&count=60&sortField=year'),
          fetchAPI('/api/media?type=series&count=60&sortField=year')
        ]);

        setMovies(latestM);
        setSeries(popSeries);
        setPopularMovies(popM);
        setPopularSeries(yearRatingSeries);
        setLatestMovies(newM);
        setLatestSeries(newS);
        setCachedAt(Date.now());

        setFeaturedMovie(pickFeaturedFromPremieres(newM, newS));

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    const run = async () => {
      const valid = isCacheValid();
      if (valid) {
        setLoading(false);
        setFeaturedMovie(
          pickFeaturedFromPremieres(
            useMovieStore.getState().latestMovies,
            useMovieStore.getState().latestSeries
          )
        );
        return;
      }
      await fetchData();
    };

    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount, cache check via isCacheValid
  }, []);

  if (loading && movies.length === 0) return <NetflixLoader />;

  return (
    <main className="relative min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      
      <div className="relative">
        <Banner movie={featuredMovie || movies[0] || popularMovies[0]} />
        <DonateStrip />
        <div className="relative z-10 py-12 md:py-20 space-y-12 md:space-y-20 pb-40">
          <MovieRow title="Tendencias ahora" items={movies} listingType="peliculas" />
          <MovieRow title="Aclamadas por la crítica" items={popularMovies} listingType="peliculas" />
          <MovieRow title="Series populares" items={series} listingType="series" />
          <MovieRow title="Estrenos recientes" items={latestMovies} listingType="peliculas" />
          <MovieRow title="Series que no te puedes perder" items={popularSeries} listingType="series" />
          <MovieRow title="Nuevas temporadas" items={latestSeries} listingType="series" />
        </div>
      </div>
    </main>
  );
}
