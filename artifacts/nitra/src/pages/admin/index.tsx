import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, Users, FileText, Flag, BarChart3, CheckCircle, XCircle, EyeOff, Trash2, Ban, Eye, Settings, BadgeCheck, RotateCcw, Loader2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { getCurrentUser } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import type { AdminStats, AdminPost, AdminReport, AdminUser, AppSettings } from '@workspace/api-client-react';

type Tab = 'overview' | 'verification' | 'posts' | 'reports' | 'users';

function adminFetch<T>(path: string, userId: number, opts?: RequestInit): Promise<T> {
  return fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': String(userId),
      ...(opts?.headers ?? {}),
    },
  }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<T>;
  });
}

// ─── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ userId }: { userId: number }) {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminFetch('/admin/stats', userId),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Total Posts', value: stats.totalPrototypes, icon: FileText, color: 'text-purple-500' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: BadgeCheck, color: 'text-green-500' },
    { label: 'Open Reports', value: stats.openReports, icon: Flag, color: 'text-orange-500' },
    { label: 'Hidden Posts', value: stats.flaggedPosts, icon: EyeOff, color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-muted`}>
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Verification Tab ──────────────────────────────────────────────
function VerificationTab({ userId }: { userId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users-verify', search],
    queryFn: () => adminFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, userId),
    enabled: search.length > 0,
  });

  const patchUser = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      adminFetch(`/admin/users/${id}`, userId, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: (_d, vars) => {
      const isVerifying = (vars.patch as { isVerified?: boolean }).isVerified;
      toast({ title: isVerifying ? 'User verified ✓' : 'Verification removed' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-verify'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" size="sm">Search</Button>
      </form>

      {!search && (
        <p className="text-center text-muted-foreground py-12 text-sm">Search for a user to verify them.</p>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {search && !isLoading && users.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">No users found for "{search}".</p>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="pt-3 pb-3 flex items-center gap-3">
              <UserAvatar username={u.username} avatarUrl={u.avatarUrl} className="h-10 w-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">@{u.username}</p>
                  {u.isAdmin && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">Admin</span>}
                  {u.isVerified && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider">Verified</span>}
                </div>
                <p className="text-xs text-muted-foreground">Joined {formatRelativeTime(u.createdAt)}</p>
              </div>
              <Button
                size="sm"
                variant={u.isVerified ? 'outline' : 'default'}
                className="h-8 text-xs gap-1.5 shrink-0"
                onClick={() => patchUser.mutate({ id: u.id, patch: { isVerified: !u.isVerified } })}
                disabled={patchUser.isPending}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {u.isVerified ? 'Unverify' : 'Verify'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Posts Tab ─────────────────────────────────────────────────────
function PostsTab({ userId }: { userId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminFetch('/admin/settings', userId),
  });

  const preModEnabled = settings?.pre_moderation === 'true';

  const { data: posts = [], isLoading } = useQuery<AdminPost[]>({
    queryKey: ['admin', 'prototypes', statusFilter],
    queryFn: () => adminFetch(`/admin/prototypes${statusFilter ? `?status=${statusFilter}` : ''}`, userId),
  });

  const togglePreMod = useMutation({
    mutationFn: () =>
      adminFetch('/admin/settings', userId, {
        method: 'PATCH',
        body: JSON.stringify({ pre_moderation: preModEnabled ? 'false' : 'true' }),
      }),
    onSuccess: () => {
      toast({ title: `Pre-moderation ${preModEnabled ? 'disabled' : 'enabled'}` });
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });

  const patchPost = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminFetch(`/admin/prototypes/${id}`, userId, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'prototypes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      hidden: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      draft: 'bg-muted text-muted-foreground',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[s] ?? 'bg-muted text-muted-foreground'}`}>{s}</span>;
  };

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Approved', value: 'approved' },
    { label: 'Pending', value: 'pending' },
    { label: 'Hidden', value: 'hidden' },
    { label: 'Deleted', value: 'deleted' },
  ];

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Pre-moderation toggle */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium flex items-center gap-2"><Settings className="h-4 w-4" /> Pre-Moderation</p>
            <p className="text-xs text-muted-foreground mt-0.5">When on, new posts wait for admin approval before appearing in the feed.</p>
          </div>
          <button
            onClick={() => togglePreMod.mutate()}
            disabled={togglePreMod.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${preModEnabled ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${preModEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or username…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="space-y-2">
        {filteredPosts.map((p) => {
          const media: string[] = (() => { try { return p.mediaUrls ? JSON.parse(p.mediaUrls) : []; } catch { return []; } })();
          const thumb = p.imageUrl || media[0] || null;
          return (
            <Card key={p.id}>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                {/* Thumbnail */}
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate max-w-xs">{p.title}</p>
                    {statusBadge(p.status ?? '')}
                  </div>
                  <p className="text-xs text-muted-foreground">@{p.username ?? 'unknown'} · {formatRelativeTime(p.createdAt)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {p.status === 'pending' && (
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => patchPost.mutate({ id: p.id, status: 'approved' })} disabled={patchPost.isPending}>
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                  )}
                  {p.status === 'approved' && (
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => patchPost.mutate({ id: p.id, status: 'hidden' })} disabled={patchPost.isPending}>
                      <EyeOff className="h-3 w-3" /> Hide
                    </Button>
                  )}
                  {p.status === 'hidden' && (
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => patchPost.mutate({ id: p.id, status: 'approved' })} disabled={patchPost.isPending}>
                      <Eye className="h-3 w-3" /> Restore
                    </Button>
                  )}
                  {p.status !== 'deleted' && (
                    <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => { if (confirm('Delete this post?')) patchPost.mutate({ id: p.id, status: 'deleted' }); }} disabled={patchPost.isPending}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  )}
                  {p.status === 'deleted' && (
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => patchPost.mutate({ id: p.id, status: 'approved' })} disabled={patchPost.isPending}>
                      <RotateCcw className="h-3 w-3" /> Restore
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && filteredPosts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {searchQuery ? `No posts matching "${searchQuery}".` : 'No posts found.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Reports Tab ───────────────────────────────────────────────────
function ReportsTab({ userId }: { userId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: reports = [], isLoading } = useQuery<AdminReport[]>({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminFetch('/admin/reports', userId),
  });

  const actMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'resolve' | 'delete_post' }) =>
      adminFetch(`/admin/reports/${id}`, userId, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: (_d, vars) => {
      toast({ title: vars.action === 'delete_post' ? 'Post deleted' : 'Report resolved' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!reports.length) return <p className="text-center text-muted-foreground py-16">No open reports.</p>;

  const REASON_COLORS: Record<string, string> = {
    Spam: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Inappropriate: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Misleading: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Other: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium truncate">"{r.prototypeTitle ?? 'Unknown post'}"</p>
                <p className="text-xs text-muted-foreground">
                  Reported by @{r.reporterUsername ?? 'unknown'} · {formatRelativeTime(r.createdAt)}
                </p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${REASON_COLORS[r.reason ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                  {r.reason}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 text-xs"
                  onClick={() => actMutation.mutate({ id: r.id, action: 'resolve' })}
                  disabled={actMutation.isPending}
                >
                  <CheckCircle className="h-3 w-3" /> Resolve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1 h-7 text-xs"
                  onClick={() => { if (confirm('Delete the reported post?')) actMutation.mutate({ id: r.id, action: 'delete_post' }); }}
                  disabled={actMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" /> Delete Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────
function UsersTab({ userId }: { userId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminFetch(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, userId),
  });

  const patchUser = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      adminFetch(`/admin/users/${id}`, userId, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" size="sm">Search</Button>
        {search && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setQuery(''); setSearch(''); }}>
            Clear
          </Button>
        )}
      </form>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {!isLoading && users.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">{search ? `No users found for "${search}".` : 'No users yet.'}</p>
      )}

      <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="pt-3 pb-3 flex items-center gap-3">
            <UserAvatar username={u.username} avatarUrl={u.avatarUrl} className="h-10 w-10 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">@{u.username}</p>
                {u.isAdmin && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">Admin</span>}
                {u.isVerified && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider">Verified</span>}
                {u.isBanned && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] font-bold uppercase tracking-wider">Banned</span>}
              </div>
              <p className="text-xs text-muted-foreground">Joined {formatRelativeTime(u.createdAt)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => patchUser.mutate({ id: u.id, patch: { isVerified: !u.isVerified } })}
                disabled={patchUser.isPending}
              >
                <BadgeCheck className="h-3 w-3" />
                {u.isVerified ? 'Unverify' : 'Verify'}
              </Button>
              <Button
                size="sm"
                variant={u.isBanned ? 'outline' : 'destructive'}
                className="h-7 text-xs gap-1"
                onClick={() => {
                  if (!u.isBanned && !confirm(`Ban @${u.username}?`)) return;
                  patchUser.mutate({ id: u.id, patch: { isBanned: !u.isBanned } });
                }}
                disabled={patchUser.isPending}
              >
                <Ban className="h-3 w-3" />
                {u.isBanned ? 'Unban' : 'Ban'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────────
export default function AdminPage() {
  const [, setLocation] = useLocation();
  const currentUser = getCurrentUser();
  const [tab, setTab] = useState<Tab>('overview');

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
            <Button onClick={() => setLocation('/')} variant="outline">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'verification', label: 'Verification', icon: BadgeCheck },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'reports', label: 'Reports', icon: Flag },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage Nitra's content and users</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === 'overview' && <OverviewTab userId={currentUser.id} />}
          {tab === 'verification' && <VerificationTab userId={currentUser.id} />}
          {tab === 'posts' && <PostsTab userId={currentUser.id} />}
          {tab === 'reports' && <ReportsTab userId={currentUser.id} />}
          {tab === 'users' && <UsersTab userId={currentUser.id} />}
        </div>
      </div>
    </div>
  );
}
