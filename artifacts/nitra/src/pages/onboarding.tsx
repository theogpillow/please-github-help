import { useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUser } from '@workspace/api-client-react';
import { setCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const [username, setUsername] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createUser = useCreateUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    createUser.mutate(
      { data: { username: username.trim() } },
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-base">
              Choose your username
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
            />
          </div>

          <Button
            type="submit"
            data-testid="button-join"
            className="w-full h-12 text-base font-semibold"
            disabled={!username.trim() || createUser.isPending}
          >
            {createUser.isPending ? 'Joining...' : 'Join Nitra'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By joining, you agree to turn your wildest ideas into reality.
        </p>
      </div>
    </div>
  );
}
