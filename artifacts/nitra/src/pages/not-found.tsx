import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 text-primary mb-2">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tight font-serif">404</h1>
            <h2 className="text-2xl font-semibold">Page Not Found</h2>
            <p className="text-muted-foreground">
              This page doesn't exist. Let's get you back on track.
            </p>
          </div>
          <Link href="/feed">
            <Button data-testid="button-go-home" className="w-full">
              Go to Feed
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
