import { describe, it, expect, vi } from 'vitest';

vi.mock('axios', () => ({
  default: { post: vi.fn(async () => ({ data: { choices: [{ message: { content: '{}' } }] } })) },
}));

const axios = (await import('axios')).default;
const { chatCompletion } = await import('@/server/integrations/deepseek');

describe('chatCompletion', () => {
  it('define timeout y tope de tokens para acotar duración y coste', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    await chatCompletion([{ role: 'user', content: 'hola' }]);
    const [, payload, config] = axios.post.mock.calls[0];
    expect(config.timeout).toBeGreaterThan(0);
    expect(payload.max_tokens).toBeGreaterThan(0);
  });
});
