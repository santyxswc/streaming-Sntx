export type MediaType = "movie" | "series";

/** Las rutas de detalle son `/peliculas/:slug` y `/series/:slug` (no hay parámetro `:type`). */
export function mediaTypeFromPath(pathname: string): MediaType | null {
  if (pathname.startsWith("/peliculas/")) return "movie";
  if (pathname.startsWith("/series/")) return "series";
  return null;
}
