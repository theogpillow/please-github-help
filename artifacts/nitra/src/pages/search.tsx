import { useState } from 'react';
import { Link } from 'wouter';
import { AtSign, Search, Users } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { FollowButton } from '@/components/follow-button';
import { useListUsers, useGetFollowCounts, getListUsersQueryKey } from '@workspace/api-client-react';

function UserRow({ username }: { username: string }) {
  const { data: counts } = useGetFollowCounts(username);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors">
      <Link href={`/profile/${username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <UserAvatar username={username} className="h-11 w-11 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold truncate">@{username}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts ? `${counts.followers} follower${counts.followers !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </Link>
      <FollowButton username={username} size="sm" />
    </div>
  );
}

export default function SearchPage() {
  const [raw, setRaw] = useState('');

  // Strip leading @ so "@brobuisness" and "brobuisness" both work
  const query = raw.replace(/^@+/, '').trim();

  const params = query ? { q: query } : undefined;
  const { data: results, isFetching } = useListUsers(
    params,
    { query: { enabled: !!query, queryKey: getListUsersQueryKey(params) } }
  );

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-serif flex items-center gap-3">
            <AtSign className="h-8 w-8 text-primary" />
            Find People
          </h1>
          <p className="text-muted-foreground mt-1">Search by @username to find and follow founders</p>
        </div>

        {/* Search input */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none">
            <AtSign className="h-4 w-4" />
          </div>
          <input
            autoFocus
            type="text"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="@username"
            className="w-full pl-9 pr-4 py-3 text-base rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
          {raw && (
            <button
              onClick={() => setRaw('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-1">
          {!query && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
              <Users className="h-12 w-12 opacity-30" />
              <p className="text-sm">Type a username above to search</p>
            </div>
          )}

          {query && isFetching && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && !isFetching && results && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AtSign className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-medium">No user found</p>
                <p className="text-sm text-muted-foreground mt-1">@{query} doesn't exist on Nitra</p>
              </div>
            </div>
          )}

          {query && !isFetching && results && results.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {results.map((u) => (
                <UserRow key={u.id} username={u.username} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
