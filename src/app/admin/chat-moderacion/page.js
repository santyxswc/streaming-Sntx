import ChatModerationPanel from '@/features/chat/components/ChatModerationPanel';

export const metadata = {
  title: 'Moderación chat | streaming-Sntx',
  robots: { index: false, follow: false },
};

export default function ChatModeracionPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <ChatModerationPanel />
    </div>
  );
}
