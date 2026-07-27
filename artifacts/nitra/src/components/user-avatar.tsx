import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';

interface UserAvatarProps {
  username: string;
  className?: string;
}

export function UserAvatar({ username, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {getInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}
