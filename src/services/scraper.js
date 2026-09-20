import axios from 'axios';
import { GENRE_MAP } from '@/lib/genreMap';

const SOURCE_URL = (process.env.SOURCE_URL || process.env.SCRAPER_SOURCE_URL || 'https://lamovie.org').replace(/\/+$/, '');
const API_BASE = `${SOURCE_URL}/wp-api/v1/listing`;

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': `${SOURCE_URL}/`,
};

const mapPostToMedia = (post, type) => {
  const formatUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${SOURCE_URL}/wp-content/uploads${path}`;
  };

  return {
    id: post.slug || '',
    numericId: post._id || 0,
    title: post.title || 'Untitled',
    originalTitle: post.original_title || post.title || 'Untitled',
    overview: post.overview || '',
    href: `${SOURCE_URL}/${type === 'movie' ? 'peliculas' : type}/${post.slug}`,
    image: formatUrl(post.images.poster),
    backdrop: formatUrl(post.images.backdrop),
    year: post.release_date ? String(post.release_date.split('-')[0]) : '',
    rating: post.rating || '0.0',
    genres: post.genres ? post.genres.map(id => GENRE_MAP[id] || GENRE_MAP[id.toString()] || '').filter(Boolean) : [],
    country: post.country || 'N/A',
    trailer: post.trailer || '',
    type,
    scrapedAt: new Date().toISOString()
  };
};

export const scrapeMovies = async (page = 1) => {
  try {
    const url = `${API_BASE}/movies?filter=%7B%7D&page=${page}&orderBy=latest&order=DESC&postType=movies&postsPerPage=50`;
    const { data } = await axios.get(url, { headers: COMMON_HEADERS });
    if (data.error) throw new Error(data.message || 'API Error');
    
    const pagination = data.data.pagination || {};
    const totalPages = pagination.last_page || 1;
    
    return {
      items: data.data.posts.map(post => mapPostToMedia(post, 'movie')),
      totalPages
    };
  } catch (error) {
    console.error('API Movies Error:', error.message);
    throw error;
  }
};

export const scrapeSeries = async (page = 1) => {
  try {
    const url = `${API_BASE}/tvshows?filter=%7B%7D&page=${page}&orderBy=latest&order=DESC&postType=tvshows&postsPerPage=50`;
    const { data } = await axios.get(url, { headers: COMMON_HEADERS });
    if (data.error) throw new Error(data.message || 'API Error');
    
    const pagination = data.data.pagination || {};
    const totalPages = pagination.last_page || 1;
    
    return {
      items: data.data.posts.map(post => mapPostToMedia(post, 'series')),
      totalPages
    };
  } catch (error) {
    console.error('API Series Error:', error.message);
    throw error;
  }
};
