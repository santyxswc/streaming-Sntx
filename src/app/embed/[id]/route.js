import { embedHeaders, embedVideoId, renderEmbedHtml } from '@/server/embed/youtubeEmbed';

// Página puente para incrustar tráilers desde la app de escritorio (ver youtubeEmbed.js).
export async function GET(request, { params }) {
  const id = embedVideoId((await params).id);
  if (!id) return new Response('No encontrado', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  const { searchParams } = new URL(request.url);
  return new Response(renderEmbedHtml(id, searchParams), { headers: embedHeaders() });
}
