import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ImagePlus, X, Film, Music, Music2, Search, Loader2, Upload, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCreatePrototype } from '@workspace/api-client-react';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
}

interface SelectedSong {
  name: string;
  artist: string;
  previewUrl: string;
  artwork: string;
}

function SongPicker({
  songFile, setSongFile,
  selectedSong, setSelectedSong,
}: {
  songFile: File | null; setSongFile: (f: File | null) => void;
  selectedSong: SelectedSong | null; setSelectedSong: (s: SelectedSong | null) => void;
}) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'search' | 'upload'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItunesTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => () => { previewAudio?.pause(); }, [previewAudio]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`
      );
      const data = await res.json() as { results: ItunesTrack[] };
      setResults(data.results.filter(t => t.previewUrl));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const togglePreview = (track: ItunesTrack) => {
    if (playingId === track.trackId) {
      previewAudio?.pause();
      setPlayingId(null);
      return;
    }
    previewAudio?.pause();
    const audio = new Audio(track.previewUrl);
    audio.play();
    audio.onended = () => setPlayingId(null);
    setPreviewAudio(audio);
    setPlayingId(track.trackId);
  };

  const selectTrack = (track: ItunesTrack) => {
    previewAudio?.pause();
    setPlayingId(null);
    setSelectedSong({ name: track.trackName, artist: track.artistName, previewUrl: track.previewUrl, artwork: track.artworkUrl100 });
    setSongFile(null);
  };

  const clear = () => {
    previewAudio?.pause();
    setPlayingId(null);
    setSelectedSong(null);
    setSongFile(null);
  };

  // Show selected state for either source
  if (selectedSong || songFile) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30">
        {selectedSong?.artwork
          ? <img src={selectedSong.artwork} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          : <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Music2 className="h-5 w-5 text-primary" /></div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedSong ? selectedSong.name : songFile!.name}</p>
          <p className="text-xs text-muted-foreground">
            {selectedSong ? selectedSong.artist : `${(songFile!.size / 1024 / 1024).toFixed(1)} MB`}
          </p>
        </div>
        <button type="button" onClick={clear} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'search' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Search className="h-3.5 w-3.5" /> Search Songs
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Upload className="h-3.5 w-3.5" /> Upload File
        </button>
      </div>

      {tab === 'upload' && (
        <>
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setSongFile(f); setSelectedSong(null); } e.target.value = ''; }} />
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-primary transition-colors">Upload an audio file</p>
              <p className="text-xs text-muted-foreground">MP3, WAV, AAC, OGG · plays on your post</p>
            </div>
          </button>
        </>
      )}

      {tab === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search any song or artist…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="button" size="sm" disabled={searching} onClick={handleSearch}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {searching && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

          {!searching && searched && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No songs found. Try a different search.</p>
          )}

          {!searching && results.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border max-h-80 overflow-y-auto">
              {results.map(track => (
                <div
                  key={track.trackId}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Album art */}
                  <img
                    src={track.artworkUrl100}
                    alt={track.collectionName}
                    className="h-12 w-12 rounded-lg object-cover shrink-0 shadow-sm"
                  />
                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{track.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artistName}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{track.collectionName}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePreview(track)}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 transition-colors text-center"
                    >
                      {playingId === track.trackId ? '⏸ Stop' : '▶ Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectTrack(track)}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searched && (
            <p className="text-xs text-muted-foreground text-center py-2">Search from millions of real songs · 30-second previews</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Segment Picker ──────────────────────────────────────────────────
function SegmentPicker({
  audioSrc,
  startTime,
  endTime,
  onChange,
}: {
  audioSrc: string;
  startTime: number;
  endTime: number | null;
  onChange: (start: number, end: number) => void;
}) {
  const [duration, setDuration] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!audioSrc) return;
    const audio = new Audio(audioSrc);
    const onMeta = () => {
      const d = isFinite(audio.duration) ? audio.duration : 0;
      if (d > 0) {
        setDuration(d);
        // Initialise end to full duration on first load
        onChange(startTime, endTime ?? d);
      }
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.load();
    return () => audio.removeEventListener('loadedmetadata', onMeta);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  useEffect(() => () => {
    previewRef.current?.pause();
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const start = startTime;
  const end = endTime ?? duration;
  const segLen = Math.max(0, end - start);

  const togglePreview = () => {
    if (previewing) {
      previewRef.current?.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPreviewing(false);
      return;
    }
    const audio = new Audio(audioSrc);
    audio.currentTime = start;
    audio.play().catch(() => {});
    previewRef.current = audio;
    setPreviewing(true);
    intervalRef.current = setInterval(() => {
      if (!previewRef.current) return;
      if (previewRef.current.ended || previewRef.current.currentTime >= end) {
        previewRef.current.pause();
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPreviewing(false);
      }
    }, 150);
  };

  if (!duration) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading audio…
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Music2 className="h-3.5 w-3.5 text-primary" />
          Pick a segment
        </p>
        <span className="text-xs text-muted-foreground">
          {fmt(segLen)} selected · full: {fmt(duration)}
        </span>
      </div>

      {/* Visual range bar */}
      <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute h-full rounded-full bg-primary transition-all duration-100"
          style={{
            left: `${(start / duration) * 100}%`,
            width: `${(segLen / duration) * 100}%`,
          }}
        />
      </div>

      {/* Start slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-8 shrink-0">Start</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={start}
          onChange={e => onChange(Math.min(Number(e.target.value), end - 1), end)}
          className="flex-1 accent-primary cursor-pointer"
        />
        <span className="text-xs font-mono w-12 text-right tabular-nums">{fmt(start)}</span>
      </div>

      {/* End slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-8 shrink-0">End</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={end}
          onChange={e => onChange(start, Math.max(Number(e.target.value), start + 1))}
          className="flex-1 accent-primary cursor-pointer"
        />
        <span className="text-xs font-mono w-12 text-right tabular-nums">{fmt(end)}</span>
      </div>

      {/* Preview */}
      <button
        type="button"
        onClick={togglePreview}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
      >
        {previewing
          ? <><Pause className="h-3.5 w-3.5" /> Stop preview</>
          : <><Play className="h-3.5 w-3.5" /> Preview segment</>
        }
      </button>
    </div>
  );
}

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
  const [songFile, setSongFile] = useState<File | null>(null);
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [audioStartTime, setAudioStartTime] = useState(0);
  const [audioEndTime, setAudioEndTime] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Object URL for the uploaded audio file — revoked when file changes
  const songPreviewUrl = useMemo(
    () => (songFile ? URL.createObjectURL(songFile) : null),
    [songFile],
  );
  useEffect(() => () => { if (songPreviewUrl) URL.revokeObjectURL(songPreviewUrl); }, [songPreviewUrl]);

  // The src we feed to SegmentPicker (iTunes URL or local object URL)
  const audioSrc = selectedSong?.previewUrl ?? songPreviewUrl;

  // Reset segment times whenever the audio source changes
  useEffect(() => {
    setAudioStartTime(0);
    setAudioEndTime(null);
  }, [audioSrc]);

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

  const uploadSong = async (): Promise<string | undefined> => {
    if (!songFile) return undefined;
    const formData = new FormData();
    formData.append('files', songFile);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Song upload failed');
    const { urls } = await res.json() as { urls: string[] };
    return urls[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim()) return;

    setUploading(true);
    let mediaUrls: string | undefined;
    let audioUrl: string | undefined;

    try {
      const [urls, songUrl] = await Promise.all([uploadFiles(), uploadSong()]);
      if (urls.length) mediaUrls = JSON.stringify(urls);
      audioUrl = selectedSong ? selectedSong.previewUrl : songUrl;
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload your files. Please try again.', variant: 'destructive' });
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
          audioUrl,
          songTitle: selectedSong?.name,
          songArtist: selectedSong?.artist,
          songArtworkUrl: selectedSong?.artwork,
          audioStartTime: audioStartTime > 0 ? audioStartTime : undefined,
          audioEndTime: audioEndTime !== null ? audioEndTime : undefined,
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
                  placeholder="My revolutionary idea"
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
                <Label>Photos & Videos</Label>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
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
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {mediaFiles.map((m, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                        {m.type === 'image'
                          ? <img src={m.preview} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted"><Film className="h-6 w-6 text-muted-foreground" /><span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-2">{m.file.name}</span></div>
                        }
                        <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {m.type === 'video' && <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium">VIDEO</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Song picker + segment picker */}
              <div className="space-y-3">
                <Label>Background Song</Label>
                <SongPicker
                  songFile={songFile} setSongFile={setSongFile}
                  selectedSong={selectedSong} setSelectedSong={setSelectedSong}
                />
                {audioSrc && (
                  <SegmentPicker
                    audioSrc={audioSrc}
                    startTime={audioStartTime}
                    endTime={audioEndTime}
                    onChange={(start, end) => {
                      setAudioStartTime(start);
                      setAudioEndTime(end);
                    }}
                  />
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
                        category === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'
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
                  {uploading ? 'Uploading…' : createPrototype.isPending ? 'Creating…' : 'Create Prototype'}
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
