import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useListMessages, useSendMessage, getListMessagesQueryKey } from '@workspace/api-client-react';
import type { Message } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${mins} ${period}`;
}

export default function ConversationScreen() {
  const { id, title, otherIsVerified } = useLocalSearchParams<{
    id: string;
    title: string;
    otherIsVerified: string;
  }>();
  const conversationId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');

  const { data: messages, isLoading, refetch } = useListMessages(conversationId, {
    query: { queryKey: getListMessagesQueryKey(conversationId), enabled: !!conversationId },
  });
  const { mutateAsync: sendMessage, isPending: sending } = useSendMessage();

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !user || sending) return;
    setText('');
    try {
      await sendMessage({ id: conversationId, data: { senderId: user.id, content } });
      refetch();
      inputRef.current?.focus();
    } catch {}
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const reversedMessages = messages ? [...messages].reverse() : [];

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;
    return (
      <View style={[styles.messageWrapper, isOwn ? styles.ownWrapper : styles.otherWrapper]}>
        {!isOwn && (
          <Avatar
            username={item.senderUsername}
            size={28}
            verified={item.senderIsVerified}
          />
        )}
        <View style={styles.bubbleContainer}>
          <View
            style={[
              styles.bubble,
              isOwn
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isOwn ? colors.primaryForeground : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.messageTime, { color: colors.mutedForeground }, isOwn ? styles.timeRight : styles.timeLeft]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.navCenter}>
          <Avatar username={title} size={28} verified={otherIsVerified === '1'} />
          <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
            {title ?? 'Chat'}
          </Text>
        </View>
        <Pressable
          onPress={() => title && router.push(`/user/${title}`)}
          hitSlop={8}
        >
          <Ionicons name="person-outline" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : reversedMessages.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Start the conversation
            </Text>
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={reversedMessages.length > 0}
          />
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 8,
            },
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? colors.primary : colors.muted,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingHorizontal: 12,
  },
  navTitle: { fontSize: 16, fontWeight: '600' as const },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  messageWrapper: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  ownWrapper: { justifyContent: 'flex-end' },
  otherWrapper: { justifyContent: 'flex-start' },
  bubbleContainer: { maxWidth: '75%' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  messageTime: { fontSize: 11, marginTop: 3 },
  timeLeft: { textAlign: 'left', marginLeft: 4 },
  timeRight: { textAlign: 'right', marginRight: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
  },
  input: { fontSize: 15, paddingVertical: 8 },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
