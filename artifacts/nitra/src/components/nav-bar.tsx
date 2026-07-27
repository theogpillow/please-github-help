import { Link, useLocation } from 'wouter';
import { Home, Sparkles, MessageSquare, User, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { getCurrentUser } from '@/lib/auth';

const navItems = [
  { path: '/feed', label: 'Feed', icon: Home },
  { path: '/prototype/new', label: 'Create', icon: Sparkles, primary: true },
  { path: '/feedback', label: 'Feedback', icon: Lightbulb },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
];

export function NavBar() {
  const [location] = useLocation();
  const currentUser = getCurrentUser();

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border">
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
          {currentUser && (
            <Link
              href={`/profile/${currentUser.username}`}
              data-testid="nav-mobile-profile"
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[72px]',
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
