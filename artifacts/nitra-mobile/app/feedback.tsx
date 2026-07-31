import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetInvestorFeedback, useGetNitraFeedback } from '@workspace/api-client-react';
import type { FeedbackResponse, FeedbackPoint } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

type Mode = 'investor' | 'nitra';

function dot(type: string) {
  const t = type.toLowerCase();
  if (t.includes('strength') || t.includes('positive')) return '#22c55e';
  if (t.includes('weakness') || t.includes('risk') || t.includes('concern')) return '#ef4444';
  return '#3b82f6';
}

function ResultCard({ result, colors }: { result: FeedbackResponse; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[resStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Verdict + score */}
      <View style={resStyles.topRow}>
        <Text style={[resStyles.verdict, { color: colors.foreground }]}>{result.verdict}</Text>
        {result.score != null && (
          <View style={[resStyles.scoreBadge, { backgroundColor: colors.primary }]}>
            <Text style={[resStyles.scoreText, { color: colors.primaryForeground }]}>{result.score}/100</Text>
          </View>
        )}
      </View>

      {/* Score bar */}
      {result.score != null && (
        <View style={[resStyles.barBg, { backgroundColor: colors.muted }]}>
          <View style={[resStyles.barFill, { backgroundColor: colors.primary, width: `${result.score}%` as unknown as number }]} />
        </View>
      )}

      {/* Summary */}
      {result.summary ? (
        <Text style={[resStyles.summary, { color: colors.mutedForeground }]}>{result.summary}</Text>
      ) : null}

      {/* Points */}
      {result.points?.length > 0 && (
        <View style={resStyles.pointsList}>
          {result.points.map((point: FeedbackPoint, i: number) => (
            <View key={i} style={resStyles.pointRow}>
              <View style={[resStyles.pointDot, { backgroundColor: dot(point.type) }]} />
              <View style={resStyles.pointBody}>
                <Text style={[resStyles.pointType, { color: colors.foreground }]}>{point.type}</Text>
                <Text style={[resStyles.pointText, { color: colors.mutedForeground }]}>{point.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [mode, setMode] = useState<Mode>('investor');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [revenueModel, setRevenueModel] = useState('');

  const [investorResult, setInvestorResult] = useState<FeedbackResponse | null>(null);
  const [nitraResult, setNitraResult] = useState<FeedbackResponse | null>(null);

  const investorMutation = useGetInvestorFeedback();
  const nitraMutation = useGetNitraFeedback();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const isLoading = mode === 'investor' ? investorMutation.isPending : nitraMutation.isPending;
  const result = mode === 'investor' ? investorResult : nitraResult;
  const canSubmit = company.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      data: {
        companyName: company.trim(),
        description: description.trim(),
        targetMarket: targetMarket.trim() || undefined,
        revenueModel: revenueModel.trim() || undefined,
      },
    };
    if (mode === 'investor') {
      investorMutation.mutate(payload, {
        onSuccess: (data) => {
          setInvestorResult(data);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        },
      });
    } else {
      nitraMutation.mutate(payload, {
        onSuccess: (data) => {
          setNitraResult(data);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        },
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>AI Feedback</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode description */}
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Get expert feedback on your startup idea from AI advisors
        </Text>

        {/* Mode toggle */}
        <View style={[styles.tabs, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {(['investor', 'nitra'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tab, mode === m && [styles.tabActive, { backgroundColor: colors.background }]]}
            >
              <Ionicons
                name={m === 'investor' ? 'trending-up-outline' : 'bulb-outline'}
                size={15}
                color={mode === m ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabText, { color: mode === m ? colors.primary : colors.mutedForeground }]}>
                {m === 'investor' ? 'Investor Mode' : 'Nitra Mode'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Mode description card */}
        <View style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.modeTitle, { color: colors.foreground }]}>
            {mode === 'investor' ? 'Investor Feedback' : 'Nitra Feedback'}
          </Text>
          <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>
            {mode === 'investor'
              ? 'Get brutally honest feedback from an AI investor\'s perspective'
              : 'Get constructive, supportive feedback to help you improve your idea'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Company Name *</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Your startup name"
              placeholderTextColor={colors.mutedForeground}
              value={company}
              onChangeText={setCompany}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description *</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border, height: 100 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, height: 100, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder="What does your company do? What problem are you solving?"
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Target Market</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Who are your customers?"
              placeholderTextColor={colors.mutedForeground}
              value={targetMarket}
              onChangeText={setTargetMarket}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Revenue Model</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="How will you make money?"
              placeholderTextColor={colors.mutedForeground}
              value={revenueModel}
              onChangeText={setRevenueModel}
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: (!canSubmit || isLoading || pressed) ? 0.7 : 1 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color={colors.primaryForeground} />
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                  {mode === 'investor' ? 'Get Investor Feedback' : 'Get Nitra Feedback'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Result */}
        {result && <ResultCard result={result} colors={colors} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 30, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabActive: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  tabText: { fontSize: 13, fontWeight: '600' },
  modeCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 20 },
  modeTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  modeDesc: { fontSize: 13, lineHeight: 18 },
  formSection: { gap: 6, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  inputWrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  input: { height: 50, paddingHorizontal: 16, fontSize: 15 },
  submitBtn: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  submitBtnText: { fontSize: 16, fontWeight: '600' },
});

const resStyles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  verdict: { flex: 1, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  scoreText: { fontSize: 14, fontWeight: '700' },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 3 },
  summary: { fontSize: 14, lineHeight: 20 },
  pointsList: { gap: 12 },
  pointRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pointDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  pointBody: { flex: 1, gap: 2 },
  pointType: { fontSize: 13, fontWeight: '600' },
  pointText: { fontSize: 13, lineHeight: 18 },
});
