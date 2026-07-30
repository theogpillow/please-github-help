import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Sparkles, Trash2, Send, Globe, Calendar, Heart } from 'lucide-react';
import { MusicCreditPill } from '@/components/prototype-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserAvatar } from '@/components/user-avatar';
import { useGetPrototype, useGeneratePrototype, usePublishPrototype, useDeletePrototype, useLikePrototype, useUnlikePrototype, getGetPrototypeQueryKey } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { formatRelativeTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function PrototypeDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const prototypeId = params.id ? Number(params.id) : 0;

  const { data: prototype, isLoading } = useGetPrototype(prototypeId);
  const generatePrototype = useGeneratePrototype();
  const publishPrototype = usePublishPrototype();
  const deletePrototype = useDeletePrototype();
  const likePrototype = useLikePrototype();
  const unlikePrototype = useUnlikePrototype();

  const [prompt, setPrompt] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (prototype) {
      setLikeCount(prototype.likeCount ?? 0);
      setLiked(prototype.isLiked ?? false);
    }
  }, [prototype]);

  const handleLike = () => {
    if (!currentUser) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) {
      likePrototype.mutate(
        { id: prototypeId, data: { userId: currentUser.id } },
        {
          onSuccess: (data) => { setLikeCount(data.likeCount); setLiked(data.isLiked); },
          onError: () => { setLiked(false); setLikeCount((c) => c - 1); },
        }
      );
    } else {
      unlikePrototype.mutate(
        { id: prototypeId, params: { userId: currentUser.id } },
        {
          onSuccess: (data) => { setLikeCount(data.likeCount); setLiked(data.isLiked); },
          onError: () => { setLiked(true); setLikeCount((c) => c + 1); },
        }
      );
    }
  };

  const isOwner = currentUser && prototype && currentUser.id === prototype.userId;

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    generatePrototype.mutate(
      { id: prototypeId, data: { prompt: prompt.trim() } },
      {
        onSuccess: () => {
          toast({
            title: 'AI content generated!',
            description: 'Your prototype now has AI-generated content.',
          });
          queryClient.invalidateQueries({ queryKey: getGetPrototypeQueryKey(prototypeId) });
          setPrompt('');
        },
        onError: () => {
          toast({
            title: 'Generation failed',
            description: 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handlePublish = () => {
    publishPrototype.mutate(
      { id: prototypeId },
      {
        onSuccess: () => {
          toast({
            title: 'Published to feed!',
            description: 'Your prototype is now visible to everyone.',
          });
          queryClient.invalidateQueries({ queryKey: getGetPrototypeQueryKey(prototypeId) });
        },
        onError: () => {
          toast({
            title: 'Publish failed',
            description: 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    deletePrototype.mutate(
      { id: prototypeId },
      {
        onSuccess: () => {
          toast({
            title: 'Prototype deleted',
            description: 'Your prototype has been removed.',
          });
          setLocation('/feed');
        },
        onError: () => {
          toast({
            title: 'Delete failed',
            description: 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!prototype) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Prototype not found</h3>
            <Button onClick={() => setLocation('/feed')}>Go to Feed</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-serif">
                  {prototype.title}
                </h1>
                {prototype.category && (
                  <Badge variant="secondary">{prototype.category}</Badge>
                )}
                {prototype.published && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    <Globe className="h-3 w-3 mr-1" />
                    Published
                  </Badge>
                )}
              </div>
              {prototype.description && (
                <p className="text-lg text-muted-foreground">{prototype.description}</p>
              )}
              {/* Music credit */}
              {prototype.audioUrl && (
                <div className="mt-2">
                  <MusicCreditPill prototype={prototype} />
                </div>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {prototype.username && (
              <div className="flex items-center gap-2">
                <UserAvatar username={prototype.username} className="h-6 w-6" />
                <span>{prototype.username}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatRelativeTime(prototype.createdAt)}</span>
            </div>
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={!currentUser}
              className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'hover:text-red-400'} disabled:opacity-50 disabled:cursor-default`}
              title={liked ? 'Unlike' : 'Like'}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              <span className="font-medium">{likeCount > 0 ? likeCount : ''}</span>
              <span>{likeCount === 1 ? 'like' : likeCount > 1 ? 'likes' : 'Like'}</span>
            </button>
          </div>
        </div>

        {/* AI Generator */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                data-testid="input-ai-prompt"
                placeholder="Describe what you want the AI to generate for this prototype..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none font-mono"
              />
              <Button
                data-testid="button-generate"
                onClick={handleGenerate}
                disabled={!prompt.trim() || generatePrototype.isPending}
                className="w-full md:w-auto"
              >
                {generatePrototype.isPending ? 'Generating...' : 'Generate AI Content'}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Generated Image */}
        {prototype.imageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generated Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={prototype.imageUrl}
                alt={`AI generated image for ${prototype.title}`}
                className="w-full rounded-lg object-cover max-h-[512px]"
              />
            </CardContent>
          </Card>
        )}

        {/* Generated Content */}
        {prototype.generatedContent && (
          <Card>
            <CardHeader>
              <CardTitle>AI Generated Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {prototype.generatedContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {isOwner && (
          <div className="flex gap-3 flex-wrap">
            {!prototype.published && (
              <Button
                data-testid="button-publish"
                onClick={handlePublish}
                disabled={publishPrototype.isPending}
                variant="default"
              >
                {publishPrototype.isPending ? 'Publishing...' : 'Publish to Feed'}
                <Globe className="ml-2 h-4 w-4" />
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button data-testid="button-delete" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Prototype
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this prototype?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your prototype.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="button-confirm-delete"
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}
