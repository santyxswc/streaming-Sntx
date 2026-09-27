import 'server-only';
/**
 * Reserva para migración a Firestore (mismas firmas que neonChat).
 * Activar con CHAT_PROVIDER=firebase.
 */
export async function mediaExists() {
  throw new Error('CHAT_PROVIDER=firebase: implementar firestoreChat.mediaExists');
}

export async function listMessages() {
  throw new Error('CHAT_PROVIDER=firebase: implementar firestoreChat.listMessages');
}

export async function appendMessage() {
  throw new Error('CHAT_PROVIDER=firebase: implementar firestoreChat.appendMessage');
}

export async function listGlobalFeed() {
  throw new Error(
    'CHAT_PROVIDER=firebase: moderación global no implementada (usa CHAT_PROVIDER=neon)'
  );
}
