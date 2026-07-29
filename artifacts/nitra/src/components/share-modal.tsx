import { useState } from 'react';
import { useLocation } from 'wouter';
import { AtSign, Send, CheckCircle2, Loader2, X } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { VerifiedBadge } from '@/components/verified-badge';
import { getCurrentUser } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListUsers,
  useListConversations,
  useCreateConversation,
  useSendMessage,
  getListUsersQueryKey,
  getListConversationsQueryKey,
  getListMessagesQueryKey,
} from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';

interface ShareModalProps {
  prototype: Prototype;
  onClose: () => void;
}

/** Build the structured share payload stored as the message content */
function buildSharePayload(p: Prototype): string {
  return JSON.stringify({
    __share: true,
    id: p.id,
    title: p.title,
    imageUrl: p.imageUrl ?? null,
    mediaUrls: p.mediaUrls ?? null,
    audioUrl: p.audioUrl ?? null,
    category: p.category ?? null,
    creatorUsername: p.username ?? null,
    creatorIsVerified: p.creatorIsVerified ?? false,
  });
}

export function ShareModal({ prototype, onClose }: ShareModalProps) {
  const [, setLocation] = useLocation();
  const currentUser = getCurrentUser();
  const queryClient = useQueryClient();

  const [raw, setRaw] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const query = raw.replace(/^@+/, '').trim();

  const params = query ? { q: query } : undefined;
  const { data: results, isFetching } = useListUsers(params, {
    query: { enabled: !!query, queryKey: getListUsersQueryKey(params) },
  });

  const { data: conversations } = useListConversations(
    currentUser ? { userId: currentUser.id } : (undefined as any),
  );

  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const handleSendTo = async (recipientId: number, recipientUsername: string) => {
    if (!currentUser || sending) return;
    setSending(recipientUsername);

    try {
      let convo = conversations?.find(
        (c) => c.initiatorId === recipientId || c.recipientId === recipientId,
      ) ?? null;

      if (!convo) {
        convo = await new Promise((resolve, reject) => {
          createConversation.mutate(
            { data: { initiatorId: currentUser.id, recipientId } },
            {
              onSuccess: (c) => {
                queryClient.invalidateQueries({
                  queryKey: getListConversationsQueryKey({ userId: currentUser.id }),
                });
                resolve(c);
              },
              onError: reject,
            },
          );
        });
      }

      if (!convo) throw new Error('no convo');

      const content = buildSharePayload(prototype);

      await new Promise<void>((resolve, reject) => {
        sendMessage.mutate(
          { id: convo!.id, data: { senderId: currentUser.id, content } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(convo!.id) });
              queryClient.invalidateQueries({
                queryKey: getListConversationsQueryKey({ userId: currentUser.id }),
              });
              resolve();
            },
            onError: reject,
          },
        );
      });

      setSentTo(recipientUsername);
      setSending(null);

      setTimeout(() => {
        onClose();
        setLocation(`/messages?with=${recipientUsername}`);
      }, 900);
    } catch {
      setSending(null);
    }
  };

  const filtered = results?.filter((u) => u.id !== currentUser?.id) ?? [];

  // Thumbnail for the preview inside the modal
  const uploadedMedia: string[] = (() => {
    try { return prototype.mediaUrls ? JSON.parse(prototype.mediaUrls) : []; } catch { return []; }
  })();
  const thumb = prototype.imageUrl || uploadedMedia[0] || null;
  const isThumbVideo = thumb && !prototype.imageUrl && /\.(mp4|webm|mov)$/i.test(thumb);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 md:left-1/2 md:-translate-x-1/2 md:w-[420px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-background rounded-t-2xl md:rounded-2xl shadow-2xl border border-border animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mini post preview */}
            {thumb && (
              <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                {isThumbVideo
                  ? <video src={thumb} className="w-full h-full object-cover" muted />
                  : <img src={thumb} alt="" className="w-full h-full object-cover" />}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm">Send to someone</p>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">{prototype.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative flex items-center">
            <AtSign className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setSentTo(null); }}
              placeholder="username"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
            {isFetching && <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="min-h-[80px] max-h-64 overflow-y-auto space-y-1">
            {!query && (
              <p className="text-xs text-muted-foreground text-center py-6">Type a username to find someone</p>
            )}
            {query && !isFetching && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No user found for @{query}</p>
            )}
            {filtered.map((user) => {
              const isSending = sending === user.username;
              const wasSent = sentTo === user.username;
              return (
                <button
                  key={user.id}
                  disabled={!!sending || !!sentTo}
                  onClick={() => handleSendTo(user.id, user.username)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors disabled:opacity-60 text-left"
                >
                  <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className="h-10 w-10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      @{user.username}
                      {user.isVerified && <VerifiedBadge size="sm" showTooltip={false} />}
                    </p>
                    <p className="text-xs text-muted-foreground">Tap to send post</p>
                  </div>
                  <div className="shrink-0">
                    {isSending && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {wasSent && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {!isSending && !wasSent && (
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Send className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
