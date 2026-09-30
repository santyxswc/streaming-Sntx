import { NextResponse } from 'next/server';
import { findMediaForAiLookup } from '@/server/catalog/catalogRepository';
import { chatCompletion } from '@/server/integrations/deepseek';
import { rateLimit } from '@/server/http/rateLimit';
import { parseSearchQuery, parseAiPrediction } from '@/lib/aiSearch';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Apply Rate Limit: 5 requests per minute for AI
    const limitResponse = await rateLimit(req, {
      limit: 5,
      windowMs: 60000,
      id: 'ai-search',
    });
    if (limitResponse) return limitResponse;

    let userQuery;
    try {
      const body = await req.json();
      userQuery = parseSearchQuery(body?.query);
    } catch (e) {
      // JSON ilegible o consulta inválida: 400 con un mensaje que sí es seguro mostrar.
      return NextResponse.json(
        { success: false, error: e.status === 400 ? e.message : 'Solicitud inválida' },
        { status: 400 }
      );
    }

    // Check if DeepSeek is configured
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn('[ai/search] DEEPSEEK_API_KEY no configurada: búsqueda IA deshabilitada.');
      return NextResponse.json({
        success: true,
        // Mensaje para el visitante; la configuración faltante se registra en el servidor.
        message: 'El asistente IA no está disponible en este momento. Mientras tanto, usa el buscador del menú.',
        data: null
      });
    }

    // Phase 1: AI Identification (Using AI knowledge first)
    const identificationPrompt = [
      {
        role: 'system',
        content: `Eres el Asistente Inteligente de streaming-Sntx. Tu misión es identificar qué película o serie está describiendo el usuario.
        
        Sigue estas reglas estrictas:
        1. Identifica el título en ESPAÑOL y el título ORIGINAL (INGLÉS/OTROS).
        2. Determina si es una película o una serie.
        3. Identifica el año de estreno.
        4. Crea una breve "explicación" de por qué crees que es esta producción.
        
        Responde exclusivamente en JSON con este formato:
        {
          "titleSpanish": "Título en español",
          "titleOriginal": "Original Title / English Title",
          "type": "movie" | "series",
          "year": "YYYY",
          "explanation": "Breve mensaje al usuario: 'Parece que hablas de X, una película donde...'"
        }`
      },
      {
        role: 'user',
        content: userQuery
      }
    ];

    const aiResponseRaw = await chatCompletion(identificationPrompt);
    const aiPrediction = parseAiPrediction(aiResponseRaw);

    if (!aiPrediction) {
      // El modelo respondió algo inutilizable: fallo del proveedor, no del cliente.
      console.error('[ai/search] Respuesta del modelo no utilizable');
      return NextResponse.json(
        { success: false, error: 'No se pudo completar la búsqueda con IA' },
        { status: 502 }
      );
    }

    const titlesToTry = [aiPrediction.titleSpanish, aiPrediction.titleOriginal].filter(Boolean);

    const collectionName = aiPrediction.type === 'movie' ? 'movies' : 'series';
    const typePath = aiPrediction.type === 'movie' ? 'peliculas' : 'series';

    const { winner, winnerId } = await findMediaForAiLookup(collectionName, titlesToTry);

    if (winner) {
      return NextResponse.json({
        success: true,
        data: {
          title: winner.title,
          image: winner.image,
          overview: winner.overview,
          link: `/${typePath}/${winnerId}`,
          explanation: aiPrediction.explanation,
          id: winnerId,
          type: winner.type
        }
      });
    }

    // Phase 3: Not Found in our DB
    const displayTitle = aiPrediction.titleSpanish || aiPrediction.titleOriginal;
    return NextResponse.json({ 
      success: true, 
      message: `¡Identifiqué lo que buscas! Parece que es "${displayTitle}"${aiPrediction.year ? ` (${aiPrediction.year})` : ''}. Lamentablemente aún no la tenemos disponible en nuestro catálogo, pero he tomado nota y la agregaremos muy pronto para ti.`,
      data: null 
    });

  } catch (error) {
    console.error('AI Search Error:', error);
    return NextResponse.json({ success: false, error: 'No se pudo completar la búsqueda con IA' }, { status: 500 });
  }
}
