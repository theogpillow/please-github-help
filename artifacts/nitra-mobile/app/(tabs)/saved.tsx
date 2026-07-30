import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useGetSaves, getGetSavesQueryKey } from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

function SavedCard({ item }: { item: Prototype }) {
  const router = useRouter();
  const colors = useColors();

  const mediaUrls: string[] = (() => {
    try { return item.mediaUrls ? JSON.parse(item.mediaUrls) : []; } catch { return []; }
  })();
  const imageUrl = item.imageUrl || mediaUrls[0] || null;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/prototype/${item.id}`)}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="rocket-outline" size={28} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.username && (
          <Text style={[styles.cardUsername, { color: colors.mutedForeground }]}>
            @{item.username}
          </Text>
        )}
        {item.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.categoryText, { color: colors.mutedForeground }]}>
              {item.category}
            </Text>
          </View>
        )}
        {(item.likeCount ?? 0) > 0 && (
          <View style={styles.likeRow}>
            <Ionicons name="heart" size={13} color="#f43f5e" />
            <Text style={[styles.likeText, { color: colors.mutedForeground }]}>
              {item.likeCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const savesParams = { userId: user?.id ?? 0 };
  const { data, isLoading, refetch, isRefetching } = useGetSaves(savesParams, {
    query: {
      enabled: !!user,
      queryKey: getGetSavesQueryKey(savesParams),
    },
  });

  useFocusEffect(
    useCallback(() => { if (user) refetch(); }, [refetch, user]),
  );

  const items: Prototype[] = data?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved posts yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tap the bookmark on any post to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SavedCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  list: { padding: 12, gap: 12 },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardImage: { width: 100, height: 100 },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
  cardInfo: { flex: 1, padding: 12, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardUsername: { fontSize: 12 },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  categoryText: { fontSize: 11, fontWeight: '600' },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  likeText: { fontSize: 12 },
});
