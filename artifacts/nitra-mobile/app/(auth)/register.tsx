import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const companyRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  if (user) return <Redirect href="/(tabs)" />;

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    if (username.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await register(username.trim(), password, bio.trim() || undefined, companyName.trim() || undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed.';
      setError(msg.includes('409') ? 'Username is already taken.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const btmPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 40,
        paddingBottom: btmPad + 20,
        paddingHorizontal: 24,
      }}
      bottomOffset={20}
    >
      {/* Back */}
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Join Nitra</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your founder profile starts here
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '40' }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View>
          <Text style={[styles.label, { color: colors.foreground }]}>Username *</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="yourhandle"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: colors.foreground }]}>Password *</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Choose a password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => companyRef.current?.focus()}
            />
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: colors.foreground }]}>Company Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              ref={companyRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Your startup"
              placeholderTextColor={colors.mutedForeground}
              value={companyName}
              onChangeText={setCompanyName}
              returnKeyType="next"
              onSubmitEditing={() => bioRef.current?.focus()}
            />
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: colors.foreground }]}>Bio</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border, height: 90 }]}>
            <TextInput
              ref={bioRef}
              style={[styles.input, { color: colors.foreground, height: 90, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder="What are you building?"
              placeholderTextColor={colors.mutedForeground}
              value={bio}
              onChangeText={setBio}
              multiline
              returnKeyType="done"
            />
          </View>
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              Create Account
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()} style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          Already have an account?{' '}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign in</Text>
        </Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 15 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 6 },
  form: { gap: 16 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 14, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  inputWrapper: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  input: { height: 50, paddingHorizontal: 16, fontSize: 15 },
  primaryBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { fontSize: 16, fontWeight: '600' as const },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 14 },
});
