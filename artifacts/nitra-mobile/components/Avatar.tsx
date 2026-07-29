import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface AvatarProps {
  uri?: string | null;
  username?: string | null;
  size?: number;
  verified?: boolean;
}

export function Avatar({ uri, username, size = 40, verified = false }: AvatarProps) {
  const colors = useColors();
  const initials = (username ?? '?').slice(0, 1).toUpperCase();
  const badgeSize = Math.round(size * 0.38);

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2, borderColor: colors.border }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text style={[styles.initials, { color: colors.primary, fontSize: size * 0.4 }]}>
            {initials}
          </Text>
        </View>
      )}
      {verified && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.primary,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <Ionicons name="checkmark" size={badgeSize * 0.65} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600' as const,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
