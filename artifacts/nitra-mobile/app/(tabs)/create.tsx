import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCreatePrototype, usePublishPrototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

// ── API helper ───────────────────────────────────────────────────────────────
const apiBase = () =>
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';

// ── Types ────────────────────────────────────────────────────────────────────
interface MediaAsset {
  uri: string;
  type: 'image' | 'video';
  name: string;
  mimeType: string;
}

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
  artwork: string;
  previewUrl: string;
}

const CATEGORIES = ['Software', 'Hardware', 'AI', 'Social', 'Fintech', 'Health', 'Other'];

// ── Segment Picker ───────────────────────────────────────────────────────────
const THUMB_SIZE = 22;

function TrackSlider({
  value, min, max, onChange, colors,
}: {
  value: number; min: number; max: number;
  onChange: (v: number) => void; colors: ReturnType<typeof useColors>;
}) {
  const [trackW, setTrackW] = useState(0);
  const pct = trackW > 0 ? Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min))) : 0;
  const fillW = pct * trackW;
  const thumbLeft = Math.max(0, Math.min(trackW - THUMB_SIZE, fillW - THUMB_SIZE / 2));

  const handle = (x: number) => {
    if (trackW <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / trackW));
    onChange(Math.round(min + ratio * (max - min)));
  };

  return (
    <View
      style={{ flex: 1, height: THUMB_SIZE, justifyContent: 'center', marginHorizontal: 4 }}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => handle(e.nativeEvent.locationX)}
      onResponderMove={(e) => handle(e.nativeEvent.locationX)}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.muted, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: fillW, backgroundColor: colors.primary }} />
      </View>
      {trackW > 0 && (
        <View style={{
          position: 'absolute', left: thumbLeft,
          width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
          backgroundColor: colors.primary,
          elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
        }} />
      )}
    </View>
  );
}

