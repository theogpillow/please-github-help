import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Search, MessageSquare, Heart, Bookmark, Share2,
  Sparkles, X, ExternalLink, TrendingUp, Users
} from 'lucide-react';
import { savePrototype, unsavePrototype, isSaved } from '@/lib/saved';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user-avatar';
import { useGetFeed, useGetFeedStats } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import type { Prototype } from '@workspace/api-client-react';

// Gradient backgrounds when no image is available
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

function FeedCard({ prototype, index }: { prototype: Prototype; index: number }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(() => isSaved(prototype.id));
  const [, setLocation] = useLocation();

  const handleSave = () => {
    if (saved) {
      unsavePrototype(prototype.id);
      setSaved(false);
    } else {
      savePrototype(prototype);
      setSaved(true);
    }
  };

  return (
    <article
      className="feed-snap-item w-full flex flex-col md:flex-row border-b border-border bg-background overflow-hidden"
    >
      {/* ── Left: Description ─────────────────────────── */}
      <div className="hidden md:flex w-72 shrink-0 flex-col gap-4 p-6 bg-muted/30 border-r border-border overflow-y-auto">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">
            Prototype {String(index + 1).padStart(2, '0')}
          </span>
          <h2 className="text-xl font-bold mt-1 leading-tight">{prototype.title}</h2>
        </div>

        {prototype.category && (
          <Badge variant="secondary" className="w-fit">{prototype.category}</Badge>
        )}

        {prototype.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {prototype.description}
          </p>
        )}

        {/* Saved Videos button */}
        <button
          onClick={() => setLocation('/saved')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-fit bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border"
        >
          <Bookmark className="h-4 w-4" />
          Saved Videos
        </button>

        {prototype.username && (
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border">
            <UserAvatar username={prototype.username} className="h-7 w-7" />
            <div>
              <p className="text-sm font-medium">@{prototype.username}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(prototype.createdAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Center: Image / Visual ─────────────────────── */}
      <div className="relative flex-1 overflow-hidden group">
        {prototype.imageUrl ? (
          <img
            src={prototype.imageUrl}
            alt={prototype.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradient(prototype.id)} flex flex-col items-center justify-center gap-4 p-8`}>
            <Sparkles className="h-16 w-16 text-white/50" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{prototype.title}</p>
              {prototype.category && (
                <p className="text-white/70 mt-2 text-sm">{prototype.category}</p>
              )}
            </div>
          </div>
        )}

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Mobile info overlay at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-1">
                Prototype {String(index + 1).padStart(2, '0')}
              </p>
              <h2 className="text-xl font-bold text-white leading-tight">{prototype.title}</h2>
              {prototype.category && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">
                  {prototype.category}
                </span>
              )}
              {prototype.description && (
                <p className="text-white/80 text-sm mt-2 line-clamp-2">{prototype.description}</p>
              )}
              {prototype.username && (
                <div className="flex items-center gap-2 mt-3">
                  <UserAvatar username={prototype.username} className="h-6 w-6 ring-1 ring-white/40" />
                  <span className="text-white text-sm font-medium">@{prototype.username}</span>
                  <span className="text-white/50 text-xs">· {formatRelativeTime(prototype.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View button */}
        <Link href={`/prototype/${prototype.id}`}>
          <button className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full transition-colors">
            <ExternalLink className="h-3 w-3" />
            View
          </button>
        </Link>
      </div>

      {/* ── Right: Actions ────────────────────────────── */}
      <div className="hidden md:flex w-20 shrink-0 flex-col items-center justify-start gap-6 pt-8 pb-4 border-l border-border bg-background">
        <ActionBtn
          icon={<Heart className={`h-5 w-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : ''}`} />}
          label="Like"
          active={liked}
          onClick={() => setLiked(v => !v)}
        />
        <ActionBtn
          icon={<MessageSquare className="h-5 w-5" />}
          label="Chat"
          onClick={() => setLocation('/messages')}
        />
        <ActionBtn
          icon={<Bookmark className={`h-5 w-5 transition-colors ${saved ? 'fill-primary text-primary' : ''}`} />}
          label="Save"
          active={saved}
          onClick={handleSave}
        />
        <ActionBtn
          icon={<Share2 className="h-5 w-5" />}
          label="Share"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.origin + `/prototype/${prototype.id}`);
          }}
        />
      </div>

      {/* Mobile horizontal action bar */}
      <div className="md:hidden flex items-center justify-around px-4 py-2 border-t border-border bg-background/90 backdrop-blur-sm">
        <MobileActionBtn
          icon={<Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />}
          label="Like"
          onClick={() => setLiked(v => !v)}
        />
        <MobileActionBtn
          icon={<MessageSquare className="h-5 w-5" />}
          label="Chat"
          onClick={() => setLocation('/messages')}
        />
        <MobileActionBtn
          icon={<Bookmark className={`h-5 w-5 ${saved ? 'fill-primary text-primary' : ''}`} />}
          label="Save"
          onClick={handleSave}
        />
        <Link href={`/prototype/${prototype.id}`}>
          <MobileActionBtn
            icon={<ExternalLink className="h-5 w-5" />}
            label="View"
          />
        </Link>
      </div>
    </article>
  );
}

function ActionBtn({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 group transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <div className="p-2.5 rounded-full group-hover:bg-muted transition-colors">
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MobileActionBtn({
  icon, label, onClick,
}: {
  icon: React.ReactNode; label: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: feedData, isLoading: feedLoading } = useGetFeed({ q: searchQuery || undefined });
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
          items.map((proto, i) => (
            <FeedCard key={proto.id} prototype={proto} index={i} />
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
