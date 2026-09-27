import ListingClient from './ListingClient';

export async function generateMetadata({ params }) {
  const { type } = await params;
  const isMovie = type === 'peliculas';
  const title = isMovie ? 'Explorar Películas' : 'Explorar Series';
  const description = isMovie 
    ? 'Explora el catálogo de películas y mira sus tráilers oficiales en streaming-Sntx.'
    : 'Explora el catálogo de series: tráilers, temporadas y episodios.';

  return {
    title,
    description,
    openGraph: {
      title: `${title} | streaming-Sntx`,
      description,
    }
  };
}

export default function ListingPage() {
  return <ListingClient />;
}
