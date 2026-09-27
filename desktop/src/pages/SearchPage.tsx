import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MovieRow from "@/components/MovieRow";
import PageLoader from "@/components/PageLoader";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/config/api";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");
  const [results, setResults] = useState<Array<{ id: string; [key: string]: unknown }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(api.search(query));
        const data = await res.json();
        if (data.success) setResults(data.data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  return (
    <div className="pt-32 px-4 md:px-12 pb-20">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <Search className="text-[var(--primary)] w-8 h-8 md:w-10 md:h-10" />
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Resultados</h1>
        </div>
        <p className="text-gray-400 text-lg">
          {loading ? "Buscando..." : `Se han encontrado ${results.length} resultados para "${query}"`}
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-40">
          <PageLoader />
        </div>
      ) : results.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8"
        >
          {results.map((item) => (
            <div key={item.id} className="w-full">
              <MovieRow.Card item={item} isGrid />
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 text-gray-500">
          <Search size={64} className="mb-4 opacity-20" />
          <p className="text-xl">No hay coincidencias para tu búsqueda.</p>
          <p className="text-sm mt-2">Intenta con otras palabras clave o explora las categorías en el menú.</p>
        </div>
      )}
    </div>
  );
}
