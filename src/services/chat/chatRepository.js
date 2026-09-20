import { getChatProvider } from '@/lib/chatEnv';
import * as neonChat from '@/services/chat/neonChat';
import * as firestoreChat from '@/services/chat/firestoreChat';
import * as neonChatProfile from '@/services/chat/neonChatProfile';
import * as firestoreChatProfile from '@/services/chat/firestoreChatProfile';

function impl() {
  return getChatProvider() === 'firebase' ? firestoreChat : neonChat;
}

function profileImpl() {
  return getChatProvider() === 'firebase' ? firestoreChatProfile : neonChatProfile;
}

export const mediaExists = (...args) => impl().mediaExists(...args);
export const listMessages = (...args) => impl().listMessages(...args);
export const appendMessage = (...args) => impl().appendMessage(...args);
export const listGlobalFeed = (...args) => impl().listGlobalFeed(...args);

export const getOrCreateProfile = (...args) =>
  profileImpl().getOrCreateProfile(...args);
export const updateChatName = (...args) => profileImpl().updateChatName(...args);
export const isChatNameAvailable = (...args) =>
  profileImpl().isChatNameAvailable(...args);
