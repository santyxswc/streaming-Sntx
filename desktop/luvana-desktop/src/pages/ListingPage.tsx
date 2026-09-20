import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import MovieRow from "@/components/MovieRow";
import { Calendar, Globe, Tag } from "lucide-react";
import { ALL_GENRES } from "@/lib/genreMap";
import { api } from "@/config/api";
import type { MediaItem } from "@/store/useFavoritesStore";

export default function ListingPage() {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const initialGenre = searchParams.get("genre");

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres] = useState(["Todos", ...ALL_GENRES]);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre || "Todos");
  const [selectedYear, setSelectedYear] = useState("Todos");
  const [years, setYears] = useState<string[]>(["Todos"]);
  const [selectedCountry, setSelectedCountry] = useState("Todos");
  const [countries, setCountries] = useState<string[]>(["Todos"]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const genreParam = searchParams.get("genre");
    if (genreParam) setSelectedGenre(genreParam);
    else setSelectedGenre("Todos");
  }, [searchParams]);

  const fetchMetadata = async () => {
    const mediaType = type === "peliculas" ? "movie" : "series";
    const res = await fetch(api.metadata(mediaType));
    const json = await res.json();
    if (json.success && json.data) {
      setYears(json.data.years || ["Todos"]);
      setCountries(json.data.countries || ["Todos"]);
    }
  };

  const fetchData = async (isLoadMore = false) => {
    setLoading(true);
    if (!isLoadMore) {
      setItems([]);
      setLastId(null);
      setHasMore(true);
    }

    try {
      const mediaType = type === "peliculas" ? "movie" : "series";
      const params: Record<string, string | number> = { type: mediaType, count: 24 };
      if (isLoadMore && lastId) params.lastId = lastId;
      if (selectedGenre !== "Todos") params.genre = selectedGenre;
      if (selectedYear !== "Todos") params.year = selectedYear;
      if (selectedCountry !== "Todos") params.country = selectedCountry;

      const url = api.media(params);
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        const newItems = data.data as MediaItem[];
        if (newItems.length < 24) setHasMore(false);
        else setHasMore(true);

        setItems((prev) => {
          const combined = isLoadMore ? [...prev] : [];
          newItems.forEach((newItem) => {
            if (!combined.find((item) => item.id === newItem.id)) combined.push(newItem);
          });

          if (!isLoadMore && combined.length > 0) {
            setYears((ys) => {
              if (ys.length <= 1) {
                const allYears = new Set<string>(["Todos"]);
                combined.forEach((item) => {
                  if (item.year && /^\d{4}$/.test(String(item.year))) allYears.add(String(item.year));
                });
                return [...allYears].sort((a, b) =>
                  a === "Todos" ? -1 : b === "Todos" ? 1 : Number(b) - Number(a)
                );
              }
              return ys;
            });
            setCountries((cs) => {
              if (cs.length <= 1) {
                const allCountries = new Set<string>(["Todos"]);
                combined.forEach((item) => {
                  if (item.country) allCountries.add(String(item.country));
                });
                return [...allCountries].sort((a, b) =>
                  a === "Todos" ? -1 : b === "Todos" ? 1 : a.localeCompare(b)
                );
              }
              return cs;
            });
          }
          return combined;
        });

        if (newItems.length > 0) setLastId(newItems[newItems.length - 1].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [type, selectedGenre, selectedYear, selectedCountry]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) fetchData(true);
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [loading, hasMore, lastId]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-white pb-20">
      <div className="pt-32 px-4 md:px-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black capitalize tracking-tight">
              {type === "peliculas" ? "Películas" : "Series"}
            </h1>
            <p className="text-gray-400 mt-2">Explora nuestro catálogo completo con filtros avanzados.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Tag size={12} /> Género
            </label>
            <select
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg outline-none focus:border-[var(--primary)] transition-premium capitalize text-white"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              {genres.map((g) => (
                <option key={g} value={g} className="bg-neutral-900 text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} /> Año
            </label>
            <select
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg outline-none focus:border-[var(--primary)] transition-premium text-white"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-neutral-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Globe size={12} /> País
            </label>
            <select
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg outline-none focus:border-[var(--primary)] transition-premium text-white"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c} value={c} className="bg-neutral-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {items.map((item) => (
              <MovieRow.Card key={item.id} item={item} isGrid />
            ))}
          </div>
        ) : (
          <div className="py-40 text-center text-gray-500 italic">No se encontraron resultados con los filtros seleccionados.</div>
        )}

        {items.length > 0 && hasMore && (
          <div ref={loaderRef} className="h-20 w-full flex items-center justify-center mt-10">
            {loading && (
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-.3s]" />
                <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-.5s]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
