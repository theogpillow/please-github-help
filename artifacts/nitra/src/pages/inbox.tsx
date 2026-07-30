import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Heart, UserPlus, MessageSquare, AtSign, BadgeCheck, Loader2, CheckCheck } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCurrentUser } from '@/lib/auth';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/format';

interface Notification {
  id: number;
  type: 'follow' | 'like' | 'message' | 'mention' | 'verified';
  actorId: number | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  prototypeId: number | null;
  prototypeTitle: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: (n: Notification) => string }> = {
  follow:   { icon: UserPlus,    color: 'text-blue-500',   label: (n) => `@${n.actorUsername} started following you` },
  like:     { icon: Heart,       color: 'text-red-500',    label: (n) => `@${n.actorUsername} liked your post${n.prototypeTitle ? ` "${n.prototypeTitle}"` : ''}` },
  message:  { icon: MessageSquare, color: 'text-purple-500', label: (n) => `@${n.actorUsername} sent you a message` },
  mention:  { icon: AtSign,      color: 'text-orange-500', label: (n) => `@${n.actorUsername} mentioned you${n.prototypeTitle ? ` in "${n.prototypeTitle}"` : ''}` },
  verified: { icon: BadgeCheck,  color: 'text-blue-400',   label: () => 'Your account has been verified ✓' },
};

export default function Inbox() {
  const currentUser = getCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const authHeaders: Record<string, string> = currentUser
    ? { 'x-user-id': String(currentUser.id) }
    : {};

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', currentUser?.id],
    queryFn: async () => {
      const r = await fetch(`/api/notifications?userId=${currentUser!.id}`, { headers: authHeaders });
      if (!r.ok) return [];
      const data: unknown = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentUser,
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ userId: currentUser!.id }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.type === 'follow' && n.actorUsername) setLocation(`/profile/${n.actorUsername}`);
    else if ((n.type === 'like' || n.type === 'mention') && n.prototypeId) setLocation(`/prototype/${n.prototypeId}`);
    else if (n.type === 'message') setLocation('/messages');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <p className="text-muted-foreground">Sign in to see your notifications.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/60">You'll hear about likes, follows, messages, and more here.</p>
          </div>
        )}

        <div className="space-y-1">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl text-left transition-colors hover:bg-muted/60 ${!n.read ? 'bg-primary/5' : ''}`}
              >
                {/* Avatar or icon */}
                <div className="relative shrink-0">
                  {n.actorUsername ? (
                    <UserAvatar username={n.actorUsername} avatarUrl={n.actorAvatarUrl} className="h-10 w-10" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                  )}
                  {/* type badge */}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background flex items-center justify-center`}>
                    <Icon className={`h-2.5 w-2.5 ${meta.color}`} />
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-sm leading-snug ${!n.read ? 'font-semibold' : ''}`}>
                    {meta.label(n)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
