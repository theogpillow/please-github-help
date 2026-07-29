import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Sparkles, MessageSquare, User, Lightbulb, Search, Shield, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { getCurrentUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

function useUnreadCount(userId: number | undefined) {
  const { data } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => fetch(`/api/notifications/unread-count?userId=${userId}`).then(r => r.json()),
    enabled: !!userId,
    refetchInterval: 30_000,
  });
  return data?.count ?? 0;
}

const navItems = [
  { path: '/feed', label: 'Feed', icon: Home },
  { path: '/prototype/new', label: 'Create', icon: Sparkles, primary: true },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/feedback', label: 'Feedback', icon: Lightbulb },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
];

export function NavBar() {
  const [location] = useLocation();
  const currentUser = getCurrentUser();
  const unread = useUnreadCount(currentUser?.id);
  const desktopRef = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLElement>(null);

  // Force a repaint when the app is foregrounded — fixes iOS Safari "fixed element
  // disappears after backgrounding" caused by backdrop-blur GPU layer eviction.
  useEffect(() => {
    const repaint = () => {
      if (document.visibilityState !== 'visible') return;
      [desktopRef.current, mobileRef.current].forEach((el) => {
        if (!el) return;
        el.style.display = 'none';
        // Reading offsetHeight forces a synchronous reflow before restoring display.
        void el.offsetHeight;
        el.style.display = '';
      });
    };
    document.addEventListener('visibilitychange', repaint);
    window.addEventListener('pageshow', repaint);
    return () => {
      document.removeEventListener('visibilitychange', repaint);
      window.removeEventListener('pageshow', repaint);
    };
  }, []);

  return (
    <>
      {/* Desktop nav */}
      <nav ref={desktopRef} className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background border-b border-border" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
        <div className="max-w-7xl mx-auto w-full px-6 h-16 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2 text-xl font-bold font-serif">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span>Nitra</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                    item.primary
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {currentUser && (
              <Link
                href="/inbox"
                data-testid="nav-inbox"
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm',
                  location === '/inbox'
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            )}
            {currentUser?.isAdmin && (
              <Link
                href="/admin"
                data-testid="nav-admin"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm',
                  location === '/admin'
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
            {currentUser && (
              <Link
                href={`/profile/${currentUser.username}`}
                data-testid="nav-profile"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  location === `/profile/${currentUser.username}`
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <User className="h-4 w-4" />
                <span>{currentUser.username}</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav ref={mobileRef} className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[72px]',
                  item.primary
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
          {currentUser?.isAdmin && (
            <Link
              href="/admin"
              data-testid="nav-mobile-admin"
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[72px]',
                location === '/admin' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs font-medium">Admin</span>
            </Link>
          )}
          {currentUser && (
            <Link
              href="/inbox"
              data-testid="nav-mobile-inbox"
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px]',
                location === '/inbox' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              <span className="text-xs font-medium">Inbox</span>
            </Link>
          )}
          {currentUser && (
            <Link
              href={`/profile/${currentUser.username}`}
              data-testid="nav-mobile-profile"
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px]',
                location === `/profile/${currentUser.username}`
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">Profile</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
