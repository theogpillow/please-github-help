import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Prototype } from '@workspace/api-client-react';
import { useCreateReport, ReportInputReason } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from './Avatar';

interface PrototypeCardProps {
  prototype: Prototype;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function PrototypeCard({ prototype }: PrototypeCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { mutateAsync: report } = useCreateReport();

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
      await report({ data: { prototypeId: prototype.id, reporterId: user!.id, reason: reason as ReportInputReason } });
      Alert.alert('Reported', 'Thanks for keeping Nitra safe.');
    } catch {
      Alert.alert('Error', 'Could not submit report. Try again.');
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/prototype/${prototype.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.97 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => prototype.username && router.push(`/user/${prototype.username}`)}
          style={styles.creatorRow}
        >
          <Avatar
            uri={prototype.creatorAvatarUrl}
            username={prototype.username}
            size={36}
            verified={prototype.creatorIsVerified}
          />
          <View style={styles.creatorInfo}>
            <Text style={[styles.username, { color: colors.foreground }]}>
              {prototype.username ?? 'Unknown'}
            </Text>
            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
              {timeAgo(prototype.createdAt)}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          {prototype.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>
                {prototype.category}
              </Text>
            </View>
          ) : null}
          {user && user.id !== prototype.userId && (
            <Pressable onPress={handleReport} style={styles.moreBtn} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {prototype.title}
        </Text>
        {prototype.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={3}>
            {prototype.description}
          </Text>
        ) : null}
      </View>

      {/* Image */}
      {prototype.imageUrl ? (
        <Image
          source={{ uri: prototype.imageUrl }}
          style={[styles.image, { borderColor: colors.border }]}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorInfo: {
    marginLeft: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  moreBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderTopWidth: 1,
  },
});
