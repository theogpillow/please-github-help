import { Link } from 'wouter';
import { Calendar, User as UserIcon } from 'lucide-react';
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
