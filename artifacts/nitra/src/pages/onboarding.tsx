import { useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUser, useLoginUser } from '@workspace/api-client-react';
import { setCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createUser = useCreateUser();
  const loginUser = useLoginUser();

  const isPending = createUser.isPending || loginUser.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    // Try to log in first. If the user doesn't exist (404), register them.
    loginUser.mutate(
      { data: { username: username.trim(), password } },
      {
        onSuccess: (user) => {
          setCurrentUser(user);
          setLocation('/feed');
          toast({
            title: `Welcome back, @${user.username}!`,
            description: "Good to see you again.",
          });
        },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;

          if (status === 404) {
            // New user — register them
            createUser.mutate(
              { data: { username: username.trim(), password } },
              {
                onSuccess: (user) => {
                  setCurrentUser(user);
                  setLocation('/feed');
                  toast({
                    title: 'Welcome to Nitra!',
                    description: `@${user.username} — let's build the future.`,
                  });
                },
                onError: () => {
                  toast({
                    title: 'Username taken',
                    description: 'Try a different username.',
                    variant: 'destructive',
                  });
                },
              }
            );
          } else if (status === 401) {
            toast({
              title: 'Wrong password',
              description: 'Check your password and try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Something went wrong',
              description: 'Please try again.',
              variant: 'destructive',
            });
          }
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Sparkles className="h-10 w-10" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight font-serif">
            Welcome to Nitra
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            Turn your ideas into AI prototypes. Share. Connect. Build the future.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-base">
              Username
            </Label>
            <Input
              id="username"
              data-testid="input-username"
              type="text"
              placeholder="founder"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="h-12 text-base"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                data-testid="input-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            data-testid="button-join"
            className="w-full h-12 text-base font-semibold mt-2"
            disabled={!username.trim() || !password.trim() || isPending}
          >
            {isPending ? 'One moment...' : 'Continue'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          New here? We'll create your account automatically.
        </p>
      </div>
    </div>
  );
}
