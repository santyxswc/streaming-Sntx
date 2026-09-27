const API_BASE = import.meta.env.VITE_API_URL || "https://streaming-sntx.vercel.app";

export type FeedPageId = "home" | "movies" | "series";

export interface MediaParams {
  type?: "movie" | "series";
  count?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  lastId?: string;
  genre?: string;
  year?: string;
  country?: string;
}

export const api = {
  base: API_BASE,

  metadata: (type: "movie" | "series") =>
    `${API_BASE}/api/media/metadata?type=${type}`,

  media: (params: MediaParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set("type", params.type);
    if (params.count) searchParams.set("count", String(params.count));
    if (params.sortField) searchParams.set("sortField", params.sortField);
    if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    if (params.lastId) searchParams.set("lastId", params.lastId);
    if (params.genre) searchParams.set("genre", params.genre);
    if (params.year) searchParams.set("year", params.year);
    if (params.country) searchParams.set("country", params.country);
    return `${API_BASE}/api/media?${searchParams.toString()}`;
  },

  feed: (page: FeedPageId) => `${API_BASE}/api/feed/${page}`,

  detail: (type: string, slug: string) =>
    `${API_BASE}/api/media/detail?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`,

  trailer: (type: "movie" | "series", id: string) =>
    `${API_BASE}/api/media/trailer?type=${type}&id=${encodeURIComponent(id)}`,

  search: (q: string) =>
    `${API_BASE}/api/media/search?q=${encodeURIComponent(q)}`,

  recommendations: (itemId: string, type: string) =>
    `${API_BASE}/api/media/recommendations?itemId=${encodeURIComponent(itemId)}&type=${encodeURIComponent(type)}`,

  episodes: (showId: string, season: string = "1") =>
    `${API_BASE}/api/media/episodes?showId=${encodeURIComponent(showId)}&season=${encodeURIComponent(season)}`,

  authLimit: () => `${API_BASE}/api/auth/limit`,
};
