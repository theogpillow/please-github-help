import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
