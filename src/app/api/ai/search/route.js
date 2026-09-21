import { NextResponse } from 'next/server';
import { findMediaForAiLookup } from '@/services/db';
import { chatCompletion } from '@/lib/deepseek';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Apply Rate Limit: 5 requests per minute for AI
    const limitResponse = rateLimit(req, {
      limit: 5,
      windowMs: 60000,
      id: 'ai-search',
    });
    if (limitResponse) return limitResponse;

    const { query: userQuery } = await req.json();

    if (!userQuery) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    // Check if DeepSeek is configured
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({
        success: true,
        message: 'El asistente IA no está configurado en este momento. Para habilitarlo, define DEEPSEEK_API_KEY en tu archivo .env.local. Puedes obtener una API key en https://platform.deepseek.com',
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
    const aiPrediction = JSON.parse(aiResponseRaw);

    if (!aiPrediction.titleSpanish && !aiPrediction.titleOriginal) {
        throw new Error("La IA no pudo identificar ninguna producción.");
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
      message: `¡Identifiqué lo que buscas! Parece que es "${displayTitle}" (${aiPrediction.year}). Lamentablemente aún no la tenemos disponible en nuestro catálogo, pero he tomado nota y la agregaremos muy pronto para ti.`,
      data: null 
    });

  } catch (error) {
    console.error('AI Search Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
