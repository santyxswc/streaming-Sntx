import 'server-only';
/**
 * Proveedor de catálogo en memoria para desarrollo/demo.
 * No requiere Firebase, Neon ni ningún servicio externo.
 * Los datos son estáticos (hardcoded) con metadatos reales de películas/series populares.
 */

const DEMO_MOVIES = [
  {
    id: "inception",
    numericId: 27205,
    title: "Origen",
    originalTitle: "Inception",
    overview: "Dom Cobb es un ladrón con una extraña habilidad para entrar a los sueños de la gente y robarles los secretos de sus subconscientes. Su habilidad lo ha convertido en un fugitivo internacional.",
    image: "https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    year: "2010",
    rating: "8.4",
    genres: ["Acción", "Ciencia ficción", "Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=YoHD9XEInc0",
    type: "movie",
    scrapedAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: "the-dark-knight",
    numericId: 155,
    title: "El Caballero de la Noche",
    originalTitle: "The Dark Knight",
    overview: "Batman/Bruce Wayne regresa para continuar su guerra contra el crimen. Con la ayuda del teniente Jim Gordon y del Fiscal del Distrito Harvey Dent, Batman se propone destruir el crimen organizado en Gotham.",
    image: "https://image.tmdb.org/t/p/w500/1hRoyzDtpgMU7Dz4JykxkWMoGp.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg",
    year: "2008",
    rating: "9.0",
    genres: ["Acción", "Crimen", "Drama"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    type: "movie",
    scrapedAt: "2025-01-02T00:00:00.000Z"
  },
  {
    id: "interstellar",
    numericId: 157336,
    title: "Interestelar",
    originalTitle: "Interstellar",
    overview: "En un futuro no muy lejano, la Tierra está al borde de la extinción. Un grupo de astronautas viaja a través de un agujero de gusano en busca de un nuevo hogar para la humanidad.",
    image: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK1DVfjko.jpg",
    year: "2014",
    rating: "8.7",
    genres: ["Aventura", "Drama", "Ciencia ficción"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    type: "movie",
    scrapedAt: "2025-01-03T00:00:00.000Z"
  },
  {
    id: "the-shawshank-redemption",
    numericId: 278,
    title: "Cadena Perpetua",
    originalTitle: "The Shawshank Redemption",
    overview: "Andy Dufresne, un banquero joven y exitoso, es acusado del asesinato de su esposa y de su amante. Tras ser declarado culpable, es condenado a cadena perpetua en la prisión estatal de Shawshank.",
    image: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
    year: "1994",
    rating: "9.3",
    genres: ["Drama", "Crimen"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=6hB3S9d6mu0",
    type: "movie",
    scrapedAt: "2025-01-04T00:00:00.000Z"
  },
  {
    id: "pulp-fiction",
    numericId: 680,
    title: "Tiempos Violentos",
    originalTitle: "Pulp Fiction",
    overview: "Las vidas de dos mafiosos, un boxeador, la esposa de un gánster y un par de bandidos se entrelazan en cuatro historias de violencia y redención.",
    image: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    year: "1994",
    rating: "8.9",
    genres: ["Suspense", "Crimen"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=s7EdQ4FqbhY",
    type: "movie",
    scrapedAt: "2025-01-05T00:00:00.000Z"
  },
  {
    id: "fight-club",
    numericId: 550,
    title: "El Club de la Pelea",
    originalTitle: "Fight Club",
    overview: "Un oficinista insomne, harto de su vida vacía de consumismo, conoce a un peculiar vendedor de jabón llamado Tyler Durden y juntos fundan un club de pelea clandestino.",
    image: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg",
    year: "1999",
    rating: "8.8",
    genres: ["Drama", "Suspense"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=SUXWAEX2jlg",
    type: "movie",
    scrapedAt: "2025-01-06T00:00:00.000Z"
  },
  {
    id: "the-matrix",
    numericId: 603,
    title: "Matrix",
    originalTitle: "The Matrix",
    overview: "Thomas Anderson lleva una doble vida: por el día es programador y por la noche un hacker conocido como Neo. Su vida da un giro cuando entra en contacto con Morpheus.",
    image: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
    year: "1999",
    rating: "8.7",
    genres: ["Acción", "Ciencia ficción"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=vKQi3bBA1y8",
    type: "movie",
    scrapedAt: "2025-01-07T00:00:00.000Z"
  },
  {
    id: "forrest-gump",
    numericId: 13,
    title: "Forrest Gump",
    originalTitle: "Forrest Gump",
    overview: "Forrest Gump es un hombre con poca inteligencia que logra estar presente en los grandes momentos de la historia de los Estados Unidos en la segunda mitad del siglo XX.",
    image: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/7c9UVPPiTPltouxRVY6N9uugaVA.jpg",
    year: "1994",
    rating: "8.8",
    genres: ["Comedia", "Drama", "Romance"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=bLvqoHBptjg",
    type: "movie",
    scrapedAt: "2025-01-08T00:00:00.000Z"
  },
  {
    id: "gladiator",
    numericId: 98,
    title: "Gladiador",
    originalTitle: "Gladiator",
    overview: "Máximo, un poderoso general romano, es traicionado cuando el ambicioso hijo del Emperador asesina a su padre y se apodera del trono. Reducido a la esclavitud, Máximo se convierte en gladiador.",
    image: "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgCLin.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
    year: "2000",
    rating: "8.5",
    genres: ["Acción", "Drama", "Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=owK1qxDselE",
    type: "movie",
    scrapedAt: "2025-01-09T00:00:00.000Z"
  },
  {
    id: "the-godfather",
    numericId: 238,
    title: "El Padrino",
    originalTitle: "The Godfather",
    overview: "Don Vito Corleone es el jefe de una de las cinco familias que rigen la mafia en la ciudad de Nueva York en los años 40. Cuando un poderoso capo enemigo intenta incluirle en el negocio de las drogas, Don Vito se niega.",
    image: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
    year: "1972",
    rating: "9.2",
    genres: ["Drama", "Crimen"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=sY1S34973zA",
    type: "movie",
    scrapedAt: "2025-01-10T00:00:00.000Z"
  },
  {
    id: "parasite",
    numericId: 496243,
    title: "Parásitos",
    originalTitle: "Parasite",
    overview: "Toda la familia de Ki-taek está en el paro. Un día, su hijo mayor, Ki-woo, es recomendado para dar clases a una chica de una familia rica, y esto cambia todo.",
    image: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    year: "2019",
    rating: "8.5",
    genres: ["Comedia", "Suspense", "Drama"],
    country: "KR",
    trailer: "https://www.youtube.com/watch?v=5xH0HfJHsaY",
    type: "movie",
    scrapedAt: "2025-01-11T00:00:00.000Z"
  },
  {
    id: "avengers-endgame",
    numericId: 299534,
    title: "Avengers: Endgame",
    originalTitle: "Avengers: Endgame",
    overview: "Después de los eventos devastadores de Infinity War, los Vengadores restantes deben reunirse una vez más para revertir las acciones de Thanos y restaurar el equilibrio del universo.",
    image: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9SlMiEPR16.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    year: "2019",
    rating: "8.4",
    genres: ["Aventura", "Ciencia ficción", "Acción"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=TcMBFSGVi1c",
    type: "movie",
    scrapedAt: "2025-01-12T00:00:00.000Z"
  },
  {
    id: "joker",
    numericId: 475557,
    title: "Guasón",
    originalTitle: "Joker",
    overview: "Arthur Fleck vive con su madre en Gotham City y trabaja como payaso. Marginado por la sociedad, comienza un descenso hacia la locura que lo transformará en el Guasón.",
    image: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg",
    year: "2019",
    rating: "8.2",
    genres: ["Crimen", "Suspense", "Drama"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=zAGVQLHvwOY",
    type: "movie",
    scrapedAt: "2025-01-13T00:00:00.000Z"
  },
  {
    id: "dune-part-two",
    numericId: 693134,
    title: "Duna: Parte Dos",
    originalTitle: "Dune: Part Two",
    overview: "Paul Atreides se une a los Fremen en un viaje espiritual y bélico para vengar a su familia, mientras intenta evitar el terrible futuro que solo él puede prever.",
    image: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    year: "2024",
    rating: "8.2",
    genres: ["Ciencia ficción", "Aventura", "Acción"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=Way9Dexny3w",
    type: "movie",
    scrapedAt: "2025-06-01T00:00:00.000Z"
  },
  {
    id: "oppenheimer",
    numericId: 872585,
    title: "Oppenheimer",
    originalTitle: "Oppenheimer",
    overview: "La historia del físico J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica durante la Segunda Guerra Mundial.",
    image: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    year: "2023",
    rating: "8.1",
    genres: ["Drama", "Historia"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    type: "movie",
    scrapedAt: "2025-06-02T00:00:00.000Z"
  },
  {
    id: "spider-man-across-the-spider-verse",
    numericId: 569094,
    title: "Spider-Man: A Través del Spider-Verso",
    originalTitle: "Spider-Man: Across the Spider-Verse",
    overview: "Miles Morales regresa para la nueva entrega de la saga Spider-Verse. Tras reunirse con Gwen Stacy, viaja a través del Multiverso y se encuentra con un equipo de Spider-People.",
    image: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    year: "2023",
    rating: "8.4",
    genres: ["Animación", "Acción", "Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=cqGjhVJWtEg",
    type: "movie",
    scrapedAt: "2025-06-03T00:00:00.000Z"
  },
];

const DEMO_SERIES = [
  {
    id: "breaking-bad",
    numericId: 1396,
    title: "Breaking Bad",
    originalTitle: "Breaking Bad",
    overview: "Walter White, un profesor de química de instituto, se asocia con un ex alumno para fabricar y vender metanfetamina tras ser diagnosticado con cáncer de pulmón.",
    image: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    year: "2008",
    rating: "9.5",
    genres: ["Drama", "Crimen", "Suspense"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=HhesaQXLuRY",
    type: "series",
    scrapedAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: "game-of-thrones",
    numericId: 1399,
    title: "Juego de Tronos",
    originalTitle: "Game of Thrones",
    overview: "Siete familias nobles luchan por el control del mítico continente de Poniente. Conflictos, traiciones y alianzas se suceden en una épica batalla por el Trono de Hierro.",
    image: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
    year: "2011",
    rating: "9.3",
    genres: ["Sci-Fi & Fantasy", "Drama", "Acción & Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=KPLWWIOCOOQ",
    type: "series",
    scrapedAt: "2025-01-02T00:00:00.000Z"
  },
  {
    id: "stranger-things",
    numericId: 66732,
    title: "Stranger Things",
    originalTitle: "Stranger Things",
    overview: "Cuando un niño desaparece, sus amigos, su madre y un sheriff local se enfrentan a fuerzas sobrenaturales para traerlo de vuelta de una dimensión alternativa.",
    image: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/56v2KjBlYj4sskIh6WyDgemT7b6.jpg",
    year: "2016",
    rating: "8.7",
    genres: ["Drama", "Misterio", "Ciencia ficción"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=b9EkMc79ZSU",
    type: "series",
    scrapedAt: "2025-01-03T00:00:00.000Z"
  },
  {
    id: "the-last-of-us",
    numericId: 100088,
    title: "The Last of Us",
    originalTitle: "The Last of Us",
    overview: "Veinte años después de la destrucción de la civilización moderna, Joel, un curtido superviviente, es contratado para sacar de contrabando a Ellie, una chica de 14 años.",
    image: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    year: "2023",
    rating: "8.8",
    genres: ["Drama", "Acción & Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=uLtkt8BonwM",
    type: "series",
    scrapedAt: "2025-06-01T00:00:00.000Z"
  },
  {
    id: "house-of-the-dragon",
    numericId: 94997,
    title: "La Casa del Dragón",
    originalTitle: "House of the Dragon",
    overview: "La precuela de Juego de Tronos. Ambientada 200 años antes de los acontecimientos, narra la historia de la Casa Targaryen y la guerra civil conocida como la Danza de los Dragones.",
    image: "https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg",
    year: "2022",
    rating: "8.4",
    genres: ["Sci-Fi & Fantasy", "Drama", "Acción & Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=DotnJ7tTA34",
    type: "series",
    scrapedAt: "2025-06-02T00:00:00.000Z"
  },
  {
    id: "wednesday",
    numericId: 119051,
    title: "Merlina",
    originalTitle: "Wednesday",
    overview: "La inteligente y sarcástica Wednesday Addams investiga una serie de asesinatos que aterroriza a la comunidad local mientras navega nuevas relaciones en la Academia Nunca Más.",
    image: "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/iHSwvRVsNBEW1T8YtOoHYREzgTF.jpg",
    year: "2022",
    rating: "8.1",
    genres: ["Comedia", "Misterio", "Ciencia ficción"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=Di310WS8zLk",
    type: "series",
    scrapedAt: "2025-06-03T00:00:00.000Z"
  },
  {
    id: "the-mandalorian",
    numericId: 82856,
    title: "The Mandalorian",
    originalTitle: "The Mandalorian",
    overview: "Después de la caída del Imperio, un cazarrecompensas solitario se abre camino por los rincones más lejanos de la galaxia, lejos de la autoridad de la Nueva República.",
    image: "https://image.tmdb.org/t/p/w500/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9ijMGlJKqcslswWUzTEwScm82Gs.jpg",
    year: "2019",
    rating: "8.5",
    genres: ["Sci-Fi & Fantasy", "Acción & Aventura", "Drama"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=aOC8E8z_ifw",
    type: "series",
    scrapedAt: "2025-01-04T00:00:00.000Z"
  },
  {
    id: "dark",
    numericId: 70523,
    title: "Dark",
    originalTitle: "Dark",
    overview: "Cuatro familias se embarcan en una búsqueda frenética para descubrir la verdad sobre una conspiración que abarca tres generaciones en una pequeña ciudad alemana.",
    image: "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/75GVFrNUcFiLcIadpGDi6aPJkIL.jpg",
    year: "2017",
    rating: "8.8",
    genres: ["Drama", "Misterio", "Ciencia ficción"],
    country: "DE",
    trailer: "https://www.youtube.com/watch?v=rrwycJ08PSA",
    type: "series",
    scrapedAt: "2025-01-05T00:00:00.000Z"
  },
  {
    id: "squid-game",
    numericId: 93405,
    title: "El Juego del Calamar",
    originalTitle: "Squid Game",
    overview: "Cientos de jugadores con problemas económicos aceptan una extraña invitación para competir en juegos infantiles. Una fortuna tentadora les espera, pero lo que está en juego es mortal.",
    image: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/oaGvjB0DvdhXhOAuADfHb261ZHa.jpg",
    year: "2021",
    rating: "7.8",
    genres: ["Acción & Aventura", "Misterio", "Drama"],
    country: "KR",
    trailer: "https://www.youtube.com/watch?v=oqxAJKy0ii4",
    type: "series",
    scrapedAt: "2025-01-06T00:00:00.000Z"
  },
  {
    id: "the-witcher",
    numericId: 71912,
    title: "The Witcher",
    originalTitle: "The Witcher",
    overview: "El brujo Geralt de Rivia, un cazador de monstruos mutante, lucha por encontrar su lugar en un mundo donde las personas a menudo son más malvadas que las bestias.",
    image: "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0GlqHrcdiJq.jpg",
    year: "2019",
    rating: "8.0",
    genres: ["Sci-Fi & Fantasy", "Drama", "Acción & Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=ndl1W4ltcmg",
    type: "series",
    scrapedAt: "2025-01-07T00:00:00.000Z"
  },
  {
    id: "peaky-blinders",
    numericId: 60574,
    title: "Peaky Blinders",
    originalTitle: "Peaky Blinders",
    overview: "En 1919, la familia Shelby, una pandilla de gánsteres de Birmingham, empieza a abrirse camino en el crimen organizado tras la Primera Guerra Mundial.",
    image: "https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/wiE9doxiLwq3WCGPBBn3xEMsVAm.jpg",
    year: "2013",
    rating: "8.8",
    genres: ["Drama", "Crimen"],
    country: "GB",
    trailer: "https://www.youtube.com/watch?v=oVzVdvGIC7U",
    type: "series",
    scrapedAt: "2025-01-08T00:00:00.000Z"
  },
  {
    id: "arcane",
    numericId: 94605,
    title: "Arcane",
    originalTitle: "Arcane",
    overview: "En el utópico Piltóver y la oprimida Zaun, dos hermanas luchan en bandos opuestos de una guerra entre tecnologías mágicas y convicciones enfrentadas.",
    image: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg",
    year: "2021",
    rating: "9.0",
    genres: ["Animación", "Sci-Fi & Fantasy", "Acción & Aventura"],
    country: "US",
    trailer: "https://www.youtube.com/watch?v=fXmAurh012s",
    type: "series",
    scrapedAt: "2025-06-04T00:00:00.000Z"
  },
];

const ALL_ITEMS = [...DEMO_MOVIES, ...DEMO_SERIES];

// --- Helpers ---

function normalizeForSearch(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sortItems(items, sortField, sortOrder) {
  const dir = sortOrder === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortField === "yearRating") {
      const yearDiff = (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      if (yearDiff !== 0) return yearDiff * dir;
      return ((parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)) * dir;
    }
    if (sortField === "rating") {
      return ((parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)) * dir;
    }
    if (sortField === "year") {
      return ((parseInt(b.year) || 0) - (parseInt(a.year) || 0)) * dir;
    }
    // scrapedAt
    return (new Date(b.scrapedAt) - new Date(a.scrapedAt)) * dir;
  });
}

// --- Exported API (misma firma que firebaseCatalog.js) ---

export const saveMediaBatch = async () => {
  // No-op en modo demo
};

export const getMediaSorted = async (
  type = "movie",
  sortField = "scrapedAt",
  sortOrder = "desc",
  count = 20,
  _lastDocId = null,
  genre = null,
  year = null,
  country = null
) => {
  let items =
    type === "series" || type === "tvshows" || type === "anime"
      ? [...DEMO_SERIES]
      : [...DEMO_MOVIES];

  if (genre && genre !== "Todos") {
    items = items.filter((i) => i.genres.includes(genre));
  }
  if (year && year !== "Todos" && year !== "") {
    items = items.filter((i) => i.year === String(year));
  }
  if (country && country !== "Todos") {
    items = items.filter((i) => i.country === country);
  }

  items = sortItems(items, sortField, sortOrder);
  return items.slice(0, count);
};

export const getLatestMedia = async (type = "movie", count = 20) => {
  return getMediaSorted(type, "scrapedAt", "desc", count);
};

export const getFilterMetadata = async (type) => {
  const items = type === "series" ? DEMO_SERIES : DEMO_MOVIES;
  const years = [
    "Todos",
    ...new Set(items.map((i) => i.year).filter(Boolean)),
  ].sort((a, b) => (a === "Todos" ? -1 : b === "Todos" ? 1 : b - a));
  const countries = [
    "Todos",
    ...new Set(items.map((i) => i.country).filter((c) => c && c !== "N/A")),
  ].sort((a, b) => (a === "Todos" ? -1 : b === "Todos" ? 1 : a.localeCompare(b)));
  return { years, countries };
};

export const updateFilterMetadata = async () => {
  // No-op en modo demo
};

export const getMediaBySlug = async (type, slug) => {
  const items =
    type === "series" || type === "tvshows" || type === "anime"
      ? DEMO_SERIES
      : DEMO_MOVIES;
  return items.find((i) => i.id === slug) || null;
};

export const getMediaByIds = async (type, ids) => {
  const items = type === "series" ? DEMO_SERIES : DEMO_MOVIES;
  const wanted = new Set(ids);
  return items.filter((i) => wanted.has(i.id));
};

export const searchCatalog = async (qStr) => {
  const searchNorm = normalizeForSearch(qStr);
  const words = searchNorm.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const scored = [];
  for (const item of ALL_ITEMS) {
    const title = normalizeForSearch(item.title);
    const originalTitle = normalizeForSearch(item.originalTitle);
    const overview = normalizeForSearch(item.overview);
    const combined = `${title} ${originalTitle} ${overview}`;

    const allMatch = words.every((w) => combined.includes(w));
    if (!allMatch) continue;

    let score = 0;
    if (title.includes(searchNorm)) score += 100;
    if (originalTitle.includes(searchNorm)) score += 100;
    words.forEach((w) => {
      if (title.includes(w)) score += 20;
      else if (originalTitle.includes(w)) score += 15;
      else if (overview.includes(w)) score += 5;
    });
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 30).map(({ item }) => item);
};

export const getRecommendationsForItem = async (item, count = 60) => {
  if (!item) return [];
  const items = item.type === "series" ? DEMO_SERIES : DEMO_MOVIES;
  return items.filter((i) => i.id !== item.id).slice(0, count);
};

// --- Episodios demo (sin fuente externa) ---

const DEMO_EPISODES_PER_SEASON = 6;

function buildDemoEpisodeId(numericId, season, ep) {
  return `demo-${numericId}-s${season}-e${ep}`;
}

export const getDemoEpisodes = async (showId, season = "1") => {
  const numeric = Number(showId);
  const item = ALL_ITEMS.find((i) => i.numericId === numeric);
  if (!item) return { posts: [], seasons: [] };

  const posts = Array.from({ length: DEMO_EPISODES_PER_SEASON }, (_, idx) => {
    const epNum = idx + 1;
    return {
      _id: buildDemoEpisodeId(item.numericId, season, epNum),
      title: `Episodio ${epNum}`,
      overview: `Episodio de demostración ${epNum} de la temporada ${season}.`,
      image: item.image,
    };
  });

  return { posts, seasons: ["1"] };
};

export const findMediaForAiLookup = async (_collectionName, titlesToTry) => {
  for (const title of titlesToTry) {
    if (!title) continue;
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ /g, "-")
      .replace(/[^\w-]/g, "");
    const found = ALL_ITEMS.find((i) => i.id === slug);
    if (found) return { winner: found, winnerId: found.id };
  }

  for (const title of titlesToTry) {
    if (!title) continue;
    const found = ALL_ITEMS.find(
      (i) => i.title === title || i.originalTitle === title
    );
    if (found) return { winner: found, winnerId: found.id };
  }

  return { winner: null, winnerId: null };
};
