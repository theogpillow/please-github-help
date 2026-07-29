import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePrototype, usePublishPrototype } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = ['Software', 'Hardware', 'AI', 'Social', 'Fintech', 'Health', 'Other'];

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');

  const { mutateAsync: createPrototype, isPending: isCreating } = useCreatePrototype();
  const { mutateAsync: publishPrototype, isPending: isPublishing } = usePublishPrototype();

  const isLoading = isCreating || isPublishing;

  const handleCreate = async (andPublish: boolean) => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your prototype a name.');
      return;
    }
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const proto = await createPrototype({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          prompt: prompt.trim() || undefined,
          userId: user.id,
        },
      });

      if (andPublish) {
        await publishPrototype({ id: proto.id });
        await queryClient.invalidateQueries();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Published!', 'Your prototype is live on the feed.', [
          { text: 'View Feed', onPress: () => router.replace('/(tabs)') },
          { text: 'Keep creating' },
        ]);
      } else {
        Alert.alert('Saved', 'Your prototype has been saved as a draft.', [
          { text: 'OK' },
        ]);
      }

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setPrompt('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create prototype.');
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Prototype</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="What are you building?"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 100 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, height: 100, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder="Describe your idea..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat === category ? '' : cat)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.secondary,
                    borderColor: category === cat ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: category === cat ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* AI Prompt */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>AI Prompt</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Describe what you want AI to build or elaborate on
          </Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 80 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder="Generate a landing page for..."
              placeholderTextColor={colors.mutedForeground}
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => handleCreate(true)}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
          >
            {isPublishing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Create & Publish
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleCreate(false)}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: pressed || isLoading ? 0.7 : 1 },
            ]}
          >
            {isCreating && !isPublishing ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                Save Draft
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
});
