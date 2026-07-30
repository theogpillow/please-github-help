import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

// ── API helper ──────────────────────────────────────────────────────
const apiBase = () =>
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';

async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Types ───────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalPrototypes: number;
  pendingVerifications: number;
  openReports: number;
  flaggedPosts: number;
}

interface AdminUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
}

interface AdminPost {
  id: number;
  title: string;
  status: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface Report {
  id: number;
  prototypeId: number;
  reason: string;
  status: string;
  reporterUsername: string | null;
  prototypeTitle: string | null;
  createdAt: string;
}

// ── Tabs ─────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Verify', 'Posts', 'Reports', 'Users'] as const;
type TabName = typeof TABS[number];

// ── Overview ─────────────────────────────────────────────────────────
function OverviewTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/api/admin/stats');
      setStats(data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers, icon: 'people' as const },
    { label: 'Total Posts', value: stats?.totalPrototypes, icon: 'documents' as const },
    { label: 'Pending Verifications', value: stats?.pendingVerifications, icon: 'checkmark-circle' as const },
    { label: 'Open Reports', value: stats?.openReports, icon: 'flag' as const },
    { label: 'Flagged Posts', value: stats?.flaggedPosts, icon: 'eye-off' as const },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      {cards.map((c) => (
        <View
          key={c.label}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name={c.icon} size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{c.label}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{c.value ?? '—'}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Verify ────────────────────────────────────────────────────────────
function VerifyTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data: AdminUser[] = await adminFetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
      setResults(data);
    } catch {}
    setLoading(false);
  }, []);

  const toggle = async (u: AdminUser) => {
    const next = !u.isVerified;
    try {
      await adminFetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isVerified: next }),
      });
      setResults((prev) => prev.map((r) => r.id === u.id ? { ...r, isVerified: next } : r));
    } catch {
      Alert.alert('Error', 'Could not update verification.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search username…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={(t) => { setQuery(t); search(t); }}
          autoCapitalize="none"
        />
      </View>
      {loading
        ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        : (
          <FlatList
            data={results}
            keyExtractor={(u) => String(u.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: u }) => (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Avatar uri={u.avatarUrl} username={u.username} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.username, { color: colors.foreground }]}>
                    @{u.username}
                    {u.isVerified && (
                      <Text style={{ color: colors.primary }}> ✓</Text>
                    )}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggle(u)}
                  style={[
                    styles.pill,
                    { backgroundColor: u.isVerified ? colors.destructive + '22' : colors.primary + '22' },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: u.isVerified ? colors.destructive : colors.primary }}>
                    {u.isVerified ? 'Unverify' : 'Verify'}
                  </Text>
                </Pressable>
              </View>
            )}
          />
        )}
    </View>
  );
}

// ── Posts ─────────────────────────────────────────────────────────────
const POST_FILTERS = ['pending', 'approved', 'hidden', 'deleted'] as const;

function PostsTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [filter, setFilter] = useState<string>('pending');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const data: AdminPost[] = await adminFetch(`/api/admin/prototypes?status=${f}`);
      setPosts(data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  const setStatus = async (post: AdminPost, status: string) => {
    try {
      await adminFetch(`/api/admin/prototypes/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      Alert.alert('Error', 'Could not update post.');
    }
  };

  const actions = (post: AdminPost) => {
    const opts: { text: string; status: string; style?: 'destructive' }[] = [];
    if (post.status !== 'approved') opts.push({ text: 'Approve', status: 'approved' });
    if (post.status !== 'hidden') opts.push({ text: 'Hide', status: 'hidden' });
    if (post.status !== 'deleted') opts.push({ text: 'Delete', status: 'deleted', style: 'destructive' });
    Alert.alert(post.title || 'Post', undefined, [
      ...opts.map((o) => ({
        text: o.text,
        style: o.style as 'destructive' | undefined,
        onPress: () => setStatus(post, o.status),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {POST_FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => { setFilter(f); load(f); }}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f ? colors.primary : colors.muted, borderColor: colors.border },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f ? colors.primaryForeground : colors.mutedForeground, textTransform: 'capitalize' }}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading
        ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        : (
          <FlatList
            data={posts}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={<Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 24 }}>No posts</Text>}
            renderItem={({ item: p }) => (
              <Pressable
                onPress={() => actions(p)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
                    {p.title || 'Untitled'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>by @{p.username}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: statusColor(p.status, colors) + '22' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor(p.status, colors), textTransform: 'capitalize' }}>
                    {p.status}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
    </View>
  );
}

function statusColor(s: string, colors: ReturnType<typeof useColors>) {
  if (s === 'approved') return '#22c55e';
  if (s === 'hidden') return colors.primary;
  if (s === 'deleted') return colors.destructive;
  return colors.mutedForeground;
}

// ── Reports ───────────────────────────────────────────────────────────
function ReportsTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: Report[] = await adminFetch('/api/admin/reports');
      setReports(data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = (report: Report) => {
    Alert.alert(
      report.prototypeTitle || 'Report',
      `Reported by @${report.reporterUsername}\nReason: ${report.reason}`,
      [
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await adminFetch(`/api/admin/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'resolve' }) });
              setReports((prev) => prev.filter((r) => r.id !== report.id));
            } catch { Alert.alert('Error', 'Could not resolve.'); }
          },
        },
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminFetch(`/api/admin/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'delete_post' }) });
              setReports((prev) => prev.filter((r) => r.id !== report.id));
            } catch { Alert.alert('Error', 'Could not delete.'); }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  return (
    <FlatList
      data={reports}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListEmptyComponent={<Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 24 }}>No open reports</Text>}
      renderItem={({ item: r }) => (
        <Pressable
          onPress={() => act(r)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="flag" size={20} color={colors.destructive} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
              {r.prototypeTitle || 'Unknown post'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {r.reason} · by @{r.reporterUsername}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      )}
    />
  );
}

// ── Users ─────────────────────────────────────────────────────────────
function UsersTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data: AdminUser[] = await adminFetch(`/api/admin/users${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setUsers(data);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const manageUser = (u: AdminUser) => {
    Alert.alert(`@${u.username}`, undefined, [
      {
        text: u.isBanned ? 'Unban' : 'Ban',
        style: u.isBanned ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await adminFetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isBanned: !u.isBanned }) });
            setUsers((prev) => prev.map((r) => r.id === u.id ? { ...r, isBanned: !u.isBanned } : r));
          } catch { Alert.alert('Error', 'Could not update user.'); }
        },
      },
      {
        text: u.isVerified ? 'Unverify' : 'Verify',
        onPress: async () => {
          try {
            await adminFetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isVerified: !u.isVerified }) });
            setUsers((prev) => prev.map((r) => r.id === u.id ? { ...r, isVerified: !u.isVerified } : r));
          } catch { Alert.alert('Error', 'Could not update user.'); }
        },
      },
      {
        text: u.isAdmin ? 'Remove Admin' : 'Make Admin',
        onPress: async () => {
          try {
            await adminFetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin: !u.isAdmin }) });
            setUsers((prev) => prev.map((r) => r.id === u.id ? { ...r, isAdmin: !u.isAdmin } : r));
          } catch { Alert.alert('Error', 'Could not update user.'); }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search username…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={(t) => { setQuery(t); load(t); }}
          autoCapitalize="none"
        />
      </View>
      {loading
        ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        : (
          <FlatList
            data={users}
            keyExtractor={(u) => String(u.id)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: u }) => (
              <Pressable
                onPress={() => manageUser(u)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Avatar uri={u.avatarUrl} username={u.username} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.username, { color: colors.foreground }]}>
                    @{u.username}
                    {u.isVerified && <Text style={{ color: colors.primary }}> ✓</Text>}
                    {u.isAdmin && <Text style={{ color: '#f59e0b' }}> ★</Text>}
                  </Text>
                  {u.isBanned && (
                    <Text style={{ fontSize: 11, color: colors.destructive, fontWeight: '600' }}>Banned</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          />
        )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────
export default function AdminScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>('Overview');

  if (!user?.isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed" size={40} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Admin access only</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Admin</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setActiveTab(t)}
            style={[
              styles.tabItem,
              { borderBottomColor: activeTab === t ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Overview' && <OverviewTab colors={colors} />}
        {activeTab === 'Verify' && <VerifyTab colors={colors} />}
        {activeTab === 'Posts' && <PostsTab colors={colors} />}
        {activeTab === 'Reports' && <ReportsTab colors={colors} />}
        {activeTab === 'Users' && <UsersTab colors={colors} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    marginRight: 4,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: '700' },
  username: { fontSize: 14, fontWeight: '600' },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
});
