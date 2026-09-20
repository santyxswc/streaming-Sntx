import PeliculasClient from './PeliculasClient';

export const metadata = {
  title: "Películas",
  description: "Descubre el mejor cine en HD con Luvana. Estrenos, clásicos y mucho más.",
};

export default function PeliculasPage() {
  return <PeliculasClient />;
}
