import 'server-only';
import { getChatProvider } from '@/server/config/chatEnv';
import * as neonChat from '@/server/chat/providers/neonChat';
import * as firestoreChat from '@/server/chat/providers/firestoreChat';
import * as neonChatProfile from '@/server/chat/providers/neonChatProfile';
import * as firestoreChatProfile from '@/server/chat/providers/firestoreChatProfile';

/**
 * Repositorio del chat. Mensajes y perfiles son contratos separados (ISP):
 * una ruta que solo lista mensajes no depende de la gestión de perfiles.
 */
export const CHAT_PROVIDERS = {
  neon: { messages: neonChat, profiles: neonChatProfile },
  firebase: { messages: firestoreChat, profiles: firestoreChatProfile },
};

export const MESSAGES_CONTRACT = ['mediaExists', 'listMessages', 'appendMessage', 'listGlobalFeed'];
export const PROFILES_CONTRACT = ['getOrCreateProfile', 'updateChatName', 'isChatNameAvailable'];

const messages = () => CHAT_PROVIDERS[getChatProvider()].messages;
const profiles = () => CHAT_PROVIDERS[getChatProvider()].profiles;

export const mediaExists = (...args) => messages().mediaExists(...args);
export const listMessages = (...args) => messages().listMessages(...args);
export const appendMessage = (...args) => messages().appendMessage(...args);
export const listGlobalFeed = (...args) => messages().listGlobalFeed(...args);

export const getOrCreateProfile = (...args) => profiles().getOrCreateProfile(...args);
export const updateChatName = (...args) => profiles().updateChatName(...args);
export const isChatNameAvailable = (...args) => profiles().isChatNameAvailable(...args);
