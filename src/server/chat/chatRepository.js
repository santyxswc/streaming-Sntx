import 'server-only';
import { getChatProvider } from '@/server/config/chatEnv';
import * as neonChat from '@/server/chat/providers/neonChat';
import * as firestoreChat from '@/server/chat/providers/firestoreChat';
import * as neonChatProfile from '@/server/chat/providers/neonChatProfile';
import * as firestoreChatProfile from '@/server/chat/providers/firestoreChatProfile';

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
