import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LinearGradient = ExpoLinearGradient as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetFollowCounts,
  useGetUser,
  useGetUserStats,
  useListUserPrototypes,
  useUpdateUser,
  getGetUserQueryKey,
  getGetUserStatsQueryKey,
  getGetFollowCountsQueryKey,
  getListUserPrototypesQueryKey,
} from '@workspace/api-client-react';
import type { Prototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';
import { getCardGradient } from '@/components/TikTokCard';

const CELL_SIZE = Dimensions.get('window').width / 3;

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

function GridCell({ item, index, username }: { item: Prototype; index: number; username: string }) {
  const router = useRouter();
  const mediaUrls: string[] = (() => { try { return item.mediaUrls ? JSON.parse(item.mediaUrls) : []; } catch { return []; } })();
  const imageUrl = item.imageUrl || mediaUrls[0] || null;

  return (
    <Pressable
      style={({ pressed }) => [gridStyles.cell, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => router.push({ pathname: '/user-feed/[username]', params: { username, initialIndex: String(index) } })}
    >
      {imageUrl
        ? <Image source={{ uri: imageUrl }} style={gridStyles.cellImage} resizeMode="cover" />
        : <LinearGradient colors={getCardGradient(item.id)} style={gridStyles.cellImage} />
      }
      {/* Badges */}
      <View style={gridStyles.badges}>
        {item.audioUrl && (
          <View style={gridStyles.badge}>
            <Ionicons name="musical-notes" size={9} color="#fff" />
          </View>
        )}
        {mediaUrls.length > 1 && (
          <View style={gridStyles.badge}>
            <Ionicons name="copy-outline" size={9} color="#fff" />
          </View>
        )}
      </View>
    </Pressable>
  );
}
const gridStyles = StyleSheet.create({
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: StyleSheet.hairlineWidth, borderColor: '#000' },
  cellImage: { width: '100%', height: '100%' },
  badges: { position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 3 },
  badge: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2 },
});

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateLocalUser } = useAuth();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editBio, setEditBio] = useState(user?.bio ?? '');
  const [editCompany, setEditCompany] = useState(user?.companyName ?? '');
  const [editCompanyBio, setEditCompanyBio] = useState(user?.companyBio ?? '');
  const [saving, setSaving] = useState(false);

  const username = user?.username ?? '';

  const { data: profile, isLoading: profileLoading } = useGetUser(username, { query: { queryKey: getGetUserQueryKey(username), enabled: !!username } });
  const { data: stats } = useGetUserStats(username, { query: { queryKey: getGetUserStatsQueryKey(username), enabled: !!username } });
  const { data: followCounts } = useGetFollowCounts(username, { query: { queryKey: getGetFollowCountsQueryKey(username), enabled: !!username } });
  const { data: prototypes, refetch, isRefetching } = useListUserPrototypes(username, { query: { queryKey: getListUserPrototypesQueryKey(username), enabled: !!username } });
  const { mutateAsync: updateUser } = useUpdateUser();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser({
        username: user.username,
        data: {
          bio: editBio.trim() || undefined,
          companyName: editCompany.trim() || undefined,
          companyBio: editCompanyBio.trim() || undefined,
        },
      });
      updateLocalUser({
        bio: editBio.trim() || null,
        companyName: editCompany.trim() || null,
        companyBio: editCompanyBio.trim() || null,
      });
      setEditModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const publishedPrototypes = (prototypes ?? []).filter((p: Prototype) => p.published);

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/feedback')} hitSlop={8}>
            <Ionicons name="sparkles-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={handleLogout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={publishedPrototypes}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            {/* Avatar row */}
            <View style={styles.avatarRow}>
              <Avatar uri={user?.avatarUrl} username={user?.username} size={72} verified={user?.isVerified} />
              <Pressable
                onPress={() => { setEditBio(user?.bio ?? ''); setEditCompany(user?.companyName ?? ''); setEditCompanyBio(user?.companyBio ?? ''); setEditModalVisible(true); }}
                style={[styles.editBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit Profile</Text>
              </Pressable>
            </View>

            {/* Name / username */}
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.companyName ?? user?.username}</Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{user?.username}</Text>
            {user?.bio ? <Text style={[styles.bio, { color: colors.foreground }]}>{user.bio}</Text> : null}

            {/* Stats */}
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <StatBox value={stats?.publishedCount} label="Posts" colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatBox value={followCounts?.followers} label="Followers" colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatBox value={followCounts?.following} label="Following" colors={colors} />
            </View>

            {/* Grid header: Posts label + Play All */}
            {publishedPrototypes.length > 0 && (
              <View style={styles.gridHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posts</Text>
                <Pressable
                  onPress={() => router.push({ pathname: '/user-feed/[username]', params: { username } })}
                  style={[styles.playAllBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="play" size={12} color={colors.primaryForeground} />
                  <Text style={[styles.playAllText, { color: colors.primaryForeground }]}>Play All</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No published prototypes yet</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <GridCell item={item} index={index} username={username} />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      />

      {/* Edit profile modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setEditModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
            <Pressable onPress={handleSaveProfile} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              }
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Company Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput style={[styles.input, { color: colors.foreground }]} value={editCompany} onChangeText={setEditCompany} placeholder="Your startup" placeholderTextColor={colors.mutedForeground} />
            </View>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Bio</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 80 }]}>
              <TextInput style={[styles.input, { color: colors.foreground, height: 80, textAlignVertical: 'top', paddingTop: 12 }]} value={editBio} onChangeText={setEditBio} placeholder="Tell founders about yourself" placeholderTextColor={colors.mutedForeground} multiline />
            </View>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Company Description</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 80 }]}>
              <TextInput style={[styles.input, { color: colors.foreground, height: 80, textAlignVertical: 'top', paddingTop: 12 }]} value={editCompanyBio} onChangeText={setEditCompanyBio} placeholder="What problem does your company solve?" placeholderTextColor={colors.mutedForeground} multiline />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  profileHeader: { paddingHorizontal: 20, paddingTop: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  editBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  editBtnText: { fontSize: 14, fontWeight: '500' as const },
  displayName: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  handle: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 14, marginTop: 10, lineHeight: 20 },
  statsRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, paddingVertical: 16, marginTop: 20, marginBottom: 16 },
  statDivider: { width: 1 },
  gridHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600' as const },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  playAllText: { fontSize: 12, fontWeight: '600' as const },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalSave: { fontSize: 15, fontWeight: '600' as const },
  modalBody: { paddingHorizontal: 20, paddingTop: 20, gap: 8, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6, marginTop: 8 },
  inputWrapper: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  input: { height: 50, paddingHorizontal: 16, fontSize: 15 },
});
