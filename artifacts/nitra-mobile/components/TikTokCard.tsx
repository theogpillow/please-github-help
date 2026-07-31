/**
 * Shared TikTok-style card used by Feed, UserFeed, and SavedFeed.
 * Handles audio playback with segment support (audioStartTime / audioEndTime).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LinearGradient = ExpoLinearGradient as any;
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Prototype } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Module-level singleton: only one sound plays at a time ──────────────────
let _activeMobileSound: Audio.Sound | null = null;

export function stopActiveMobileSound() {
  if (_activeMobileSound) {
    _activeMobileSound.stopAsync().catch(() => {});
    _activeMobileSound.unloadAsync().catch(() => {});
    _activeMobileSound = null;
  }
}

// ── Gradient palettes ───────────────────────────────────────────────────────
const GRADIENTS: [string, string][] = [
  ['#7c3aed', '#4338ca'],
  ['#6d28d9', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#c026d3', '#7c3aed'],
  ['#2563eb', '#4338ca'],
  ['#059669', '#0d9488'],
];
export function getCardGradient(id: number): [string, string] {
  return GRADIENTS[id % GRADIENTS.length];
}

// ── API helper ──────────────────────────────────────────────────────────────
const apiBase = () =>
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Right-rail action button ────────────────────────────────────────────────
function RailBtn({
  name, label, color, onPress, size = 28,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string; color?: string; onPress?: () => void; size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.railBtn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={6}
    >
      <View style={styles.railBtnCircle}>
        <Ionicons name={name} size={size} color={color ?? '#fff'} />
      </View>
      <Text style={styles.railLabel}>{label}</Text>
    </Pressable>
  );
}

// ── Main TikTokCard ─────────────────────────────────────────────────────────
export function TikTokCard({
  prototype, screenHeight, isActive,
}: {
  prototype: Prototype; screenHeight: number; isActive: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [liked, setLiked] = useState(prototype.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(prototype.likeCount ?? 0);
  const [saved, setSaved] = useState(prototype.isSaved ?? false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'play' | 'pause' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Pause/resume without reloading sound
  useEffect(() => {
    if (!soundRef.current) return;
    if (paused) soundRef.current.pauseAsync().catch(() => {});
    else        soundRef.current.playAsync().catch(() => {});
  }, [paused]);

  const handleCardTap = useCallback(() => {
    const next = !paused;
    setPaused(next);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashIcon(next ? 'pause' : 'play');
    flashTimer.current = setTimeout(() => setFlashIcon(null), 700);
  }, [paused]);

  // Load / unload audio when card becomes active / inactive
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!prototype.audioUrl) return;
      try {
        // Stop the global active sound if it belongs to another card
        if (_activeMobileSound && _activeMobileSound !== soundRef.current) {
          await _activeMobileSound.stopAsync().catch(() => {});
          await _activeMobileSound.unloadAsync().catch(() => {});
          _activeMobileSound = null;
        }
        // Stop any previous instance on this card
        if (soundRef.current) {
          await soundRef.current.stopAsync().catch(() => {});
          await soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });

        const startMs = (prototype.audioStartTime ?? 0) * 1000;
        const endMs   = prototype.audioEndTime != null ? prototype.audioEndTime * 1000 : null;
        const hasSegment = endMs !== null || startMs > 0;

        const { sound } = await Audio.Sound.createAsync(
          { uri: prototype.audioUrl },
          { shouldPlay: true, isLooping: !hasSegment, positionMillis: startMs, volume: 1 },
        );
        if (cancelled) { sound.unloadAsync(); return; }

        soundRef.current = sound;
        _activeMobileSound = sound;

        // Segment looping: manual when segment constraints are set
        if (hasSegment) {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            const pos = status.positionMillis ?? 0;
            if ((endMs !== null && pos >= endMs - 200) || status.didJustFinish) {
              sound.setPositionAsync(startMs).catch(() => {});
              if (status.didJustFinish) sound.playAsync().catch(() => {});
            }
          });
        }

        if (paused) sound.pauseAsync().catch(() => {});
      } catch {}
    };

    if (isActive) {
      load();
    } else {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        if (_activeMobileSound === soundRef.current) _activeMobileSound = null;
        soundRef.current = null;
      }
      setPaused(false);
    }

    return () => {
      cancelled = true;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        if (_activeMobileSound === soundRef.current) _activeMobileSound = null;
        soundRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, prototype.audioUrl, prototype.audioStartTime, prototype.audioEndTime]);

  // ── Interactions ──────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => next ? c + 1 : Math.max(0, c - 1));
    try {
      if (next) {
        const data = await apiFetch(`/api/prototypes/${prototype.id}/like`, { method: 'POST', body: JSON.stringify({ userId: user.id }) });
        setLikeCount(data.likeCount ?? 0); setLiked(data.isLiked ?? next);
      } else {
        const data = await apiFetch(`/api/prototypes/${prototype.id}/like?userId=${user.id}`, { method: 'DELETE' });
        setLikeCount(data.likeCount ?? 0); setLiked(data.isLiked ?? next);
      }
    } catch { setLiked(!next); setLikeCount((c) => !next ? c + 1 : Math.max(0, c - 1)); }
  }, [liked, prototype.id, user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !saved; setSaved(next);
    try {
      if (next) { await apiFetch(`/api/prototypes/${prototype.id}/save`, { method: 'POST', body: JSON.stringify({ userId: user.id }) }); }
      else       { await apiFetch(`/api/prototypes/${prototype.id}/save?userId=${user.id}`, { method: 'DELETE' }); }
    } catch { setSaved(!next); }
  }, [saved, prototype.id, user]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: `${prototype.title} — check it out on Nitra`, url: `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ''}/prototype/${prototype.id}` });
    } catch {}
  }, [prototype]);

  const handleReport = useCallback(() => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Report Post', 'Why are you reporting this?', [
      { text: 'Spam',         onPress: async () => { try { await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ prototypeId: prototype.id, reporterId: user.id, reason: 'Spam' }) }); } catch {} } },
      { text: 'Inappropriate',onPress: async () => { try { await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ prototypeId: prototype.id, reporterId: user.id, reason: 'Inappropriate' }) }); } catch {} } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [prototype.id, user]);

  const mediaUrls: string[] = (() => { try { return prototype.mediaUrls ? JSON.parse(prototype.mediaUrls) : []; } catch { return []; } })();
  const imageUrl = prototype.imageUrl || mediaUrls[0] || null;

  return (
    <Pressable style={[styles.card, { width: SCREEN_W, height: screenHeight }]} onPress={handleCardTap}>
      {/* Background */}
      {imageUrl
        ? <ImageBackground source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <LinearGradient colors={getCardGradient(prototype.id)} style={StyleSheet.absoluteFill} />
      }

      {/* Dark overlays */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={[StyleSheet.absoluteFill, { top: '40%' }]} pointerEvents="none" />
      <LinearGradient colors={['rgba(0,0,0,0.25)', 'transparent']} style={[StyleSheet.absoluteFill, { bottom: '85%' }]} pointerEvents="none" />

      {/* Tap-to-pause flash */}
      {flashIcon !== null && (
        <View style={styles.flashOverlay} pointerEvents="none">
          <View style={styles.flashCircle}>
            <Ionicons name={flashIcon === 'pause' ? 'pause' : 'play'} size={36} color="#fff" />
          </View>
        </View>
      )}

      {/* Right rail */}
      <View style={styles.rail}>
        <RailBtn name={liked ? 'heart' : 'heart-outline'} label={likeCount > 0 ? String(likeCount) : 'Like'} color={liked ? '#f43f5e' : '#fff'} onPress={handleLike} size={30} />
        <RailBtn name="chatbubble-outline" label="Chat" onPress={() => prototype.username && router.push(`/conversation/${prototype.username}`)} />
        <RailBtn name={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? 'Saved' : 'Save'} color={saved ? '#fbbf24' : '#fff'} onPress={handleSave} size={28} />
        <RailBtn name="arrow-redo-outline" label="Share" onPress={handleShare} />
        <RailBtn name="open-outline" label="View" size={24} onPress={() => router.push(`/prototype/${prototype.id}`)} />
        {user && user.id !== prototype.userId && (
          <RailBtn name="flag-outline" label="Report" color="rgba(255,255,255,0.5)" size={20} onPress={handleReport} />
        )}
      </View>

      {/* Bottom info */}
      <View style={styles.info}>
        {prototype.username && (
          <Pressable style={styles.creatorRow} onPress={() => router.push(`/user/${prototype.username}`)}>
            <Avatar uri={prototype.creatorAvatarUrl} username={prototype.username} size={38} verified={prototype.creatorIsVerified} />
            <Text style={styles.username}>@{prototype.username}</Text>
          </Pressable>
        )}
        <Text style={styles.title} numberOfLines={2}>{prototype.title}</Text>
        {prototype.category && (
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{prototype.category}</Text></View>
        )}
        {prototype.description ? (
          <Pressable onPress={() => setDescExpanded(v => !v)}>
            <Text style={styles.description} numberOfLines={descExpanded ? undefined : 2}>
              {prototype.description}
              {!descExpanded && (prototype.description?.length ?? 0) > 80 && <Text style={styles.more}> more</Text>}
            </Text>
          </Pressable>
        ) : null}

        {/* Audio strip — shows artwork + song title + artist */}
        {prototype.audioUrl ? (
          <View style={styles.audioStrip} pointerEvents="none">
            {prototype.songArtworkUrl
              ? <Image source={{ uri: prototype.songArtworkUrl }} style={styles.audioArt} />
              : <Ionicons name="musical-notes" size={14} color="rgba(255,255,255,0.85)" />
            }
            <View style={styles.audioMeta}>
              <Text style={styles.audioTitle} numberOfLines={1}>
                {prototype.songTitle ?? 'Song'}
              </Text>
              {prototype.songArtist ? (
                <Text style={styles.audioArtist} numberOfLines={1}>{prototype.songArtist}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { position: 'relative', overflow: 'hidden', backgroundColor: '#000' },
  rail: { position: 'absolute', right: 12, bottom: 100, alignItems: 'center', gap: 18, zIndex: 10 },
  railBtn: { alignItems: 'center', gap: 4 },
  railBtnCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  railLabel: { color: '#fff', fontSize: 11, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  info: { position: 'absolute', bottom: 24, left: 14, right: 76, gap: 6, zIndex: 10 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  username: { color: '#fff', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  description: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  more: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  audioStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.45)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginTop: 2, maxWidth: '90%' },
  audioArt: { width: 28, height: 28, borderRadius: 6 },
  audioMeta: { flex: 1 },
  audioTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '600' },
  audioArtist: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 1 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 15 },
  flashCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
