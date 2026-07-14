import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { relativeTime } from '../lib/time';
import { colors, radii } from '../theme';
import { Tip } from '../types';

interface Props {
  tip: Tip;
  onUpvote: (tipId: string) => void;
}

export default function TipCard({ tip, onUpvote }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={styles.body}>{tip.body}</Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>
          📍 {tip.neighborhood} · {relativeTime(tip.created_at, t)} ·{' '}
          {tip.nickname ?? t('tips.anonymous')}
        </Text>
        <Pressable style={styles.upvote} onPress={() => onUpvote(tip.id)} hitSlop={8}>
          <Ionicons name="arrow-up-circle" size={18} color={colors.amber} />
          <Text style={styles.upvoteText}>{tip.upvotes}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    gap: 10,
  },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { color: colors.textDim, fontSize: 12, flexShrink: 1, marginRight: 8 },
  upvote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  upvoteText: { color: colors.amber, fontSize: 14, fontWeight: '800' },
});
