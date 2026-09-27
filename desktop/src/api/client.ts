import { api, type MediaParams, type FeedPageId } from "@/config/api";
import type { MediaItem } from "@/store/useFavoritesStore";

export async function fetchMedia(params: MediaParams = {}) {
  const res = await fetch(api.media(params));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch media");
  return data.data;
}

export async function fetchDetail(type: string, slug: string) {
  const res = await fetch(api.detail(type, slug));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch detail");
  return data.data;
}

export interface Trailer {
  key: string;
  name: string;
  language: string;
  official: boolean;
  type: string;
}

export async function fetchTrailers(type: "movie" | "series", id: string): Promise<Trailer[]> {
  const res = await fetch(api.trailer(type, id));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch trailers");
  return data.data?.trailers || [];
}

export async function fetchSearch(q: string) {
  const res = await fetch(api.search(q));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to search");
  return data.data;
}

export async function fetchRecommendations(itemId: string, type: string) {
  const res = await fetch(api.recommendations(itemId, type));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch recommendations");
  return data.data;
}

export async function fetchEpisodes(showId: string, season: string = "1"): Promise<{ posts?: { _id: string; title?: string; overview?: string; image?: string }[]; seasons?: string[] }> {
  const res = await fetch(api.episodes(showId, season));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch episodes");
  return data.data || { posts: [], seasons: [] };
}

export async function checkAuthLimit() {
  const res = await fetch(api.authLimit(), { method: "POST" });
  const data = await res.json();
  return data.success;
}

export interface FeedSection {
  id: string;
  title: string;
  type: "movie" | "series";
  ranked: boolean;
  items: MediaItem[];
}

export interface Feed {
  featured: MediaItem[];
  sections: FeedSection[];
  generatedAt: string;
}

export async function fetchFeed(page: FeedPageId): Promise<Feed> {
  const res = await fetch(api.feed(page));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch feed");
  return data.data;
}
