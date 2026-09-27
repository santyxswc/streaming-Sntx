'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

export const useMovieStore = create(
  persist(
    (set) => ({
      movies: [],
      series: [],
      popularMovies: [],
      popularSeries: [],
      latestMovies: [],
      latestSeries: [],
      loading: false,
      error: null,
      activeItem: null,
      searchQuery: '',
      cachedAt: null,

      setMovies: (movies) => set({ movies }),
      setSeries: (series) => set({ series }),
      setPopularMovies: (popularMovies) => set({ popularMovies }),
      setPopularSeries: (popularSeries) => set({ popularSeries }),
      setLatestMovies: (latestMovies) => set({ latestMovies }),
      setLatestSeries: (latestSeries) => set({ latestSeries }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setActiveItem: (item) => set({ activeItem: item }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCachedAt: (cachedAt) => set({ cachedAt }),

      isCacheValid: () => {
        const state = useMovieStore.getState();
        const { cachedAt, movies } = state;
        return movies.length > 0 && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS;
      },
      isMoviesCacheValid: () => {
        const state = useMovieStore.getState();
        const { cachedAt, movies } = state;
        return movies.length > 0 && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS;
      },
      isSeriesCacheValid: () => {
        const state = useMovieStore.getState();
        const { cachedAt, series } = state;
        return series.length > 0 && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS;
      },
    }),
    {
      name: 'sntx-movies',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? sessionStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        movies: state.movies,
        series: state.series,
        popularMovies: state.popularMovies,
        popularSeries: state.popularSeries,
        latestMovies: state.latestMovies,
        latestSeries: state.latestSeries,
        cachedAt: state.cachedAt,
      }),
    }
  )
);
