import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typeMeta } from '../constants/reportTypes';
import { useI18n } from '../i18n';
import { relativeTime } from '../lib/time';
import { colors, radii, tap } from '../theme';
import { Report } from '../types';

interface Props {
  report: Report;
  onVote: (reportId: string, value: 1 | -1) => void;
  onClose: () => void;
}

export default function ReportDetailCard({ report, onVote, onClose }: Props) {
  const { t } = useI18n();
  const meta = typeMeta(report.type);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t(meta.labelKey)}</Text>
          <Text style={styles.meta}>
            {report.neighborhood ? `${report.neighborhood} · ` : ''}
            {relativeTime(report.created_at, t)}
            {report.author_nickname ? ` · ${report.author_nickname}` : ''}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.textDim} />
        </Pressable>
      </View>

      {report.status === 'high_priority' && (
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.textOnAmber} />
          <Text style={styles.badgeText}>{t('verify.highPriority')}</Text>
        </View>
      )}

      {!!report.note && <Text style={styles.note}>{report.note}</Text>}

      <Text style={styles.count}>{t('verify.count', { n: report.confirmations })}</Text>

      <View style={styles.voteRow}>
        <Pressable style={[styles.voteBtn, styles.confirm]} onPress={() => onVote(report.id, 1)}>
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          <Text style={styles.voteText}>{t('verify.confirm')}</Text>
        </Pressable>
        <Pressable style={[styles.voteBtn, styles.dismiss]} onPress={() => onVote(report.id, -1)}>
          <Ionicons name="close-circle" size={20} color={colors.danger} />
          <Text style={[styles.voteText, { color: colors.danger }]}>{t('verify.dismiss')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 30 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.textOnAmber, fontSize: 12, fontWeight: '800' },
  note: { color: colors.text, fontSize: 14, lineHeight: 20 },
  count: { color: colors.textDim, fontSize: 12 },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteBtn: {
    flex: 1,
    minHeight: tap.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
  },
  confirm: { backgroundColor: colors.green },
  dismiss: { borderWidth: 1.5, borderColor: colors.danger },
  voteText: { color: colors.text, fontSize: 15, fontWeight: '800' },
});