function SegmentPicker({
  audioUrl, startTime, endTime, onChange, colors,
}: {
  audioUrl: string; startTime: number; endTime: number | null;
  onChange: (start: number, end: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [duration, setDuration] = useState(0);
  const [barW, setBarW] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const previewRef = useRef<InstanceType<typeof Audio.Sound> | null>(null);

  // Load duration
  useEffect(() => {
    if (!audioUrl) return;
    let sound: InstanceType<typeof Audio.Sound> | null = null;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const result = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
        sound = result.sound;
        const status = result.status;
        if (status.isLoaded && status.durationMillis) {
          const d = status.durationMillis / 1000;
          setDuration(d);
          onChange(startTime, endTime ?? d);
        }
        await sound.unloadAsync();
        sound = null;
      } catch {}
    })();
    return () => { sound?.unloadAsync().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  useEffect(() => () => { previewRef.current?.unloadAsync().catch(() => {}); }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const start = startTime;
  const end = endTime ?? duration;
  const segLen = Math.max(0, end - start);

  const togglePreview = async () => {
    if (previewing) {
      await previewRef.current?.stopAsync().catch(() => {});
      await previewRef.current?.unloadAsync().catch(() => {});
      previewRef.current = null; setPreviewing(false); return;
    }
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true, positionMillis: start * 1000 });
      previewRef.current = sound; setPreviewing(true);
      const endMs = end * 1000;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if ((status.positionMillis ?? 0) >= endMs - 200 || status.didJustFinish) {
          sound.stopAsync().catch(() => {}); setPreviewing(false);
        }
      });
    } catch {}
  };

  if (!duration) {
    return (
      <View style={segStyles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[segStyles.loadingText, { color: colors.mutedForeground }]}>Loading audio…</Text>
      </View>
    );
  }

  return (
    <View style={[segStyles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={segStyles.topRow}>
        <Text style={[segStyles.title, { color: colors.foreground }]}>Pick a segment</Text>
        <Text style={[segStyles.meta, { color: colors.mutedForeground }]}>
          {fmt(segLen)} of {fmt(duration)}
        </Text>
      </View>

      {/* Visual range bar */}
      <View
        style={[segStyles.rangeBar, { backgroundColor: colors.muted }]}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
      >
        {barW > 0 && (
          <View style={{
            position: 'absolute',
            left: (start / duration) * barW,
            width: (segLen / duration) * barW,
            top: 0, bottom: 0,
            backgroundColor: colors.primary, borderRadius: 4,
          }} />
        )}
      </View>

      {/* Start slider */}
      <View style={segStyles.sliderRow}>
        <Text style={[segStyles.sliderLabel, { color: colors.mutedForeground }]}>Start</Text>
        <TrackSlider value={start} min={0} max={Math.max(0, Math.floor(end) - 1)} onChange={(v) => onChange(v, end)} colors={colors} />
        <Text style={[segStyles.sliderTime, { color: colors.foreground }]}>{fmt(start)}</Text>
      </View>

      {/* End slider */}
      <View style={segStyles.sliderRow}>
        <Text style={[segStyles.sliderLabel, { color: colors.mutedForeground }]}>End</Text>
        <TrackSlider value={end} min={Math.ceil(start) + 1} max={duration} onChange={(v) => onChange(start, v)} colors={colors} />
        <Text style={[segStyles.sliderTime, { color: colors.foreground }]}>{fmt(end)}</Text>
      </View>

      {/* Preview */}
      <Pressable
        onPress={togglePreview}
        style={({ pressed }) => [segStyles.previewBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name={previewing ? 'stop-circle-outline' : 'play-circle-outline'} size={18} color={colors.primary} />
        <Text style={[segStyles.previewBtnText, { color: colors.foreground }]}>
          {previewing ? 'Stop preview' : 'Preview segment'}
        </Text>
      </Pressable>
    </View>
  );
}

const segStyles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  loadingText: { fontSize: 13 },
  container: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12 },
  rangeBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sliderLabel: { width: 32, fontSize: 12 },
  sliderTime: { width: 36, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'right' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  previewBtnText: { fontSize: 13, fontWeight: '500' },
});

// ── SongPicker ───────────────────────────────────────────────────────────────
function SongPicker({
  selected,
  onSelect,
  onClear,
  colors,
}: {
  selected: SelectedSong | null;
  onSelect: (s: SelectedSong) => void;
  onClear: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItunesTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

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

  const togglePreview = async (track: ItunesTrack) => {
    // stop current
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    if (playingId === track.trackId) {
      setPlayingId(null);
      return;
    }
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(track.trackId);
      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingId(null);
          soundRef.current?.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setPlayingId(null);
    }
  };

  const selectTrack = async (track: ItunesTrack) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlayingId(null);
    }
    onSelect({
      name: track.trackName,
      artist: track.artistName,
      artwork: track.artworkUrl100,
      previewUrl: track.previewUrl,
    });
  };

  // ── Selected state ───────────────────────────────────────────────
  if (selected) {
    return (
      <View style={[styles.songSelected, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Image source={{ uri: selected.artwork }} style={styles.songArt} />
        <View style={styles.songInfo}>
          <Text style={[styles.songName, { color: colors.foreground }]} numberOfLines={1}>
            {selected.name}
          </Text>
          <Text style={[styles.songArtist, { color: colors.mutedForeground }]} numberOfLines={1}>
            {selected.artist}
          </Text>
        </View>
        <Pressable onPress={onClear} hitSlop={10}>
          <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }

  // ── Search UI ────────────────────────────────────────────────────
  return (
    <View style={styles.songPicker}>
      <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.input }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search any song or artist…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            onPress={handleSearch}
            disabled={searching}
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          >
            {searching
              ? <ActivityIndicator size="small" color={colors.primaryForeground} />
              : <Text style={[styles.searchBtnText, { color: colors.primaryForeground }]}>Go</Text>
            }
          </Pressable>
        )}
      </View>

      {!searched && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Search from millions of songs · 30-second previews
        </Text>
      )}

      {searched && !searching && results.length === 0 && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          No songs found. Try a different search.
        </Text>
      )}

      {results.length > 0 && (
        <View style={[styles.resultsList, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {results.map((track, i) => (
            <View
              key={track.trackId}
              style={[styles.resultRow, i < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <Image source={{ uri: track.artworkUrl100 }} style={styles.resultArt} />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>
                  {track.trackName}
                </Text>
                <Text style={[styles.resultArtist, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {track.artistName}
                </Text>
              </View>
              <View style={styles.resultActions}>
                <Pressable
                  onPress={() => togglePreview(track)}
                  style={[styles.previewBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Ionicons
                    name={playingId === track.trackId ? 'pause' : 'play'}
                    size={13}
                    color={colors.foreground}
                  />
                </Pressable>
                <Pressable
                  onPress={() => selectTrack(track)}
                  style={[styles.selectBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.selectBtnText, { color: colors.primaryForeground }]}>Use</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [audioStartTime, setAudioStartTime] = useState(0);
  const [audioEndTime, setAudioEndTime] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Reset segment times when song changes
  useEffect(() => {
    setAudioStartTime(0);
    setAudioEndTime(null);
  }, [selectedSong?.previewUrl]);

  const { mutateAsync: createPrototype, isPending: isCreating } = useCreatePrototype();
  const { mutateAsync: publishPrototype, isPending: isPublishing } = usePublishPrototype();

  const isLoading = uploading || isCreating || isPublishing;

  // ── Pickers ─────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to add media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 20 - mediaAssets.length,
    });
    if (!result.canceled) {
      const newAssets: MediaAsset[] = result.assets.map(a => ({
        uri: a.uri,
        type: a.type === 'video' ? 'video' : 'image',
        name: a.fileName ?? `media-${Date.now()}`,
        mimeType: a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      }));
      setMediaAssets(prev => [...prev, ...newAssets].slice(0, 20));
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) {
      const a = result.assets[0];
      const asset: MediaAsset = {
        uri: a.uri,
        type: 'image',
        name: a.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: a.mimeType ?? 'image/jpeg',
      };
      setMediaAssets(prev => [...prev, asset].slice(0, 20));
    }
  };

  const removeMedia = (index: number) => {
    setMediaAssets(prev => prev.filter((_, i) => i !== index));
  };

  const showMediaPicker = () => {
    Alert.alert('Add Media', 'Choose a source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Upload ────────────────────────────────────────────────────────
  const uploadMedia = async (): Promise<string[]> => {
    if (!mediaAssets.length) return [];
    const formData = new FormData();
    mediaAssets.forEach(asset => {
      formData.append('files', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      } as unknown as Blob);
    });
    const res = await fetch(`${apiBase()}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Media upload failed');
    const { urls } = await res.json() as { urls: string[] };
    return urls;
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleCreate = async (andPublish: boolean) => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your prototype a name.');
      return;
    }
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setUploading(true);
    let mediaUrls: string | undefined;
    let audioUrl: string | undefined;

    try {
      const urls = await uploadMedia();
      if (urls.length) mediaUrls = JSON.stringify(urls);
      audioUrl = selectedSong?.previewUrl;
    } catch {
      Alert.alert('Upload failed', 'Could not upload your files. Please try again.');
      setUploading(false);
      return;
    }
    setUploading(false);

    try {
      const proto = await createPrototype({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          prompt: prompt.trim() || undefined,
          userId: user.id,
          mediaUrls,
          audioUrl,
          songTitle: selectedSong?.name,
          songArtist: selectedSong?.artist,
          songArtworkUrl: selectedSong?.artwork,
          audioStartTime: selectedSong?.previewUrl ? audioStartTime : undefined,
          audioEndTime: selectedSong?.previewUrl && audioEndTime != null ? audioEndTime : undefined,
        },
      });

      if (andPublish) {
        await publishPrototype({ id: proto.id });
        await queryClient.invalidateQueries();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Published!', 'Your prototype is live on the feed.', [
          { text: 'View Feed', onPress: () => router.replace('/(tabs)') },
          { text: 'Keep creating' },
        ]);
      } else {
        Alert.alert('Saved', 'Your prototype has been saved as a draft.');
      }

      setTitle('');
      setDescription('');
      setCategory('');
      setPrompt('');
      setMediaAssets([]);
      setSelectedSong(null);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create prototype.');
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Prototype</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="What are you building?"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 100 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, height: 100, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder="Describe your idea…"
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        {/* Photos & Videos */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Photos & Videos</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Up to 20 files — shown as carousel on your post
          </Text>

          {/* Thumbnails grid */}
          {mediaAssets.length > 0 && (
            <View style={styles.mediaGrid}>
              {mediaAssets.map((asset, i) => (
                <View key={i} style={styles.mediaTile}>
                  <Image source={{ uri: asset.uri }} style={styles.mediaThumb} resizeMode="cover" />
                  {asset.type === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="videocam" size={10} color="#fff" />
                    </View>
                  )}
                  <Pressable
                    onPress={() => removeMedia(i)}
                    style={styles.mediaRemove}
                    hitSlop={6}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Add button */}
          {mediaAssets.length < 20 && (
            <Pressable
              onPress={showMediaPicker}
              style={({ pressed }) => [
                styles.addMediaBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.addMediaIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="image-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.addMediaTitle, { color: colors.foreground }]}>
                  {mediaAssets.length > 0 ? `Add more · ${mediaAssets.length}/20` : 'Add photo or video'}
                </Text>
                <Text style={[styles.addMediaSub, { color: colors.mutedForeground }]}>
                  Camera or library · images & videos
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Background Song */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Background Song</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Plays on your post in the feed
          </Text>
          <SongPicker
            selected={selectedSong}
            onSelect={setSelectedSong}
            onClear={() => setSelectedSong(null)}
            colors={colors}
          />
          {selectedSong?.previewUrl && (
            <View style={{ marginTop: 12 }}>
              <SegmentPicker
                audioUrl={selectedSong.previewUrl}
                startTime={audioStartTime}
                endTime={audioEndTime}
                onChange={(s, e) => { setAudioStartTime(s); setAudioEndTime(e); }}
                colors={colors}
              />
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat === category ? '' : cat)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.secondary,
                    borderColor: category === cat ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: category === cat ? colors.primaryForeground : colors.foreground }]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* AI Prompt */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>AI Prompt</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Describe what you want AI to build or elaborate on
          </Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 80 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder="Generate a landing page for…"
              placeholderTextColor={colors.mutedForeground}
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => handleCreate(true)}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : isPublishing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Create & Publish
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleCreate(false)}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: pressed || isLoading ? 0.7 : 1 },
            ]}
          >
            {isCreating && !isPublishing && !uploading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Save Draft</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  field: { marginBottom: 22 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    marginBottom: 10,
    marginTop: -2,
    lineHeight: 16,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
  },

  // Media
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  mediaTile: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 3,
  },
  mediaRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  addMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addMediaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  addMediaSub: {
    fontSize: 12,
  },

  // Song picker
  songPicker: { gap: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    paddingLeft: 12,
    height: 46,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  searchBtn: {
    height: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsList: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: 340,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  resultArt: {
    width: 46,
    height: 46,
    borderRadius: 8,
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultArtist: {
    fontSize: 11,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  previewBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtn: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  songSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  songArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  songInfo: { flex: 1 },
  songName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: { fontSize: 12 },

  // Categories
  chips: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Actions
  actions: { gap: 10, marginTop: 8 },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
