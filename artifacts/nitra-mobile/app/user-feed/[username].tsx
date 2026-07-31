import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListUserPrototypes } from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';
import { TikTokCard, stopActiveMobileSound } from '@/components/TikTokCard';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

export default function UserFeedScreen() {
  const { username, initialIndex } = useLocalSearchParams<{ username: string; initialIndex?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);

  // Full-screen cards (no tab bar on this screen)
  const screenHeight = SCREEN_H;

  const { data: prototypes, isLoading } = useListUserPrototypes(username ?? '');
  const items: Prototype[] = (prototypes ?? []).filter((p: Prototype) => p.published);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  // Scroll to initial index after data loads
  useEffect(() => {
    const idx = initialIndex ? parseInt(initialIndex, 10) : 0;
    if (items.length > 0 && !hasScrolled.current && idx > 0 && idx < items.length) {
      hasScrolled.current = true;
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: false });
        setActiveIndex(idx);
      }, 80);
    }
  }, [items.length, initialIndex]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setActiveIndex(-1);
        stopActiveMobileSound();
      };
    }, []),
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: '#000', height: SCREEN_H }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' }}>
      {/* Back + title overlay */}
      <View
        style={[
          styles.header,
          { top: insets.top + (Platform.OS === 'web' ? 67 : 8) },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>@{username}</Text>
        <View style={{ width: 38 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={48} color="rgba(255,255,255,0.4)" />
          <Text style={styles.emptyText}>No posts yet</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <TikTokCard prototype={item} screenHeight={screenHeight} isActive={index === activeIndex} />
          )}
          pagingEnabled
          snapToInterval={screenHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({ length: screenHeight, offset: screenHeight * index, index })}
          onScrollToIndexFailed={() => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#000' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
