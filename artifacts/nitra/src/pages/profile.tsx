import { useState, useRef } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { Edit2, Briefcase, Calendar, UserPlus, UserCheck, Users, LogOut, Camera, Loader2, Heart, Bookmark, Play, Grid3X3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/user-avatar';
import { PrototypeCard } from '@/components/prototype-card';
import {
  useGetUser, useGetUserStats, useListUserPrototypes, useUpdateUser,
  useGetFollowCounts, useCheckFollowStatus, useFollowUser, useUnfollowUser,
  useGetSaves, getGetSavesQueryKey,
  getGetUserQueryKey, getGetFollowCountsQueryKey, getCheckFollowStatusQueryKey,
} from '@workspace/api-client-react';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '@/lib/auth';
import { VerifiedBadge } from '@/components/verified-badge';
import { formatRelativeTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function Profile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const username = params.username || '';

  const { data: user, isLoading: userLoading } = useGetUser(username);
  const { data: stats, isLoading: statsLoading } = useGetUserStats(username);
  const { data: prototypes, isLoading: prototypesLoading } = useListUserPrototypes(username);
  // Saved posts — only fetched when viewing your own profile
  const { data: savesData, isLoading: savesLoading } = useGetSaves(
    { userId: currentUser?.id ?? 0 },
    { query: { enabled: !!(currentUser && user && currentUser.id === user.id), queryKey: getGetSavesQueryKey({ userId: currentUser?.id ?? 0 }) } },
  );
  const { data: followCounts } = useGetFollowCounts(username);
  const { data: followStatus } = useCheckFollowStatus(
    username,
    currentUser?.id ?? 0,
    { query: { enabled: !!currentUser && !!username, queryKey: getCheckFollowStatusQueryKey(username, currentUser?.id ?? 0) } }
  );

  const updateUser = useUpdateUser();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyBio, setCompanyBio] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { urls } = await res.json() as { urls: string[] };
      const avatarUrl = urls[0];
      updateUser.mutate(
        { username: currentUser.username, data: { avatarUrl } },
        {
          onSuccess: (updated) => {
            setCurrentUser(updated);
            queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(username) });
            toast({ title: 'Profile picture updated!' });
          },
          onError: () => toast({ title: 'Failed to update picture', variant: 'destructive' }),
        }
      );
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const isOwnProfile = currentUser && user && currentUser.id === user.id;
  const isFollowing = followStatus?.following ?? false;

  const handleLogout = () => {
    clearCurrentUser();
    setLocation('/');
  };

  const invalidateFollow = () => {
    queryClient.invalidateQueries({ queryKey: getGetFollowCountsQueryKey(username) });
    queryClient.invalidateQueries({ queryKey: getCheckFollowStatusQueryKey(username, currentUser?.id ?? 0) });
  };

  const handleFollow = () => {
    if (!currentUser || !user) return;
    if (isFollowing) {
      unfollowUser.mutate(
        { username, data: { followerId: currentUser.id } },
        { onSuccess: invalidateFollow, onError: () => toast({ title: 'Failed to unfollow', variant: 'destructive' }) }
      );
    } else {
      followUser.mutate(
        { username, data: { followerId: currentUser.id } },
        { onSuccess: invalidateFollow, onError: () => toast({ title: 'Failed to follow', variant: 'destructive' }) }
      );
    }
  };

  const handleEditOpen = () => {
    if (user) {
      setBio(user.bio || '');
      setCompanyName(user.companyName || '');
      setCompanyBio(user.companyBio || '');
      setIsEditOpen(true);
    }
  };

  const handleSave = () => {
    if (!user) return;
    updateUser.mutate(
      { username: user.username, data: { bio: bio.trim() || undefined, companyName: companyName.trim() || undefined, companyBio: companyBio.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(user.username) });
          setIsEditOpen(false);
        },
        onError: () => toast({ title: 'Update failed', description: 'Please try again.', variant: 'destructive' }),
      }
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <UserAvatar username="?" className="h-16 w-16 mx-auto" />
            <h3 className="text-xl font-semibold">User not found</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6 flex-col md:flex-row">
              {/* Avatar — clickable on own profile */}
              {isOwnProfile ? (
                <div className="relative shrink-0 cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                  <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className="h-24 w-24 text-3xl" />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
              ) : (
                <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className="h-24 w-24 text-3xl" />
              )}
              <div className="flex-1 space-y-4">

                {/* Name + action buttons */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight font-serif flex items-center gap-2">
                      {user.username}
                      {user.isVerified && <VerifiedBadge size="lg" />}
                    </h1>
                    {user.bio && <p className="text-muted-foreground mt-1">{user.bio}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isOwnProfile && currentUser && (
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={handleFollow}
                        disabled={followUser.isPending || unfollowUser.isPending}
                        className="gap-2"
                      >
                        {isFollowing
                          ? <><UserCheck className="h-4 w-4" /> Following</>
                          : <><UserPlus className="h-4 w-4" /> Follow</>}
                      </Button>
                    )}
                    {isOwnProfile && (
                      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={handleEditOpen}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="bio">Bio</Label>
                              <Textarea id="bio" placeholder="Tell us about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="resize-none" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="company-name">Company Name</Label>
                              <Input id="company-name" placeholder="Your startup name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="company-bio">Company Description</Label>
                              <Textarea id="company-bio" placeholder="What does your company do?" value={companyBio} onChange={(e) => setCompanyBio(e.target.value)} rows={3} className="resize-none" />
                            </div>
                            <Button onClick={handleSave} disabled={updateUser.isPending} className="w-full">
                              {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                {(user.companyName || user.companyBio) && (
                  <div className="space-y-1">
                    {user.companyName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{user.companyName}</span>
                      </div>
                    )}
                    {user.companyBio && <p className="text-sm text-muted-foreground pl-6">{user.companyBio}</p>}
                  </div>
                )}

                {/* Joined */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatRelativeTime(user.createdAt)}</span>
                </div>

                {/* Stats row: prototypes + followers + following */}
                <div className="flex flex-wrap gap-6 text-sm">
                  {!statsLoading && stats && (
                    <>
                      <div>
                        <span className="font-bold text-lg">{stats.prototypeCount}</span>
                        <span className="text-muted-foreground ml-1">Prototypes</span>
                      </div>
                      <div>
                        <span className="font-bold text-lg">{stats.publishedCount}</span>
                        <span className="text-muted-foreground ml-1">Published</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                        <span className="font-bold text-lg">{stats.totalLikes}</span>
                        <span className="text-muted-foreground ml-1">Likes</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-lg">{followCounts?.followers ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Followers</span>
                  </div>
                  <div>
                    <span className="font-bold text-lg">{followCounts?.following ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Following</span>
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tab switcher (own profile only shows Saved tab) ── */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'posts'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            Posts
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'saved'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Saved
              {savesData && savesData.items.length > 0 && (
                <span className="ml-1 text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {savesData.items.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Posts tab ─────────────────────────────── */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {prototypesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : prototypes && prototypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prototypes.map((prototype, index) => (
                  <div key={prototype.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <PrototypeCard prototype={prototype} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "You haven't created any prototypes yet" : 'No prototypes yet'}
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Saved tab (own profile only) ──────────── */}
        {activeTab === 'saved' && isOwnProfile && (
          <div className="space-y-4">
            {savesLoading ? (
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-sm" />)}
              </div>
            ) : savesData && savesData.items.length > 0 ? (
              <>
                {/* Play-all button */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {savesData.items.length} saved post{savesData.items.length !== 1 ? 's' : ''}
                  </p>
                  <Link href="/saved/feed">
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Play All
                    </button>
                  </Link>
                </div>

                {/* Instagram-style square grid */}
                <div className="grid grid-cols-3 gap-1">
                  {savesData.items.map(proto => {
                    const mediaUrls: string[] = (() => {
                      try { return proto.mediaUrls ? JSON.parse(proto.mediaUrls) : []; } catch { return []; }
                    })();
                    const thumb = proto.imageUrl || mediaUrls[0] || null;
                    const gradients = [
                      'from-violet-600 to-indigo-700', 'from-indigo-500 to-purple-700',
                      'from-purple-600 to-pink-600', 'from-fuchsia-600 to-violet-700',
                      'from-blue-600 to-indigo-600', 'from-emerald-500 to-teal-700',
                    ];
                    const grad = gradients[proto.id % gradients.length];
                    return (
                      <Link key={proto.id} href={`/saved/feed?start=${proto.id}`}>
                        <div className="relative aspect-square overflow-hidden rounded-sm cursor-pointer group">
                          {thumb ? (
                            <img src={thumb} alt={proto.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                              <Sparkles className="h-6 w-6 text-white/40" />
                            </div>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                            <p className="text-white text-xs font-medium leading-tight line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                              {proto.title}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground text-sm">
                    You haven't saved any posts yet.
                  </p>
                  <Link href="/feed">
                    <button className="mt-1 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                      Browse Feed
                    </button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        )}

      </div>

      {/* Logout — fixed bottom-right, own profile only */}
      {isOwnProfile && (
        <button
          onClick={handleLogout}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors shadow-sm z-40"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      )}
    </div>
  );
}
