const PATH_BY_TYPE = { movie: 'peliculas', series: 'series', anime: 'anime' };

/** Ruta de la ficha de un título: /peliculas/:id, /series/:id o /anime/:id. */
export function detailPath(item) {
  return `/${PATH_BY_TYPE[item.type] || 'series'}/${item.id}`;
}

/** Primer segmento válido de la ficha de un título (el de `detailPath`). */
export function isDetailSegment(segment) {
  return Object.values(PATH_BY_TYPE).includes(segment);
}
