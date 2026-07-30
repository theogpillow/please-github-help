import { useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Bookmark, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedCard } from '@/components/feed-card';
import { useGetSaves, getGetSavesQueryKey } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';

export default function SavedFeed() {
  const currentUser = getCurrentUser();
  const startId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('start')
      : null;

  const { data, isLoading } = useGetSaves(
    { userId: currentUser?.id ?? 0 },
    { query: { enabled: !!currentUser, queryKey: getGetSavesQueryKey({ userId: currentUser?.id ?? 0 }) } },
  );

  const items = data?.items ?? [];
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to the clicked post once data is ready
  useEffect(() => {
    if (!startId || !containerRef.current || items.length === 0) return;
    const idx = items.findIndex(p => p.id === Number(startId));
    if (idx > 0) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = idx * containerRef.current.clientHeight;
        }
      });
    }
  }, [startId, items.length]);

  // Stop audio when navigating away
  useEffect(() => {
    return () => {
      document.querySelectorAll('audio').forEach(el => el.pause());
    };
  }, []);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)', marginTop: '4rem' }}>

      {/* ── Header ──────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm z-10">
        <Link href={currentUser ? `/profile/${currentUser.username}` : '/feed'}>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </button>
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <Bookmark className="h-4 w-4 text-primary fill-primary" />
          <span className="text-sm font-medium">
            {isLoading ? 'Loading…' : `${items.length} saved`}
          </span>
        </div>
      </div>

      {/* ── Snap feed ───────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto feed-snap-container"
        style={{ scrollSnapType: 'y mandatory', overflowY: 'scroll' }}
      >
        {isLoading ? (
          <div className="feed-snap-item flex items-center justify-center">
            <div className="space-y-4 w-full max-w-sm px-8">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-64 w-full mt-4" />
            </div>
          </div>
        ) : items.length > 0 ? (
          items.map(proto => <FeedCard key={proto.id} prototype={proto} />)
        ) : (
          <div className="feed-snap-item flex flex-col items-center justify-center gap-4 text-center px-8">
            <Sparkles className="h-16 w-16 text-muted-foreground/40" />
            <div>
              <h3 className="text-2xl font-bold">Nothing saved yet</h3>
              <p className="text-muted-foreground mt-2">
                Hit Save on any post in the feed to bookmark it here.
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
