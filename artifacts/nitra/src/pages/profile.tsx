import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Edit2, Briefcase, Calendar, UserPlus, UserCheck, Users, LogOut } from 'lucide-react';
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
  getGetUserQueryKey, getGetFollowCountsQueryKey, getCheckFollowStatusQueryKey,
} from '@workspace/api-client-react';
import { getCurrentUser, clearCurrentUser } from '@/lib/auth';
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
  const { data: followCounts } = useGetFollowCounts(username);
  const { data: followStatus } = useCheckFollowStatus(
    username,
    currentUser?.id ?? 0,
    { query: { enabled: !!currentUser && !!username, queryKey: getCheckFollowStatusQueryKey(username, currentUser?.id ?? 0) } }
  );

  const updateUser = useUpdateUser();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyBio, setCompanyBio] = useState('');

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
              <UserAvatar username={user.username} className="h-24 w-24 text-3xl" />
              <div className="flex-1 space-y-4">

                {/* Name + action buttons */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight font-serif">{user.username}</h1>
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

        {/* Prototypes Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">
            {isOwnProfile ? 'Your Prototypes' : `${user.username}'s Prototypes`}
          </h2>
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
