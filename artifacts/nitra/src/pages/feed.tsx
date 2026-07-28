import { useState } from 'react';
import { Search, TrendingUp, Users, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PrototypeCard } from '@/components/prototype-card';
import { useGetFeed, useGetFeedStats } from '@workspace/api-client-react';

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: feedData, isLoading: feedLoading } = useGetFeed({ q: searchQuery || undefined });
  const { data: stats, isLoading: statsLoading } = useGetFeedStats();

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif mb-2">
              Discover Ideas
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore prototypes from ambitious entrepreneurs worldwide
            </p>
          </div>

          {/* Stats */}
          {statsLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPrototypes}</p>
                      <p className="text-sm text-muted-foreground">Total Prototypes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalEntrepreneurs}</p>
                      <p className="text-sm text-muted-foreground">Entrepreneurs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPublished}</p>
                      <p className="text-sm text-muted-foreground">Published</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              data-testid="input-search"
              type="search"
              placeholder="Search prototypes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>
        </div>

        {/* Feed Grid */}
        {feedLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : feedData && feedData.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedData.items.map((prototype, index) => (
              <div
                key={prototype.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <PrototypeCard prototype={prototype} />
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-3">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-xl font-semibold">No prototypes yet</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Be the first to create and publish a prototype!'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
