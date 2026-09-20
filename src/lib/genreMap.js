export const GENRE_MAP = {
  "17": "Drama",
  "18": "Comedia",
  "33": "Suspense",
  "32": "Acción",
  "520": "Animación",
  "96": "Terror",
  "130": "Aventura",
  "180": "Crimen",
  "115": "Romance",
  "398": "Familia",
  "97": "Misterio",
  "131": "Ciencia ficción",
  "229": "Fantasía",
  "704": "Sci-Fi & Fantasy",
  "705": "Acción & Aventura",
  "165": "Historia",
  "164": "Documental",
  "8": "Música",
  "3056": "Bélica",
  "6787": "Película de TV",
  "674": "Western",
  "703": "Kids",
  "786": "War & Politics",
  "12485": "Reality",
  "19824": "Soap"
};

/** Lista de géneros derivada de GENRE_MAP (fuente única de verdad). */
export const ALL_GENRES = [...new Set(Object.values(GENRE_MAP))].sort();
