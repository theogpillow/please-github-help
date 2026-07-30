import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { NavBar } from '@/components/nav-bar';
import { getCurrentUser } from '@/lib/auth';
import Onboarding from '@/pages/onboarding';
import Feed from '@/pages/feed';
import PrototypeNew from '@/pages/prototype-new';
import PrototypeDetail from '@/pages/prototype-detail';
import Profile from '@/pages/profile';
import Messages from '@/pages/messages';
import Feedback from '@/pages/feedback';
import Saved from '@/pages/saved';
import SavedFeed from '@/pages/saved-feed';
import UserFeed from '@/pages/user-feed';
import SearchPage from '@/pages/search';
import NotFound from '@/pages/not-found';
import AdminPage from '@/pages/admin/index';
import Inbox from '@/pages/inbox';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
      setLocation('/');
    }
  }, [currentUser, setLocation]);

  return <>{children}</>;
}

function Router() {
  const currentUser = getCurrentUser();
  const [location] = useLocation();
  const showNav = !!currentUser;

  return (
    <>
      {showNav && <NavBar />}
      <Switch>
        <Route path="/">
          {currentUser ? <Feed /> : <Onboarding />}
        </Route>
        <Route path="/feed">
          <AuthGuard>
            <Feed />
          </AuthGuard>
        </Route>
        <Route path="/prototype/new">
          <AuthGuard>
            <PrototypeNew />
          </AuthGuard>
        </Route>
        <Route path="/prototype/:id">
          <AuthGuard>
            <PrototypeDetail />
          </AuthGuard>
        </Route>
        <Route path="/profile/:username">
          <AuthGuard>
            <Profile />
          </AuthGuard>
        </Route>
        <Route path="/messages">
          <AuthGuard>
            <Messages />
          </AuthGuard>
        </Route>
        <Route path="/feedback">
          <AuthGuard>
            <Feedback />
          </AuthGuard>
        </Route>
        <Route path="/saved">
          <AuthGuard>
            <Saved />
          </AuthGuard>
        </Route>
        <Route path="/saved/feed">
          <AuthGuard>
            <SavedFeed />
          </AuthGuard>
        </Route>
        <Route path="/profile/:username/feed">
          <UserFeed />
        </Route>
        <Route path="/search">
          <AuthGuard>
            <SearchPage />
          </AuthGuard>
        </Route>
        <Route path="/admin">
          <AdminPage />
        </Route>
        <Route path="/inbox">
          <AuthGuard>
            <Inbox />
          </AuthGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
