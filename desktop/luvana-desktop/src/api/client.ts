import { api, type MediaParams } from "@/config/api";

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

export async function fetchPlayer(postId: string) {
  const res = await fetch(api.player(postId));
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch player");
  return data.data;
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
