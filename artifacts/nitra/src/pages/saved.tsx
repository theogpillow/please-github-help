import { Link } from 'wouter';
import { Bookmark, Sparkles, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/format';
import { useGetSaves, useUnsavePrototype } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import type { Prototype } from '@workspace/api-client-react';

const GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-indigo-500 to-purple-700',
  'from-purple-600 to-pink-600',
  'from-fuchsia-600 to-violet-700',
  'from-blue-600 to-indigo-600',
  'from-emerald-500 to-teal-700',
];

function getGradient(id: number) {
  return GRADIENTS[id % GRADIENTS.length];
}

function SavedCard({ prototype, onRemove }: { prototype: Prototype; onRemove: () => void }) {
  return (
    <div className="group relative rounded-xl overflow-hidden border border-border bg-background flex flex-col">
      {/* Thumbnail */}
      <Link href={`/prototype/${prototype.id}`}>
        <div className="relative aspect-video overflow-hidden cursor-pointer">
          {prototype.imageUrl ? (
            <img
              src={prototype.imageUrl}
              alt={prototype.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getGradient(prototype.id)} flex items-center justify-center`}>
              <Sparkles className="h-10 w-10 text-white/50" />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/prototype/${prototype.id}`}>
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors cursor-pointer">
              {prototype.title}
            </h3>
          </Link>
          <button
            onClick={onRemove}
            title="Remove from saved"
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {prototype.category && (
          <Badge variant="secondary" className="text-xs w-fit">{prototype.category}</Badge>
        )}

        <div className="flex items-center justify-between mt-auto pt-1 text-xs text-muted-foreground">
          {prototype.username && (
            <div className="flex items-center gap-1.5">
              <UserAvatar username={prototype.username} className="h-4 w-4" />
              <span>@{prototype.username}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatRelativeTime(prototype.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Saved() {
  const currentUser = getCurrentUser();
  const { data, isLoading, refetch } = useGetSaves(
    { userId: currentUser?.id ?? 0 },
    { query: { enabled: !!currentUser, queryKey: ['saves', currentUser?.id] } },
  );
  const unsaveMutation = useUnsavePrototype();

  const saved = data?.items ?? [];

  const handleRemove = (id: number) => {
    if (!currentUser) return;
    unsaveMutation.mutate(
      { id, params: { userId: currentUser.id } },
      { onSuccess: () => refetch() },
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 flex flex-col items-center justify-center gap-4 text-center">
        <Bookmark className="h-16 w-16 text-muted-foreground/40" />
        <div>
          <h3 className="text-xl font-semibold">Sign in to see your saves</h3>
          <p className="text-muted-foreground mt-1 text-sm">Log in to access your saved prototypes from any device.</p>
        </div>
        <Link href="/login">
          <button className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
            Sign In
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-serif flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-primary fill-primary" />
              Saved Videos
            </h1>
            <p className="text-muted-foreground mt-1">
              {isLoading
                ? 'Loading…'
                : saved.length === 0
                  ? 'Nothing saved yet'
                  : `${saved.length} saved prototype${saved.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link href="/feed">
            <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              Browse Feed
            </button>
          </Link>
        </div>

        {/* Gallery grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border bg-background flex flex-col">
                <Skeleton className="aspect-video w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : saved.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {saved.map(proto => (
              <SavedCard
                key={proto.id}
                prototype={proto}
                onRemove={() => handleRemove(proto.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Bookmark className="h-16 w-16 text-muted-foreground/40" />
            <div>
              <h3 className="text-xl font-semibold">Nothing saved yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Hit Save on any prototype in the feed to find it here.
              </p>
            </div>
            <Link href="/feed">
              <button className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                Browse Feed
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
