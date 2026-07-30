import { Link } from 'wouter';
import { Calendar, Music2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { formatRelativeTime } from '@/lib/format';
import type { Prototype } from '@workspace/api-client-react';

interface PrototypeCardProps {
  prototype: Prototype;
}

export function PrototypeCard({ prototype }: PrototypeCardProps) {
  return (
    <Link href={`/prototype/${prototype.id}`}>
      <Card
        data-testid={`card-prototype-${prototype.id}`}
        className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/20"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
              {prototype.title}
            </CardTitle>
            {prototype.category && (
              <Badge variant="secondary" className="shrink-0">
                {prototype.category}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {prototype.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {prototype.description}
            </p>
          )}

          {/* Music credit pill */}
          {prototype.audioUrl && prototype.songTitle && (
            <MusicCreditPill prototype={prototype} />
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {prototype.username && (
                <>
                  <UserAvatar username={prototype.username} className="h-5 w-5" />
                  <span>{prototype.username}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatRelativeTime(prototype.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MusicCreditPill({ prototype }: { prototype: Prototype }) {
  if (!prototype.audioUrl) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-muted/60 border border-border w-fit max-w-full overflow-hidden">
      {prototype.songArtworkUrl ? (
        <img
          src={prototype.songArtworkUrl}
          alt=""
          className="h-5 w-5 rounded shrink-0 object-cover"
        />
      ) : (
        <Music2 className="h-3 w-3 text-primary shrink-0" />
      )}
      {prototype.songTitle ? (
        <span className="text-xs text-muted-foreground truncate">
          <span className="font-medium text-foreground">{prototype.songTitle}</span>
          {prototype.songArtist && (
            <span> · {prototype.songArtist}</span>
          )}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Audio track</span>
      )}
    </div>
  );
}
