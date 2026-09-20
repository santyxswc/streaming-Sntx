/**
 * Backend de chat: neon (PostgreSQL) o firebase (Firestore), vía CHAT_PROVIDER.
 * @returns {'neon'|'firebase'}
 */
export function getChatProvider() {
  const p = (process.env.CHAT_PROVIDER || 'neon').toLowerCase();
  return p === 'firebase' ? 'firebase' : 'neon';
}
