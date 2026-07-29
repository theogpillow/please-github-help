import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  className?: string;
}

export function UserAvatar({ username, avatarUrl, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {getInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}
