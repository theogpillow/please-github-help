import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Bookmark, Sparkles, Heart, MessageSquare, Share2, ExternalLink, Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';
import { getSaved, unsavePrototype } from '@/lib/saved';
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

function SavedCard({ prototype, index, onRemove }: { prototype: Prototype; index: number; onRemove: () => void }) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="feed-snap-item w-full flex flex-col md:flex-row border-b border-border bg-background overflow-hidden">
      {/* Left: Description */}
      <div className="hidden md:flex w-72 shrink-0 flex-col gap-4 p-6 bg-muted/30 border-r border-border overflow-y-auto">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">
            Saved {String(index + 1).padStart(2, '0')}
          </span>
          <h2 className="text-xl font-bold mt-1 leading-tight">{prototype.title}</h2>
        </div>

        {prototype.category && (
          <Badge variant="secondary" className="w-fit">{prototype.category}</Badge>
        )}

        {prototype.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{prototype.description}</p>
        )}

        <button
          onClick={onRemove}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors w-fit mt-1"
        >
          <Trash2 className="h-4 w-4" />
          Remove
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

      {/* Center: Image / Visual */}
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Mobile overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-1">Saved {String(index + 1).padStart(2, '0')}</p>
          <h2 className="text-xl font-bold text-white leading-tight">{prototype.title}</h2>
          {prototype.category && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">{prototype.category}</span>
          )}
          {prototype.description && (
            <p className="text-white/80 text-sm mt-2 line-clamp-2">{prototype.description}</p>
          )}
          {prototype.username && (
            <div className="flex items-center gap-2 mt-3">
              <UserAvatar username={prototype.username} className="h-6 w-6 ring-1 ring-white/40" />
              <span className="text-white text-sm font-medium">@{prototype.username}</span>
            </div>
          )}
        </div>

        <Link href={`/prototype/${prototype.id}`}>
          <button className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full transition-colors">
            <ExternalLink className="h-3 w-3" />
            View
          </button>
        </Link>
      </div>

      {/* Right: Actions */}
      <div className="hidden md:flex w-20 shrink-0 flex-col items-center justify-start gap-6 pt-8 pb-4 border-l border-border bg-background">
        <button
          onClick={() => setLiked(v => !v)}
          className={`flex flex-col items-center gap-1 group transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <div className="p-2.5 rounded-full group-hover:bg-muted transition-colors">
            <Heart className={`h-5 w-5 ${liked ? 'fill-red-500' : ''}`} />
          </div>
          <span className="text-[10px] font-medium">Like</span>
        </button>
        <button
          onClick={onRemove}
          className="flex flex-col items-center gap-1 group text-primary transition-colors"
        >
          <div className="p-2.5 rounded-full group-hover:bg-muted transition-colors">
            <Bookmark className="h-5 w-5 fill-primary" />
          </div>
          <span className="text-[10px] font-medium">Saved</span>
        </button>
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.origin + `/prototype/${prototype.id}`)}
          className="flex flex-col items-center gap-1 group text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="p-2.5 rounded-full group-hover:bg-muted transition-colors">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Share</span>
        </button>
      </div>

      {/* Mobile action bar */}
      <div className="md:hidden flex items-center justify-around px-4 py-2 border-t border-border bg-background/90 backdrop-blur-sm">
        <button onClick={() => setLiked(v => !v)} className={`flex flex-col items-center gap-0.5 px-3 py-1 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}>
          <Heart className={`h-5 w-5 ${liked ? 'fill-red-500' : ''}`} />
          <span className="text-[10px] font-medium">Like</span>
        </button>
        <button onClick={onRemove} className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary">
          <Bookmark className="h-5 w-5 fill-primary" />
          <span className="text-[10px] font-medium">Saved</span>
        </button>
        <Link href={`/prototype/${prototype.id}`}>
          <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-5 w-5" />
            <span className="text-[10px] font-medium">View</span>
          </button>
        </Link>
      </div>
    </article>
  );
}

export default function Saved() {
  const [saved, setSaved] = useState<Prototype[]>([]);

  useEffect(() => {
    setSaved(getSaved());
  }, []);

  const handleRemove = (id: number) => {
    unsavePrototype(id);
    setSaved(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)', marginTop: '4rem' }}>
      {/* Header bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
        <Bookmark className="h-4 w-4 text-primary fill-primary" />
        <span className="text-sm font-semibold">Saved Prototypes</span>
        <span className="ml-auto text-xs text-muted-foreground">{saved.length} saved</span>
      </div>

      {/* Snap feed */}
      <div
        className="flex-1 overflow-y-auto feed-snap-container"
        style={{ scrollSnapType: 'y mandatory', overflowY: 'scroll' }}
      >
        {saved.length > 0 ? (
          saved.map((proto, i) => (
            <SavedCard
              key={proto.id}
              prototype={proto}
              index={i}
              onRemove={() => handleRemove(proto.id)}
            />
          ))
        ) : (
          <div className="feed-snap-item flex flex-col items-center justify-center gap-4 text-center px-8">
            <Bookmark className="h-16 w-16 text-muted-foreground/40" />
            <div>
              <h3 className="text-2xl font-bold">Nothing saved yet</h3>
              <p className="text-muted-foreground mt-2">
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
