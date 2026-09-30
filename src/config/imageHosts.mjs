// Dominios desde los que la app carga imágenes con next/image.
// Hoy las imágenes van `unoptimized` (se sirven directas), pero si algún día se
// activa el optimizador de Next, `hostname: '**'` lo convertiría en un proxy
// abierto: cualquiera podría pedirle imágenes de cualquier servidor.
export const IMAGE_HOSTS = [
  'image.tmdb.org', // pósters y fondos (TMDB)
  'static.tvmaze.com', // imágenes de series (script ingest-tvmaze)
  'cdn.cafecito.app', // botón de donaciones
];

export const imageRemotePatterns = IMAGE_HOSTS.map((hostname) => ({
  protocol: 'https',
  hostname,
}));
