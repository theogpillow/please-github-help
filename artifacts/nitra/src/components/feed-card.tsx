import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  MessageSquare, Heart, Bookmark, Share2,
  ExternalLink, Music2, Play, Pause, Flag,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/verified-badge';
import { ReportModal } from '@/components/report-modal';
import { FollowButton } from '@/components/follow-button';
import { ShareModal } from '@/components/share-modal';
import { UserAvatar } from '@/components/user-avatar';
import { SignInPrompt } from '@/components/sign-in-prompt';
import {
  useLikePrototype,
  useUnlikePrototype,
  useSavePrototype,
  useUnsavePrototype,
} from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import type { Prototype } from '@workspace/api-client-react';

// Only one audio element may play across the entire feed at a time.
// Shared by both Feed and SavedFeed so they never overlap.
export let _feedCurrentAudio: HTMLAudioElement | null = null;

const GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-indigo-500 to-purple-700',
  'from-purple-600 to-pink-600',
  'from-fuchsia-600 to-violet-700',
  'from-blue-600 to-indigo-600',
  'from-emerald-500 to-teal-700',
];

export function getGradient(id: number) {
  return GRADIENTS[id % GRADIENTS.length];
}

export function FeedCard({ prototype }: { prototype: Prototype }) {
  const currentUser = getCurrentUser();

  const [liked, setLiked] = useState(prototype.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(prototype.likeCount ?? 0);
  const [saved, setSaved] = useState(prototype.isSaved ?? false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState<'like' | 'save' | null>(null);
  const [paused, setPaused] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'play' | 'pause' | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const [, setLocation] = useLocation();

  const likeMutation = useLikePrototype();
  const unlikeMutation = useUnlikePrototype();
  const saveMutation = useSavePrototype();
  const unsaveMutation = useUnsavePrototype();

  // Auto-play when card snaps into view, pause when it leaves.
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const article = articleRef.current;
    const audio = audioRef.current;
    if (!article || !prototype.audioUrl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const a = audioRef.current;
        if (!a) return;
        if (entry.isIntersecting) {
          // Stop every <audio> on the page — HMR-proof, no stale ref.
          document.querySelectorAll('audio').forEach(el => {
            if (el !== a) { el.pause(); (el as HTMLAudioElement).currentTime = 0; }
          });
          _feedCurrentAudio = a;
          if (!pausedRef.current) a.play().catch(() => {});
        } else {
          a.pause();
          pausedRef.current = false;
          setPaused(false);
          if (_feedCurrentAudio === a) _feedCurrentAudio = null;
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(article);
    return () => {
      observer.disconnect();
      audio?.pause();
      if (_feedCurrentAudio === audio) _feedCurrentAudio = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prototype.audioUrl]);

  const handleCardTap = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    const nextPaused = !paused;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    if (nextPaused) {
      audio?.pause();
      video?.pause();
    } else {
      audio?.play().catch(() => {});
      video?.play().catch(() => {});
    }
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashIcon(nextPaused ? 'pause' : 'play');
    flashTimer.current = setTimeout(() => setFlashIcon(null), 700);
  };

  const handleLike = () => {
    if (!currentUser) { setSignInPrompt('like'); return; }
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
    if (!currentUser) { setSignInPrompt('save'); return; }
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

  const uploadedMedia: string[] = (() => {
    try { return prototype.mediaUrls ? JSON.parse(prototype.mediaUrls) : []; } catch { return []; }
  })();
  const primaryMedia = prototype.imageUrl || uploadedMedia[0] || null;
  const isVideo = primaryMedia && !prototype.imageUrl && /\.(mp4|webm|mov)$/i.test(primaryMedia);

  return (
    <article
      ref={articleRef}
      className="feed-snap-item relative w-full overflow-hidden bg-black select-none"
      onClick={handleCardTap}
    >
      {/* ── Background ───────────────────────────────── */}
      <div className="absolute inset-0">
        {primaryMedia && isVideo ? (
          <video ref={videoRef} src={primaryMedia} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : primaryMedia ? (
          <img src={primaryMedia} alt={prototype.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradient(prototype.id)}`} />
        )}
      </div>

      {/* ── Gradient overlays ───────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

      {/* ── Tap-to-pause flash ───────────────────────── */}
      {flashIcon && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-black/50 backdrop-blur-sm">
            {flashIcon === 'pause'
              ? <Pause className="h-9 w-9 text-white" />
              : <Play className="h-9 w-9 text-white" />
            }
          </div>
        </div>
      )}

      {/* ── Right action rail ───────────────────────── */}
      <div
        className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10"
        onClick={e => e.stopPropagation()}
      >
        <TikTokBtn
          onClick={handleLike}
          icon={<Heart className={`h-7 w-7 transition-all duration-200 ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />}
          label={likeCount > 0 ? String(likeCount) : 'Like'}
        />
        <TikTokBtn
          onClick={() => prototype.username && setLocation(`/messages?with=${prototype.username}`)}
          icon={<MessageSquare className="h-7 w-7 text-white" />}
          label="Chat"
        />
        <TikTokBtn
          onClick={handleSave}
          icon={<Bookmark className={`h-7 w-7 transition-all duration-200 ${saved ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-white'}`} />}
          label={saved ? 'Saved' : 'Save'}
        />
        <TikTokBtn
          onClick={() => setShareOpen(true)}
          icon={<Share2 className="h-7 w-7 text-white" />}
          label="Share"
        />
        <Link href={`/prototype/${prototype.id}`}>
          <TikTokBtn icon={<ExternalLink className="h-6 w-6 text-white" />} label="View" />
        </Link>
        <TikTokBtn
          onClick={() => setReportOpen(true)}
          icon={<Flag className="h-5 w-5 text-white/60" />}
          label="Report"
          small
        />
      </div>

      {/* ── Bottom-left info ─────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-20 p-4 pb-5 z-10 space-y-2"
        onClick={e => e.stopPropagation()}
      >
        {prototype.username && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${prototype.username}`}>
              <UserAvatar username={prototype.username} avatarUrl={prototype.creatorAvatarUrl} className="h-9 w-9 ring-2 ring-white/50" />
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
        <h2 className="text-white font-bold text-lg leading-tight drop-shadow-md">{prototype.title}</h2>
        {prototype.category && (
          <span className="inline-block px-2.5 py-0.5 bg-white/15 backdrop-blur-sm text-white text-xs rounded-full border border-white/20">
            {prototype.category}
          </span>
        )}
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
        {prototype.audioUrl && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full w-fit max-w-full pointer-events-none">
            <audio ref={audioRef} src={prototype.audioUrl} loop />
            <Music2
              className="h-3 w-3 text-white/70 shrink-0 animate-spin"
              style={{ animationDuration: '3s', animationPlayState: paused ? 'paused' : 'running' }}
            />
            <span className="text-white text-xs truncate max-w-[160px]">
              {prototype.audioUrl.split('/').pop()?.replace(/^\d+-[a-z0-9]+\./, '') ?? 'Song'}
            </span>
          </div>
        )}
      </div>

      {reportOpen && <ReportModal prototypeId={prototype.id} prototypeTitle={prototype.title} onClose={() => setReportOpen(false)} />}
      {shareOpen && <ShareModal prototype={prototype} onClose={() => setShareOpen(false)} />}
      {signInPrompt && <SignInPrompt action={signInPrompt} onClose={() => setSignInPrompt(null)} />}
    </article>
  );
}

export function TikTokBtn({
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
