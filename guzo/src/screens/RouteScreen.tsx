import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ADDIS_CENTER, PLACES, Place, placeLabel } from '../constants/places';
import { typeMeta } from '../constants/reportTypes';
import { useLocation } from '../hooks/useLocation';
import { useReports } from '../hooks/useReports';
import { useI18n } from '../i18n';
import { distToSegmentKm, haversineKm } from '../lib/geo';
import { relativeTime } from '../lib/time';
import { colors, radii } from '../theme';
import { Report } from '../types';

const CORRIDOR_KM = 0.7;

export default function RouteScreen() {
  const { t, lang } = useI18n();
  const { coords } = useLocation();
  const { reports } = useReports();

  const [query, setQuery] = useState('');
  const [dest, setDest] = useState<Place | null>(null);

  const origin = coords ?? ADDIS_CENTER;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PLACES;
    return PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameAm.includes(query.trim()) ||
        p.subCity.toLowerCase().includes(q)
    );
  }, [query]);

  const hits = useMemo(() => {
    if (!dest) return [];
    return reports
      .map((r) => ({
        report: r,
        corridorKm: distToSegmentKm(
          { latitude: r.lat, longitude: r.lng },
          origin,
          { latitude: dest.lat, longitude: dest.lng }
        ),
        fromYouKm: haversineKm(origin.latitude, origin.longitude, r.lat, r.lng),
      }))
      .filter((h) => h.corridorKm <= CORRIDOR_KM)
      .sort((a, b) => a.fromYouKm - b.fromYouKm);
  }, [dest, reports, origin]);

  const renderHit = ({ item }: { item: { report: Report; fromYouKm: number } }) => {
    const meta = typeMeta(item.report.type);
    return (
      <View style={styles.hit}>
        <Text style={styles.hitEmoji}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.hitTitle}>{t(meta.labelKey)}</Text>
          <Text style={styles.hitMeta}>
            {item.report.neighborhood ?? ''} · {relativeTime(item.report.created_at, t)} ·{' '}
            {t('route.distance', { km: item.fromYouKm.toFixed(1) })}
          </Text>
          {!!item.report.note && <Text style={styles.hitNote}>{item.report.note}</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('route.title')}</Text>
      <Text style={styles.question}>{t('route.where')}</Text>
      <Text style={styles.from}>📍 {t('route.from')}</Text>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          setDest(null);
        }}
        placeholder={t('route.searchPlaceholder')}
        placeholderTextColor={colors.textDim}
      />

      {!dest ? (
        <FlatList
          data={matches}
          keyExtractor={(p) => p.name}
          renderItem={({ item }) => (
            <Pressable style={styles.placeRow} onPress={() => setDest(item)}>
              <Text style={styles.placeName}>{placeLabel(item, lang)}</Text>
              <Text style={styles.placeSub}>{item.subCity}</Text>
            </Pressable>
          )}
        />
      ) : (
        <>
          <View style={[styles.verdict, hits.length === 0 ? styles.verdictOk : styles.verdictWarn]}>
            <Text style={styles.verdictDest}>→ {placeLabel(dest, lang)}</Text>
            <Text style={styles.verdictText}>
              {hits.length === 0
                ? t('route.clear')
                : t('route.warnings', { n: hits.length })}
            </Text>
          </View>
          <FlatList
            data={hits}
            keyExtractor={(h) => h.report.id}
            renderItem={renderHit}
            ListFooterComponent={<Text style={styles.note}>{t('route.mvpNote')}</Text>}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', paddingVertical: 10 },
  question: { color: colors.amber, fontSize: 17, fontWeight: '800' },
  from: { color: colors.textDim, fontSize: 12, marginTop: 4, marginBottom: 10 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  placeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placeName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  placeSub: { color: colors.textDim, fontSize: 12 },
  verdict: {
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  verdictOk: { backgroundColor: colors.greenDark },
  verdictWarn: { backgroundColor: '#4A3200' },
  verdictDest: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  verdictText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  hit: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  hitEmoji: { fontSize: 22 },
  hitTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  hitMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  hitNote: { color: colors.text, fontSize: 13, marginTop: 4 },
  note: { color: colors.textDim, fontSize: 11, paddingVertical: 12 },
});
