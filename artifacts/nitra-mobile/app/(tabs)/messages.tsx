import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListConversations, getListConversationsQueryKey } from '@workspace/api-client-react';
import type { Conversation } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: conversations, isLoading, refetch } = useListConversations(
    { userId: user?.id ?? 0 },
    { query: { queryKey: getListConversationsQueryKey({ userId: user?.id ?? 0 }), enabled: !!user } },
  );

  useFocusEffect(
    useCallback(() => {
      if (user) refetch();
    }, [refetch, user]),
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const renderItem = ({ item }: { item: Conversation }) => {
    if (!user) return null;
    const isInitiator = item.initiatorId === user.id;
    const otherUsername = isInitiator ? item.recipientUsername : item.initiatorUsername;
    const otherIsVerified = isInitiator ? item.recipientIsVerified : item.initiatorIsVerified;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/conversation/[id]',
            params: {
              id: item.id,
              title: otherUsername ?? 'Unknown',
              otherIsVerified: otherIsVerified ? '1' : '0',
            },
          })
        }
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: colors.border, backgroundColor: pressed ? colors.secondary : colors.background },
        ]}
      >
        <Avatar username={otherUsername} size={46} verified={otherIsVerified} />
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowName, { color: colors.foreground }]}>
              {otherUsername ?? 'Unknown'}
            </Text>
            <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
              {timeAgo(item.lastMessageAt ?? item.createdAt)}
            </Text>
          </View>
          {item.lastMessage ? (
            <Text style={[styles.rowPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          ) : (
            <Text style={[styles.rowPreview, { color: colors.mutedForeground }]}>
              New conversation
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : !conversations || conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Visit a founder's profile to start a conversation
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          scrollEnabled={conversations.length > 0}
        />
      )}
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
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  loader: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const },
  emptyText: { fontSize: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowName: { fontSize: 15, fontWeight: '600' as const },
  rowTime: { fontSize: 12 },
  rowPreview: { fontSize: 14 },
});
