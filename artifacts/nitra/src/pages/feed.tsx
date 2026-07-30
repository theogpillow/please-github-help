import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Search, Sparkles, X, TrendingUp, Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedCard, _feedCurrentAudio } from '@/components/feed-card';
import {
  useGetFeed,
  useGetFeedStats,
} from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const currentUser = getCurrentUser();

  // Stop any playing audio when the user navigates away from the feed.
  useEffect(() => {
    return () => {
      document.querySelectorAll('audio').forEach(el => el.pause());
    };
  }, []);

  const { data: feedData, isLoading: feedLoading } = useGetFeed({
    q: searchQuery || undefined,
    viewerId: currentUser?.id,
  });
  const { data: stats } = useGetFeedStats();

  const items = feedData?.items ?? [];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)', marginTop: '4rem' }}>

      {/* ── Search / Stats bar ──────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm z-10">
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              type="search"
              placeholder="Search prototypes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-0"
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
            <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
              {stats && (
                <>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {stats.totalPublished} prototypes
                  </span>
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <Users className="h-3 w-3 text-primary" />
                    {stats.totalEntrepreneurs} founders
                  </span>
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    {items.length} in feed
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Snap Feed ───────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto feed-snap-container"
        style={{ scrollSnapType: 'y mandatory', overflowY: 'scroll' }}
      >
        {feedLoading ? (
          <div className="feed-snap-item flex items-center justify-center">
            <div className="space-y-4 w-full max-w-sm px-8">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-64 w-full mt-4" />
            </div>
          </div>
        ) : items.length > 0 ? (
          items.map((proto) => (
            <FeedCard key={proto.id} prototype={proto} />
          ))
        ) : (
          <div className="feed-snap-item flex flex-col items-center justify-center gap-4 text-center px-8">
            <Sparkles className="h-16 w-16 text-muted-foreground/40" />
            <div>
              <h3 className="text-2xl font-bold">
                {searchQuery ? 'No results' : 'No prototypes yet'}
              </h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery ? 'Try a different search term' : 'Be the first to publish one!'}
              </p>
            </div>
            <Link href="/prototype/new">
              <button className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                Create Prototype
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
