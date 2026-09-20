'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MovieRow from '@/components/MovieRow';
import { Calendar, Globe, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_GENRES } from '@/lib/genreMap';

export default function ListingClient() {
  const { type } = useParams(); // 'peliculas', 'series'
  const searchParams = useSearchParams();
  const initialGenre = searchParams.get('genre');

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [genres, setGenres] = useState(['Todos', ...ALL_GENRES]);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre || 'Todos');
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [years, setYears] = useState(['Todos']);
  const [selectedCountry, setSelectedCountry] = useState('Todos');
  const [countries, setCountries] = useState(['Todos']);
  const [sortBy, setSortBy] = useState('desc'); // 'desc' = más recientes

  const [lastId, setLastId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Sentinel for Infinite Scroll
  const loaderRef = useRef(null);

  // Sync state with URL params (e.g. from Navbar clicks)
  useEffect(() => {
    const genreParam = searchParams.get('genre');
    if (genreParam) {
      setSelectedGenre(genreParam);
    } else {
      setSelectedGenre('Todos');
    }
  }, [searchParams]);

  const fetchMetadata = async () => {
    const mediaType = type === 'peliculas' ? 'movie' : 'series';
    const res = await fetch(`/api/media/metadata?type=${mediaType}`);
    const json = await res.json();
    if (json.success && json.data) {
      setYears(json.data.years || ['Todos']);
      setCountries(json.data.countries || ['Todos']);
      setGenres(
        json.data.genres?.length ? json.data.genres : ['Todos', ...ALL_GENRES]
      );
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
      const mediaType = type === 'peliculas' ? 'movie' : 'series';
      let url = `/api/media?type=${mediaType}&count=24`;
      
      if (isLoadMore && lastId) {
        url += `&lastId=${lastId}`;
      }
      
      if (selectedGenre !== 'Todos') {
        url += `&genre=${encodeURIComponent(selectedGenre)}`;
      }
      if (selectedYear !== 'Todos') {
        url += `&year=${selectedYear}`;
      }
      if (selectedCountry !== 'Todos') {
        url += `&country=${encodeURIComponent(selectedCountry)}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        const newItems = data.data;
        if (newItems.length < 24) setHasMore(false);
        else setHasMore(true);
        
        setItems(prev => {
          const combined = isLoadMore ? [...prev] : [];
          newItems.forEach(newItem => {
            if (!combined.find(item => item.id === newItem.id)) {
              combined.push(newItem);
            }
          });
          return combined;
        });
        
        if (newItems.length > 0) {
          setLastId(newItems[newItems.length - 1].id);
        }
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

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && hasMore) {
        fetchData(true);
      }
    }, { 
      threshold: 0.1,
      rootMargin: '200px' // Increased margin for smoother loading
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [loading, hasMore, lastId, items]);

  useEffect(() => {
    // We trust the server sorting and filtering now
    setFilteredItems(items);
  }, [items]);

  return (
    <main className="min-h-screen bg-background text-white pb-20">
      <Navbar />
      
      <div className="pt-32 px-4 md:px-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black capitalize tracking-tight">
              {type === 'peliculas' ? 'Películas' : 'Series'}
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
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg outline-none focus:border-primary transition-premium capitalize text-white"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              {genres.map(g => <option key={g} value={g} className="bg-neutral-900 text-white">{g}</option>)}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} /> Año
            </label>
            <select 
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg outline-none focus:border-primary transition-premium text-white"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(y => <option key={y} value={y} className="bg-neutral-900 text-white">{y}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Globe size={12} /> País
            </label>
            <select 
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg outline-none focus:border-primary transition-premium text-white"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {countries.map(c => <option key={c} value={c} className="bg-neutral-900 text-white">{c}</option>)}
            </select>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {filteredItems.map(item => (
              <MovieRow.Card key={item.id} item={item} isGrid />
            ))}
          </div>
        ) : (
          <div className="py-40 text-center text-gray-500 italic">
            No se encontraron resultados con los filtros seleccionados.
          </div>
        )}

        {/* Sentinel for Infinite Scroll - Outside filteredItems to allow finding more data if locally filtered out */}
        {(items.length > 0 || !loading) && hasMore && (
          <div ref={loaderRef} className="h-20 w-full flex items-center justify-center mt-10">
            {loading && (
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-.3s]" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-.5s]" />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
