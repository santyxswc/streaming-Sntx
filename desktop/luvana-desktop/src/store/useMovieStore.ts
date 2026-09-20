import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MediaItem } from "./useFavoritesStore";

const CACHE_TTL_MS = 60 * 60 * 1000;

interface MovieStoreState {
  movies: MediaItem[];
  series: MediaItem[];
  popularMovies: MediaItem[];
  popularSeries: MediaItem[];
  latestMovies: MediaItem[];
  latestSeries: MediaItem[];
  loading: boolean;
  error: string | null;
  cachedAt: number | null;
  setMovies: (movies: MediaItem[]) => void;
  setSeries: (series: MediaItem[]) => void;
  setPopularMovies: (movies: MediaItem[]) => void;
  setPopularSeries: (series: MediaItem[]) => void;
  setLatestMovies: (movies: MediaItem[]) => void;
  setLatestSeries: (series: MediaItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCachedAt: (cachedAt: number | null) => void;
  isCacheValid: () => boolean;
  isMoviesCacheValid: () => boolean;
  isSeriesCacheValid: () => boolean;
}

export const useMovieStore = create<MovieStoreState>()(
  persist(
    (set, get) => ({
      movies: [],
      series: [],
      popularMovies: [],
      popularSeries: [],
      latestMovies: [],
      latestSeries: [],
      loading: false,
      error: null,
      cachedAt: null,

      setMovies: (movies) => set({ movies }),
      setSeries: (series) => set({ series }),
      setPopularMovies: (popularMovies) => set({ popularMovies }),
      setPopularSeries: (popularSeries) => set({ popularSeries }),
      setLatestMovies: (latestMovies) => set({ latestMovies }),
      setLatestSeries: (latestSeries) => set({ latestSeries }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setCachedAt: (cachedAt) => set({ cachedAt }),

      isCacheValid: () => {
        const { cachedAt, movies } = get();
        return movies.length > 0 && cachedAt !== null && Date.now() - cachedAt < CACHE_TTL_MS;
      },
      isMoviesCacheValid: () => {
        const { cachedAt, movies } = get();
        return movies.length > 0 && cachedAt !== null && Date.now() - cachedAt < CACHE_TTL_MS;
      },
      isSeriesCacheValid: () => {
        const { cachedAt, series } = get();
        return series.length > 0 && cachedAt !== null && Date.now() - cachedAt < CACHE_TTL_MS;
      },
    }),
    {
      name: "luvana-movies",
      storage: createJSONStorage(() => sessionStorage),
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
