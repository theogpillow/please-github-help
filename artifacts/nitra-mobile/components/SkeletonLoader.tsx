import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

function SkeletonBlock({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const colors = useColors();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.muted,
        },
        style,
      ]}
    />
  );
}

export function PrototypeCardSkeleton() {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <SkeletonBlock width={36} height={36} borderRadius={18} />
        <View style={styles.headerText}>
          <SkeletonBlock width={120} height={12} borderRadius={6} />
          <SkeletonBlock width={70} height={10} borderRadius={5} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={styles.body}>
        <SkeletonBlock width="90%" height={16} borderRadius={8} />
        <SkeletonBlock width="70%" height={14} borderRadius={7} style={{ marginTop: 8 }} />
        <SkeletonBlock width="80%" height={14} borderRadius={7} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  body: {
    gap: 0,
  },
});
