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
  const s = _activeMobileSound;
  _activeMobileSound = null;
  if (s) {
    s.stopAsync().catch(() => {});
    s.unloadAsync().catch(() => {});
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

  // Track pause as a ref so the async load closure always sees the latest value
  const pausedRef = useRef(false);

  // ── Pause / resume (user-driven) ─────────────────────────────────────────
  // Using a ref-based handler avoids stale-closure issues in handleCardTap.
  const handleCardTap = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);

    const s = soundRef.current;
    if (s) {
      if (next) s.pauseAsync().catch(() => {});
      else      s.playAsync().catch(() => {});
    }

    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashIcon(next ? 'pause' : 'play');
    flashTimer.current = setTimeout(() => setFlashIcon(null), 700);
  }, []);

  // ── Audio load / unload ──────────────────────────────────────────────────
  useEffect(() => {
    // ── Inactive: tear down immediately ────────────────────────
    if (!isActive) {
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        s.stopAsync().catch(() => {});
        s.unloadAsync().catch(() => {});
        if (_activeMobileSound === s) _activeMobileSound = null;
      }
      // Reset pause state for next time this card is shown
      pausedRef.current = false;
      setPaused(false);
      return;
    }

    // ── Active: load audio ──────────────────────────────────────
    if (!prototype.audioUrl) return;

    // Synchronously evict any globally-active sound from another card
    // BEFORE the async createAsync starts — prevents overlap.
    const prevGlobal = _activeMobileSound;
    _activeMobileSound = null;
    if (prevGlobal && prevGlobal !== soundRef.current) {
      prevGlobal.stopAsync().catch(() => {});
      prevGlobal.unloadAsync().catch(() => {});
    }
    // Also evict a stale instance on this card (e.g. after fast scroll-back)
    const prevOwn = soundRef.current;
    soundRef.current = null;
    if (prevOwn) {
      prevOwn.stopAsync().catch(() => {});
      prevOwn.unloadAsync().catch(() => {});
    }

    let cancelled = false;

    const load = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const startMs = (prototype.audioStartTime ?? 0) * 1000;
        const endMs   = prototype.audioEndTime != null ? prototype.audioEndTime * 1000 : null;
        const hasSegment = endMs !== null || startMs > 0;

        // Create WITHOUT shouldPlay:true — we start it manually after setup.
        // This prevents a brief double-play if the card is cancelled mid-load.
        const { sound } = await Audio.Sound.createAsync(
          { uri: prototype.audioUrl! },
          {
            shouldPlay: false,
            isLooping: !hasSegment,
            positionMillis: startMs,
            volume: 1,
          },
        );

        if (cancelled) {
          // Card became inactive while we were loading — discard silently
          await sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
        _activeMobileSound = sound;

        // Segment looping: seek back to startMs when we hit the end.
        // Guard with `status.isPlaying` so pausing near the end doesn't
        // cause an involuntary seek/restart.
        if (hasSegment) {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded || !status.isPlaying) return;
            const pos = status.positionMillis ?? 0;
            if ((endMs !== null && pos >= endMs - 200) || status.didJustFinish) {
              sound.setPositionAsync(startMs).catch(() => {});
              if (status.didJustFinish) sound.playAsync().catch(() => {});
            }
          });
        }

        // Only play if the user hasn't already tapped to pause
        if (!pausedRef.current) {
          await sound.playAsync().catch(() => {});
        }
      } catch {}
    };

    load();

    return () => {
      cancelled = true;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        s.stopAsync().catch(() => {});
        s.unloadAsync().catch(() => {});
        if (_activeMobileSound === s) _activeMobileSound = null;
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
      { text: 'Spam',          onPress: async () => { try { await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ prototypeId: prototype.id, reporterId: user.id, reason: 'Spam' }) }); } catch {} } },
      { text: 'Inappropriate', onPress: async () => { try { await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ prototypeId: prototype.id, reporterId: user.id, reason: 'Inappropriate' }) }); } catch {} } },
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

        {/* Audio strip */}
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
            {paused && (
              <Ionicons name="pause" size={12} color="rgba(255,255,255,0.6)" />
            )}
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
