import ListingClient from './ListingClient';

export async function generateMetadata({ params }) {
  const { type } = await params;
  const isMovie = type === 'peliculas';
  const title = isMovie ? 'Explorar Películas' : 'Explorar Series';
  const description = isMovie 
    ? 'Descubre las mejores películas en HD. Acción del mejor nivel en streaming-Sntx.'
    : 'Todas tus series favoritas en un solo lugar. Temporadas completas y estrenos.';

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
