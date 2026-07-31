import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetFeed } from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { TikTokCard, stopActiveMobileSound } from '@/components/TikTokCard';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

  // Full screen height minus the tab bar
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
      return () => {
        setActiveIndex(-1);
        stopActiveMobileSound();
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
      {/* Logo + search overlay */}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
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
