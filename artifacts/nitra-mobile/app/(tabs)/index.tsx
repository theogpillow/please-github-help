import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LinearGradient = ExpoLinearGradient as any;
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGetFeed } from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Gradient palettes for posts with no image
const GRADIENTS: [string, string][] = [
  ['#7c3aed', '#4338ca'],
  ['#6d28d9', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#c026d3', '#7c3aed'],
  ['#2563eb', '#4338ca'],
  ['#059669', '#0d9488'],
];
function getGradient(id: number): [string, string] {
  return GRADIENTS[id % GRADIENTS.length];
}

// ── API helpers ────────────────────────────────────────────────────────
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

// ── Right-rail action button ───────────────────────────────────────────
function RailBtn({
  name,
  label,
  color,
  onPress,
  size = 28,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color?: string;
  onPress?: () => void;
  size?: number;
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

// ── Single TikTok card ─────────────────────────────────────────────────
function TikTokCard({
  prototype,
  screenHeight,
  isActive,
}: {
  prototype: Prototype;
  screenHeight: number;
  isActive: boolean;
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

  // Respond to manual pause/play without reloading the sound
  useEffect(() => {
    if (!soundRef.current) return;
    if (paused) {
      soundRef.current.pauseAsync();
    } else {
      soundRef.current.playAsync();
    }
  }, [paused]);

  // Tap on card body → toggle pause
  const handleCardTap = useCallback(() => {
    const next = !paused;
    setPaused(next);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashIcon(next ? 'pause' : 'play');
    flashTimer.current = setTimeout(() => setFlashIcon(null), 700);
  }, [paused]);

  // Auto-play audio when this card becomes active, stop when it leaves.
  // Unloads any previous sound first to guarantee only one plays at a time.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!prototype.audioUrl) return;
      try {
        // Ensure previous instance is gone before creating a new one
        if (soundRef.current) {
          await soundRef.current.stopAsync().catch(() => {});
          await soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: prototype.audioUrl },
          { shouldPlay: true, isLooping: true, volume: 1 },
        );
        if (cancelled) { sound.unloadAsync(); return; }
        soundRef.current = sound;
        // Honour a pause the user may have set while the sound was loading
        if (paused) sound.pauseAsync();
      } catch {}
    };

    if (isActive) {
      load();
    } else {
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setPaused(false);
    }

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  // paused intentionally excluded — handled separately in handleCardTap
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, prototype.audioUrl]);


  const handleLike = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => next ? c + 1 : Math.max(0, c - 1));
    try {
      if (next) {
        const data = await apiFetch(`/api/prototypes/${prototype.id}/like`, {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        });
        setLikeCount(data.likeCount ?? 0);
        setLiked(data.isLiked ?? next);
      } else {
        const data = await apiFetch(
          `/api/prototypes/${prototype.id}/like?userId=${user.id}`,
          { method: 'DELETE' },
        );
        setLikeCount(data.likeCount ?? 0);
        setLiked(data.isLiked ?? next);
      }
    } catch {
      // revert
      setLiked(!next);
      setLikeCount((c) => !next ? c + 1 : Math.max(0, c - 1));
    }
  }, [liked, prototype.id, user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        await apiFetch(`/api/prototypes/${prototype.id}/save`, {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        });
      } else {
        await apiFetch(
          `/api/prototypes/${prototype.id}/save?userId=${user.id}`,
          { method: 'DELETE' },
        );
      }
    } catch {
      setSaved(!next);
    }
  }, [saved, prototype.id, user]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${prototype.title} — check it out on Nitra`,
        url: `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ''}/prototype/${prototype.id}`,
      });
    } catch {}
  }, [prototype]);

  const handleReport = useCallback(() => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Report Post', 'Why are you reporting this?', [
      {
        text: 'Spam', onPress: async () => {
          try { await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ prototypeId: prototype.id, reporterId: user.id, reason: 'Spam' }) }); }
          catch {}
        },
      },
      {
        text: 'Inappropriate', onPress: async () => {
          try { await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ prototypeId: prototype.id, reporterId: user.id, reason: 'Inappropriate' }) }); }
          catch {}
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [prototype.id, user]);

  const mediaUrls: string[] = (() => {
    try { return prototype.mediaUrls ? JSON.parse(prototype.mediaUrls) : []; } catch { return []; }
  })();
  const imageUrl = prototype.imageUrl || mediaUrls[0] || null;

  const cardStyle = { width: SCREEN_W, height: screenHeight };

  return (
    <Pressable style={[styles.card, cardStyle]} onPress={handleCardTap}>
      {/* Background */}
      {imageUrl ? (
        <ImageBackground source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={getGradient(prototype.id)} style={StyleSheet.absoluteFill} />
      )}

      {/* Dark gradient overlays */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[StyleSheet.absoluteFill, { top: '40%' }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'transparent']}
        style={[StyleSheet.absoluteFill, { bottom: '85%' }]}
        pointerEvents="none"
      />

      {/* ── Tap-to-pause flash icon ─────────────────── */}
      {flashIcon !== null && (
        <View style={styles.flashOverlay} pointerEvents="none">
          <View style={styles.flashCircle}>
            <Ionicons
              name={flashIcon === 'pause' ? 'pause' : 'play'}
              size={36}
              color="#fff"
            />
          </View>
        </View>
      )}

      {/* ── Right action rail ───────────────────────── */}
      <View style={styles.rail}>
        <RailBtn
          name={liked ? 'heart' : 'heart-outline'}
          label={likeCount > 0 ? String(likeCount) : 'Like'}
          color={liked ? '#f43f5e' : '#fff'}
          onPress={handleLike}
          size={30}
        />
        <RailBtn
          name="chatbubble-outline"
          label="Chat"
          onPress={() => prototype.username && router.push(`/conversation/${prototype.username}`)}
        />
        <RailBtn
          name={saved ? 'bookmark' : 'bookmark-outline'}
          label={saved ? 'Saved' : 'Save'}
          color={saved ? '#fbbf24' : '#fff'}
          onPress={handleSave}
          size={28}
        />
        <RailBtn
          name="arrow-redo-outline"
          label="Share"
          onPress={handleShare}
        />
        <RailBtn
          name="open-outline"
          label="View"
          size={24}
          onPress={() => router.push(`/prototype/${prototype.id}`)}
        />
        {user && user.id !== prototype.userId && (
          <RailBtn
            name="flag-outline"
            label="Report"
            color="rgba(255,255,255,0.5)"
            size={20}
            onPress={handleReport}
          />
        )}
      </View>

      {/* ── Bottom-left creator info ─────────────────── */}
      <View style={styles.info}>
        {/* Creator row */}
        {prototype.username && (
          <Pressable
            style={styles.creatorRow}
            onPress={() => router.push(`/user/${prototype.username}`)}
          >
            <Avatar
              uri={prototype.creatorAvatarUrl}
              username={prototype.username}
              size={38}
              verified={prototype.creatorIsVerified}
            />
            <Text style={styles.username}>@{prototype.username}</Text>
          </Pressable>
        )}

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{prototype.title}</Text>

        {/* Category */}
        {prototype.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{prototype.category}</Text>
          </View>
        )}

        {/* Description */}
        {prototype.description ? (
          <Pressable onPress={() => setDescExpanded((v) => !v)}>
            <Text style={styles.description} numberOfLines={descExpanded ? undefined : 2}>
              {prototype.description}
              {!descExpanded && (prototype.description?.length ?? 0) > 80 && (
                <Text style={styles.more}> more</Text>
              )}
            </Text>
          </Pressable>
        ) : null}

        {/* Audio strip — tap the card to pause/play */}
        {prototype.audioUrl ? (
          <View style={styles.audioStrip} pointerEvents="none">
            <Ionicons name="musical-notes" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.audioText} numberOfLines={1}>
              {prototype.audioUrl.split('/').pop()?.replace(/^\d+-[a-z0-9]+\./, '') ?? 'Song'}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Feed screen ────────────────────────────────────────────────────────
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  // Full screen height: subtract tab bar (~83pt) and status bar on web
  const tabBarH = Platform.OS === 'web' ? 84 : 49 + insets.bottom;
  const screenHeight = SCREEN_H - tabBarH;

  const { data, isLoading, refetch, isRefetching } = useGetFeed({
    limit: 30,
    offset: 0,
    viewerId: user?.id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      // Return cleanup: runs when the tab loses focus — stops all card audio
      return () => {
        setActiveIndex(-1);
      };
    }, [refetch]),
  );

  const items: Prototype[] = data?.items ?? [];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: '#000', height: screenHeight }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, height: screenHeight }]}>
        <Ionicons name="rocket-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Be the first to post your prototype
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: SCREEN_W, height: screenHeight, backgroundColor: '#000' }}>
      {/* Logo overlay */}
      <View style={[styles.logoOverlay, { top: insets.top + (Platform.OS === 'web' ? 67 : 12) }]}>
        <Text style={styles.logoText}>nitra</Text>
        <Pressable onPress={() => router.push('/search')} hitSlop={8}>
          <Ionicons name="search" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <TikTokCard
            prototype={item}
            screenHeight={screenHeight}
            isActive={index === activeIndex}
          />
        )}
        pagingEnabled
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
        getItemLayout={(_, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  // Card
  card: { position: 'relative', overflow: 'hidden', backgroundColor: '#000' },

  // Right rail
  rail: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 18,
    zIndex: 10,
  },
  railBtn: { alignItems: 'center', gap: 4 },
  railBtnCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom info
  info: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    right: 76,
    gap: 6,
    zIndex: 10,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  description: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  more: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  audioStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 2,
  },
  audioText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    maxWidth: 180,
  },

  // Flash icon overlay
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  flashCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo overlay
  logoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
