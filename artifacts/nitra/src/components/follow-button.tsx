import { UserPlus, UserCheck } from 'lucide-react';
import {
  useCheckFollowStatus, useFollowUser, useUnfollowUser,
  getCheckFollowStatusQueryKey, getGetFollowCountsQueryKey,
} from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

interface FollowButtonProps {
  username: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Extra class names */
  className?: string;
}

export function FollowButton({ username, size = 'sm', className = '' }: FollowButtonProps) {
  const currentUser = getCurrentUser();
  const queryClient = useQueryClient();

  const { data: followStatus, isLoading } = useCheckFollowStatus(
    username,
    currentUser?.id ?? 0,
    {
      query: {
        enabled: !!currentUser && !!username && currentUser.username !== username,
        queryKey: getCheckFollowStatusQueryKey(username, currentUser?.id ?? 0),
      },
    }
  );

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  // Don't show on own profile or when not logged in
  if (!currentUser || currentUser.username === username) return null;

  const isFollowing = followStatus?.following ?? false;
  const isPending = followUser.isPending || unfollowUser.isPending || isLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFollowCountsQueryKey(username) });
    queryClient.invalidateQueries({ queryKey: getCheckFollowStatusQueryKey(username, currentUser.id) });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFollowing) {
      unfollowUser.mutate({ username, data: { followerId: currentUser.id } }, { onSuccess: invalidate });
    } else {
      followUser.mutate({ username, data: { followerId: currentUser.id } }, { onSuccess: invalidate });
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-xs gap-1'
    : 'px-4 py-2 text-sm gap-1.5';

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center font-medium rounded-full border transition-colors disabled:opacity-60 ${
        isFollowing
          ? 'border-border bg-muted text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10'
          : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
      } ${sizeClasses} ${className}`}
    >
      {isFollowing
        ? <><UserCheck className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} /> Following</>
        : <><UserPlus className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} /> Follow</>}
    </button>
  );
}
