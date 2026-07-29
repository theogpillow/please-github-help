import React from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGetPrototype, useCreateReport, getGetPrototypeQueryKey, ReportInputReason } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function PrototypeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const protoId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: prototype, isLoading, error } = useGetPrototype(protoId, { query: { queryKey: getGetPrototypeQueryKey(protoId), enabled: !!protoId } });
  const { mutateAsync: report } = useCreateReport();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleReport = () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Report Post', 'Why are you reporting this?', [
      { text: 'Spam', onPress: () => submitReport('Spam') },
      { text: 'Inappropriate', onPress: () => submitReport('Inappropriate') },
      { text: 'Misleading', onPress: () => submitReport('Misleading') },
      { text: 'Other', onPress: () => submitReport('Other') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitReport = async (reason: string) => {
    try {
      await report({ data: { prototypeId: protoId, reporterId: user!.id, reason: reason as ReportInputReason } });
      Alert.alert('Reported', 'Thanks for keeping Nitra safe.');
    } catch {
      Alert.alert('Error', 'Already reported or could not submit.');
    }
  };

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

  if (error || !prototype) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Prototype not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          Prototype
        </Text>
        {user && user.id !== prototype.userId && (
          <Pressable onPress={handleReport} hitSlop={8}>
            <Ionicons name="flag-outline" size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
        {user && user.id === prototype.userId && <View style={{ width: 24 }} />}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Image */}
        {prototype.imageUrl ? (
          <Image
            source={{ uri: prototype.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.content}>
          {/* Creator */}
          <Pressable
            style={styles.creatorRow}
            onPress={() => prototype.username && router.push(`/user/${prototype.username}`)}
          >
            <Avatar
              uri={prototype.creatorAvatarUrl}
              username={prototype.username}
              size={44}
              verified={prototype.creatorIsVerified}
            />
            <View style={styles.creatorInfo}>
              <Text style={[styles.creatorName, { color: colors.foreground }]}>
                {prototype.username ?? 'Unknown'}
              </Text>
              <Text style={[styles.creatorTime, { color: colors.mutedForeground }]}>
                {timeAgo(prototype.createdAt)}
              </Text>
            </View>
            {prototype.category && (
              <View style={[styles.catBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.catText, { color: colors.primary }]}>{prototype.category}</Text>
              </View>
            )}
          </Pressable>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>{prototype.title}</Text>

          {/* Description */}
          {prototype.description ? (
            <Text style={[styles.description, { color: colors.foreground }]}>{prototype.description}</Text>
          ) : null}

          {/* Generated content */}
          {prototype.generatedContent ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                AI Generated
              </Text>
              <Text style={[styles.generatedContent, { color: colors.foreground }]}>
                {prototype.generatedContent}
              </Text>
            </>
          ) : null}

          {/* Prompt */}
          {prototype.prompt ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Prompt</Text>
              <View style={[styles.promptBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.promptText, { color: colors.foreground }]}>{prototype.prompt}</Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16 },
  image: { width: '100%', aspectRatio: 16 / 9 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  creatorInfo: { flex: 1 },
  creatorName: { fontSize: 15, fontWeight: '600' as const },
  creatorTime: { fontSize: 12, marginTop: 2 },
  catBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  catText: { fontSize: 12, fontWeight: '600' as const },
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 30, marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 4 },
  divider: { height: 1, marginVertical: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  generatedContent: { fontSize: 15, lineHeight: 24 },
  promptBox: { borderWidth: 1, borderRadius: 10, padding: 14 },
  promptText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});
