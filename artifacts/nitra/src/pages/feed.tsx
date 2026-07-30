import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Search, MessageSquare, Heart, Bookmark, Share2,
  Sparkles, X, ExternalLink, Music2, Play, Pause, Flag,
  TrendingUp, Users
} from 'lucide-react';
import { VerifiedBadge } from '@/components/verified-badge';
import { ReportModal } from '@/components/report-modal';
import { FollowButton } from '@/components/follow-button';
import { ShareModal } from '@/components/share-modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user-avatar';
import {
  useGetFeed,
  useGetFeedStats,
  useLikePrototype,
  useUnlikePrototype,
  useSavePrototype,
  useUnsavePrototype,
} from '@workspace/api-client-react';
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

function FeedCard({ prototype }: { prototype: Prototype }) {
  const currentUser = getCurrentUser();

  const [liked, setLiked] = useState(prototype.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(prototype.likeCount ?? 0);
  const [saved, setSaved] = useState(prototype.isSaved ?? false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [, setLocation] = useLocation();

  const likeMutation = useLikePrototype();
  const unlikeMutation = useUnlikePrototype();
  const saveMutation = useSavePrototype();
  const unsaveMutation = useUnsavePrototype();

  // Auto-play when card snaps into view, pause when it leaves
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const article = articleRef.current;
    const audio = audioRef.current;
    if (!article || !prototype.audioUrl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!audioRef.current) return;
        if (entry.isIntersecting) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(article);
    return () => {
      observer.disconnect();
      audio?.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prototype.audioUrl]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const handleLike = () => {
    if (!currentUser) return;
    if (liked) {
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
      unlikeMutation.mutate(
        { id: prototype.id, params: { userId: currentUser.id } },
        {
          onSuccess: (data) => { setLikeCount(data.likeCount); setLiked(data.isLiked); },
          onError: () => { setLiked(true); setLikeCount(c => c + 1); },
        },
      );
    } else {
      setLiked(true);
      setLikeCount(c => c + 1);
      likeMutation.mutate(
        { id: prototype.id, data: { userId: currentUser.id } },
        {
          onSuccess: (data) => { setLikeCount(data.likeCount); setLiked(data.isLiked); },
          onError: () => { setLiked(false); setLikeCount(c => Math.max(0, c - 1)); },
        },
      );
    }
  };

  const handleSave = () => {
    if (!currentUser) return;
    if (saved) {
      setSaved(false);
      unsaveMutation.mutate(
        { id: prototype.id, params: { userId: currentUser.id } },
        { onError: () => setSaved(true) },
      );
    } else {
      setSaved(true);
      saveMutation.mutate(
        { id: prototype.id, data: { userId: currentUser.id } },
        { onError: () => setSaved(false) },
      );
    }
  };

  // Resolve media
  const uploadedMedia: string[] = (() => {
    try { return prototype.mediaUrls ? JSON.parse(prototype.mediaUrls) : []; } catch { return []; }
  })();
  const primaryMedia = prototype.imageUrl || uploadedMedia[0] || null;
  const isVideo = primaryMedia && !prototype.imageUrl && /\.(mp4|webm|mov)$/i.test(primaryMedia);

  return (
    <article ref={articleRef} className="feed-snap-item relative w-full overflow-hidden bg-black select-none">

      {/* ── Full-screen background ───────────────────── */}
      <div className="absolute inset-0">
        {primaryMedia && isVideo ? (
          <video src={primaryMedia} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : primaryMedia ? (
          <img src={primaryMedia} alt={prototype.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradient(prototype.id)}`} />
        )}
      </div>

      {/* ── Gradient overlays ───────────────────────── */}
      {/* bottom fade for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
      {/* top fade for nav clearance */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

      {/* ── Right action rail (TikTok-style) ─────────── */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <TikTokBtn
          onClick={handleLike}
          icon={
            <Heart
              className={`h-7 w-7 transition-all duration-200 ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`}
            />
          }
          label={likeCount > 0 ? String(likeCount) : 'Like'}
        />

        {/* Direct message */}
        <TikTokBtn
          onClick={() => prototype.username && setLocation(`/messages?with=${prototype.username}`)}
          icon={<MessageSquare className="h-7 w-7 text-white" />}
          label="Chat"
        />

        {/* Save */}
        <TikTokBtn
          onClick={handleSave}
          icon={
            <Bookmark
              className={`h-7 w-7 transition-all duration-200 ${saved ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-white'}`}
            />
          }
          label={saved ? 'Saved' : 'Save'}
        />

        {/* Share */}
        <TikTokBtn
          onClick={() => setShareOpen(true)}
          icon={<Share2 className="h-7 w-7 text-white" />}
          label="Share"
        />

        {/* View full post */}
        <Link href={`/prototype/${prototype.id}`}>
          <TikTokBtn
            icon={<ExternalLink className="h-6 w-6 text-white" />}
            label="View"
          />
        </Link>

        {/* Report */}
        <TikTokBtn
          onClick={() => setReportOpen(true)}
          icon={<Flag className="h-5 w-5 text-white/60" />}
          label="Report"
          small
        />
      </div>

      {/* ── Bottom-left creator info ─────────────────── */}
      <div className="absolute bottom-0 left-0 right-20 p-4 pb-5 z-10 space-y-2">

        {/* Creator row */}
        {prototype.username && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${prototype.username}`}>
              <UserAvatar
                username={prototype.username}
                avatarUrl={prototype.creatorAvatarUrl}
                className="h-9 w-9 ring-2 ring-white/50"
              />
            </Link>
            <Link href={`/profile/${prototype.username}`}>
              <span className="text-white font-semibold text-sm flex items-center gap-1 hover:underline">
                @{prototype.username}
                {prototype.creatorIsVerified && <VerifiedBadge size="sm" showTooltip={false} />}
              </span>
            </Link>
            <FollowButton
              username={prototype.username}
              size="sm"
              className="!border-white/40 !bg-white/15 !text-white hover:!bg-white/25 backdrop-blur-sm !text-xs !px-3 !h-7"
            />
            <span className="text-white/40 text-xs">{formatRelativeTime(prototype.createdAt)}</span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-white font-bold text-lg leading-tight drop-shadow-md">
          {prototype.title}
        </h2>

        {/* Category */}
        {prototype.category && (
          <span className="inline-block px-2.5 py-0.5 bg-white/15 backdrop-blur-sm text-white text-xs rounded-full border border-white/20">
            {prototype.category}
          </span>
        )}

        {/* Description */}
        {prototype.description && (
          <p
            className={`text-white/80 text-sm leading-snug cursor-pointer ${descExpanded ? '' : 'line-clamp-2'}`}
            onClick={() => setDescExpanded(v => !v)}
          >
            {prototype.description}
            {!descExpanded && prototype.description.length > 80 && (
              <span className="text-white/50 ml-1">more</span>
            )}
          </p>
        )}

        {/* Audio strip */}
        {prototype.audioUrl && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full w-fit max-w-full">
            {prototype.audioUrl && <audio ref={audioRef} src={prototype.audioUrl} loop onEnded={() => setIsPlaying(false)} />}
            <button onClick={toggleAudio} className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              {isPlaying ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white" />}
            </button>
            <Music2 className="h-3 w-3 text-white/70 shrink-0 animate-spin" style={{ animationDuration: isPlaying ? '3s' : '0s', animationPlayState: isPlaying ? 'running' : 'paused' }} />
            <span className="text-white text-xs truncate max-w-[160px]">
              {prototype.audioUrl.split('/').pop()?.replace(/^\d+-[a-z0-9]+\./, '') ?? 'Song'}
            </span>
          </div>
        )}
      </div>

      {reportOpen && (
        <ReportModal prototypeId={prototype.id} prototypeTitle={prototype.title} onClose={() => setReportOpen(false)} />
      )}
      {shareOpen && (
        <ShareModal prototype={prototype} onClose={() => setShareOpen(false)} />
      )}
    </article>
  );
}

function TikTokBtn({
  icon, label, onClick, small,
}: {
  icon: React.ReactNode; label: string; onClick?: () => void; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
    >
      <div className={`flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm group-hover:bg-black/50 transition-colors ${small ? 'h-10 w-10' : 'h-12 w-12'}`}>
        {icon}
      </div>
      <span className={`text-white font-semibold drop-shadow ${small ? 'text-[9px]' : 'text-[11px]'}`}>{label}</span>
    </button>
  );
}

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const currentUser = getCurrentUser();
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
