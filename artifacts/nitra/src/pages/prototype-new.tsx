import { useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCreatePrototype } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['SaaS', 'E-commerce', 'AI/ML', 'Fintech', 'Healthcare', 'Education', 'Social', 'Other'];

export default function PrototypeNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const createPrototype = useCreatePrototype();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim()) return;

    createPrototype.mutate(
      {
        data: {
          userId: currentUser.id,
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          prompt: prompt.trim() || undefined,
        },
      },
      {
        onSuccess: (prototype) => {
          toast({
            title: 'Prototype created!',
            description: 'Your idea is ready to be brought to life.',
          });
          setLocation(`/prototype/${prototype.id}`);
        },
        onError: () => {
          toast({
            title: 'Failed to create prototype',
            description: 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Sign in to create</h3>
            <p className="text-muted-foreground">
              Join Nitra to start building prototypes
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif">
            Create Prototype
          </h1>
          <p className="text-lg text-muted-foreground">
            Turn your idea into an AI-powered prototype
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Prototype Details</CardTitle>
            <CardDescription>
              Describe your idea — you can generate AI content after creating it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  type="text"
                  placeholder="My revolutionary app idea"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-description"
                  placeholder="A brief overview of what your prototype does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      data-testid={`button-category-${cat.toLowerCase()}`}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        category === cat
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Initial Prompt (optional)</Label>
                <Textarea
                  id="prompt"
                  data-testid="input-prompt"
                  placeholder="Describe what you want the AI to generate for this prototype..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none text-base font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  You can add or edit this later and generate AI content
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  data-testid="button-create-prototype"
                  className="flex-1 h-11 font-semibold"
                  disabled={!title.trim() || createPrototype.isPending}
                >
                  {createPrototype.isPending ? 'Creating...' : 'Create Prototype'}
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
