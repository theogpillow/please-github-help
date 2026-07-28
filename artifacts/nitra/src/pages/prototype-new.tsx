import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ImagePlus, X, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCreatePrototype } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['SaaS', 'E-commerce', 'AI/ML', 'Fintech', 'Healthcare', 'Education', 'Social', 'Other'];
const MAX_FILES = 20;

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export default function PrototypeNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const createPrototype = useCreatePrototype();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    const remaining = MAX_FILES - mediaFiles.length;
    const toAdd = selected.slice(0, remaining);

    if (selected.length > remaining) {
      toast({ title: `Max ${MAX_FILES} files`, description: `Only added the first ${remaining}.`, variant: 'destructive' });
    }

    const newFiles: MediaFile[] = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));

    setMediaFiles(prev => [...prev, ...newFiles]);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!mediaFiles.length) return [];

    const formData = new FormData();
    mediaFiles.forEach(m => formData.append('files', m.file));

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const { urls } = await res.json() as { urls: string[] };
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim()) return;

    setUploading(true);
    let mediaUrls: string | undefined;

    try {
      const urls = await uploadFiles();
      if (urls.length) mediaUrls = JSON.stringify(urls);
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload your media. Please try again.', variant: 'destructive' });
      setUploading(false);
      return;
    }

    setUploading(false);

    createPrototype.mutate(
      {
        data: {
          userId: currentUser.id,
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          prompt: prompt.trim() || undefined,
          mediaUrls,
        },
      },
      {
        onSuccess: (prototype) => {
          toast({ title: 'Prototype created!', description: 'Your idea is ready to be brought to life.' });
          setLocation(`/prototype/${prototype.id}`);
        },
        onError: () => {
          toast({ title: 'Failed to create prototype', description: 'Please try again.', variant: 'destructive' });
        },
      }
    );
  };

  const isPending = uploading || createPrototype.isPending;

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Sign in to create</h3>
            <p className="text-muted-foreground">Join Nitra to start building prototypes</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-8 px-4 md:px-6 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif">Create Prototype</h1>
          <p className="text-lg text-muted-foreground">Turn your idea into an AI-powered prototype</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Prototype Details</CardTitle>
            <CardDescription>Describe your idea — you can generate AI content after creating it</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
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

              {/* Description */}
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

              {/* Media upload */}
              <div className="space-y-3">
                <Label>Media</Label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Add button */}
                {mediaFiles.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <ImagePlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">Add video or image</p>
                      <p className="text-xs text-muted-foreground">
                        Up to {MAX_FILES} files · images & videos · 100 MB each
                        {mediaFiles.length > 0 && ` · ${mediaFiles.length}/${MAX_FILES} added`}
                      </p>
                    </div>
                  </button>
                )}

                {/* Previews grid */}
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {mediaFiles.map((m, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                        {m.type === 'image' ? (
                          <img src={m.preview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted">
                            <Film className="h-6 w-6 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-2">{m.file.name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {m.type === 'video' && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium">
                            VIDEO
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category */}
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

              {/* Prompt */}
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
                <p className="text-xs text-muted-foreground">You can add or edit this later and generate AI content</p>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  data-testid="button-create-prototype"
                  className="flex-1 h-11 font-semibold"
                  disabled={!title.trim() || isPending}
                >
                  {uploading ? 'Uploading media…' : createPrototype.isPending ? 'Creating…' : 'Create Prototype'}
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
