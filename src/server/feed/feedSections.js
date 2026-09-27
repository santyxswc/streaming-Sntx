import 'server-only';

/**
 * Definición declarativa de las filas de cada página. Añadir o cambiar una
 * fila no toca la lógica del feed (feedService): solo esta configuración.
 *
 * `query` describe el ranking de popularidad en TMDB que decide qué es
 * "mainstream"; el feed luego se queda solo con títulos que existen en el
 * catálogo y que tienen tráiler. `fallbackSort` se usa si TMDB no está
 * configurado (modo demo), ordenando el propio catálogo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDate = (date) => date.toISOString().slice(0, 10);
const daysFrom = (now, days) => isoDate(new Date(now.getTime() + days * DAY_MS));

// Géneros TMDB de TV que no son ficción "maratoneable": noticias, talk shows, reality.
const NON_FICTION_TV = '10763|10767|10764';

const popularMovies = (params = {}) => ({
  path: '/discover/movie',
  params: { sort_by: 'popularity.desc', 'vote_count.gte': '500', ...params },
});

const popularSeries = (params = {}) => ({
  path: '/discover/tv',
  params: {
    sort_by: 'popularity.desc',
    'vote_count.gte': '300',
    without_genres: NON_FICTION_TV,
    ...params,
  },
});

// Las filas por género comparten muchos títulos con "Populares": tras quitar
// repetidos necesitan más candidatos para llenarse.
const GENRE_ROW_PAGES = 5;

const ACCLAIMED_MOVIES = {
  path: '/discover/movie',
  params: { sort_by: 'vote_average.desc', 'vote_count.gte': '5000' },
};

const ACCLAIMED_SERIES = {
  path: '/discover/tv',
  params: { sort_by: 'vote_average.desc', 'vote_count.gte': '3000', without_genres: NON_FICTION_TV },
};

export const FEED_PAGES = {
  home: {
    featured: { from: ['trending-movies', 'binge-series'], limit: 10 },
    sections: [
      {
        id: 'trending-movies',
        title: 'Tendencias ahora',
        type: 'movie',
        ranked: true,
        query: { path: '/trending/movie/week' },
        fallbackSort: 'scrapedAt',
      },
      {
        id: 'acclaimed-movies',
        title: 'Películas aclamadas por la crítica',
        type: 'movie',
        query: ACCLAIMED_MOVIES,
        fallbackSort: 'rating',
      },
      {
        id: 'binge-series',
        title: 'Series para maratonear',
        type: 'series',
        query: popularSeries({ 'vote_count.gte': '500' }),
        fallbackSort: 'scrapedAt',
      },
      {
        id: 'new-movies',
        title: 'Estrenos recientes',
        type: 'movie',
        query: (now) => ({
          path: '/discover/movie',
          params: {
            sort_by: 'popularity.desc',
            'vote_count.gte': '100',
            'primary_release_date.gte': daysFrom(now, -120),
            'primary_release_date.lte': daysFrom(now, 0),
          },
        }),
        fallbackSort: 'year',
      },
      {
        id: 'acclaimed-series',
        title: 'Series que no te puedes perder',
        type: 'series',
        query: ACCLAIMED_SERIES,
        fallbackSort: 'rating',
      },
      {
        id: 'new-seasons',
        title: 'Nuevas temporadas',
        type: 'series',
        query: (now) =>
          popularSeries({
            'vote_count.gte': '200',
            'air_date.gte': daysFrom(now, -30),
            'air_date.lte': daysFrom(now, 7),
          }),
        fallbackSort: 'year',
      },
    ],
  },

  movies: {
    featured: { from: ['popular-movies'], limit: 10 },
    sections: [
      { id: 'popular-movies', title: 'Populares', type: 'movie', ranked: true, query: popularMovies(), fallbackSort: 'scrapedAt' },
      { id: 'action-movies', title: 'Acción y aventura', type: 'movie', query: popularMovies({ with_genres: '28|12' }), fallbackSort: 'rating', pages: GENRE_ROW_PAGES },
      { id: 'comedy-movies', title: 'Comedia', type: 'movie', query: popularMovies({ with_genres: '35' }), fallbackSort: 'year', pages: GENRE_ROW_PAGES },
      { id: 'thriller-movies', title: 'Terror y suspenso', type: 'movie', query: popularMovies({ with_genres: '27|53' }), fallbackSort: 'rating', pages: GENRE_ROW_PAGES },
      { id: 'scifi-movies', title: 'Ciencia ficción y fantasía', type: 'movie', query: popularMovies({ with_genres: '878|14' }), fallbackSort: 'year', pages: GENRE_ROW_PAGES },
      { id: 'family-movies', title: 'Animación y familia', type: 'movie', query: popularMovies({ with_genres: '16|10751' }), fallbackSort: 'rating', pages: GENRE_ROW_PAGES },
      { id: 'acclaimed-movies', title: 'Aclamadas por la crítica', type: 'movie', query: ACCLAIMED_MOVIES, fallbackSort: 'rating' },
    ],
  },

  series: {
    featured: { from: ['popular-series'], limit: 10 },
    sections: [
      { id: 'popular-series', title: 'Populares', type: 'series', ranked: true, query: popularSeries(), fallbackSort: 'scrapedAt' },
      { id: 'drama-series', title: 'Drama', type: 'series', query: popularSeries({ with_genres: '18' }), fallbackSort: 'rating', pages: GENRE_ROW_PAGES },
      { id: 'comedy-series', title: 'Comedia', type: 'series', query: popularSeries({ with_genres: '35' }), fallbackSort: 'year', pages: GENRE_ROW_PAGES },
      { id: 'crime-series', title: 'Crimen y misterio', type: 'series', query: popularSeries({ with_genres: '80|9648' }), fallbackSort: 'rating', pages: GENRE_ROW_PAGES },
      { id: 'scifi-series', title: 'Ciencia ficción y fantasía', type: 'series', query: popularSeries({ with_genres: '10765' }), fallbackSort: 'year', pages: GENRE_ROW_PAGES },
      { id: 'animation-series', title: 'Animación', type: 'series', query: popularSeries({ with_genres: '16' }), fallbackSort: 'rating', pages: GENRE_ROW_PAGES },
      { id: 'acclaimed-series', title: 'Aclamadas por la crítica', type: 'series', query: ACCLAIMED_SERIES, fallbackSort: 'rating' },
    ],
  },
};
