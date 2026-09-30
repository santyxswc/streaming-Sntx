import 'server-only';
import axios from 'axios';
import { logger } from '@/server/observability/logger';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Sends a message to DeepSeek and returns the response.
 * @param {Array} messages - Array of message objects { role: 'user'|'system', content: string }
 * @param {Object} options - API options (temperature, max_tokens, etc.)
 */
export const chatCompletion = async (messages, options = {}) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    logger.error('deepseek.key_missing');
    throw new Error('DEEPSEEK_API_KEY is not defined in environment variables. Please restart your Next.js server.');
  }

  try {
    const response = await axios.post(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      // La respuesta es un JSON corto: acotar la salida limita el coste por llamada.
      max_tokens: 400,
      response_format: { type: 'json_object' },
      ...options
    }, {
      // Sin timeout, una respuesta colgada retiene la función hasta su límite de duración.
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('deepseek.request_failed', { err: error });
    throw new Error('Failed to connect to DeepSeek AI. Check your API key and connection.');
  }
};
