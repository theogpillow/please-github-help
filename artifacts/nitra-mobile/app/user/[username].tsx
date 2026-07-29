import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  useCheckFollowStatus,
  useCreateConversation,
  useFollowUser,
  useGetFollowCounts,
  useGetUser,
  useGetUserStats,
  useListUserPrototypes,
  useUnfollowUser,
  getCheckFollowStatusQueryKey,
} from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

function StatBox({ value, label, colors }: { value: number | undefined; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value ?? '—'}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { alignItems: 'center', flex: 1 },
  value: { fontSize: 20, fontWeight: '700' as const },
  label: { fontSize: 12, marginTop: 2 },
});

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [followLoading, setFollowLoading] = useState(false);

  const { data: profile, isLoading } = useGetUser(username);
  const { data: stats } = useGetUserStats(username);
  const { data: followCounts, refetch: refetchCounts } = useGetFollowCounts(username);
  const { data: prototypes } = useListUserPrototypes(username);
  const { data: followStatus, refetch: refetchFollowStatus } = useCheckFollowStatus(
    username,
    user?.id ?? 0,
    { query: { queryKey: getCheckFollowStatusQueryKey(username, user?.id ?? 0), enabled: !!user && !!username } },
  );

  const { mutateAsync: followUser } = useFollowUser();
  const { mutateAsync: unfollowUser } = useUnfollowUser();
  const { mutateAsync: createConversation } = useCreateConversation();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const isFollowing = followStatus?.following ?? false;

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    setFollowLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isFollowing) {
        await unfollowUser({ username, data: { followerId: user.id } });
      } else {
        await followUser({ username, data: { followerId: user.id } });
      }
      await Promise.all([refetchCounts(), refetchFollowStatus()]);
    } catch {}
    setFollowLoading(false);
  };

  const handleMessage = async () => {
    if (!user || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const conversation = await createConversation({
        data: { initiatorId: user.id, recipientId: profile.id },
      });
      router.push({
        pathname: '/conversation/[id]',
        params: {
          id: conversation.id,
          title: username,
          otherIsVerified: profile.isVerified ? '1' : '0',
        },
      });
    } catch {}
  };

  const publishedPrototypes = (prototypes ?? []).filter((p: Prototype) => p.published);
  const isSelf = user?.username === username;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          @{username}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={publishedPrototypes}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            <View style={styles.avatarRow}>
              <Avatar
                uri={profile?.avatarUrl}
                username={username}
                size={72}
                verified={profile?.isVerified}
              />
              {!isSelf && user && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={handleFollowToggle}
                    disabled={followLoading}
                    style={({ pressed }) => [
                      styles.followBtn,
                      {
                        backgroundColor: isFollowing ? colors.secondary : colors.primary,
                        borderColor: isFollowing ? colors.border : colors.primary,
                        opacity: pressed || followLoading ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.followBtnText, { color: isFollowing ? colors.foreground : colors.primaryForeground }]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleMessage}
                    style={({ pressed }) => [
                      styles.msgBtn,
                      { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.foreground} />
                  </Pressable>
                </View>
              )}
            </View>

            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {profile?.companyName ?? username}
            </Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{username}</Text>

            {profile?.bio ? (
              <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>
            ) : null}

            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <StatBox value={stats?.publishedCount} label="Posts" colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatBox value={followCounts?.followers} label="Followers" colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatBox value={followCounts?.following} label="Following" colors={colors} />
            </View>

            {publishedPrototypes.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posts</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/prototype/${item.id}`)}
            style={({ pressed }) => [
              styles.protoRow,
              { borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={styles.protoRowContent}>
              <Text style={[styles.protoTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.category ? (
                <View style={[styles.catBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.catText, { color: colors.primary }]}>{item.category}</Text>
                </View>
              ) : null}
            </View>
            {item.description ? (
              <Text style={[styles.protoDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No published prototypes yet
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navTitle: { fontSize: 16, fontWeight: '600' as const, flex: 1, textAlign: 'center' },
  loader: { flex: 1 },
  profileHeader: { paddingHorizontal: 20, paddingTop: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  followBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  followBtnText: { fontSize: 14, fontWeight: '600' as const },
  msgBtn: { width: 40, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  displayName: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  handle: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 14, marginTop: 10, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  statDivider: { width: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 10 },
  protoRow: { marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  protoRowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  protoTitle: { fontSize: 15, fontWeight: '600' as const, flex: 1, marginRight: 8 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  catText: { fontSize: 11, fontWeight: '600' as const },
  protoDesc: { fontSize: 13, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14 },
});
