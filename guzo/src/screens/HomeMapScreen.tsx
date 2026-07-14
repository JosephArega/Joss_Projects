import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chip from '../components/Chip';
import ReportDetailCard from '../components/ReportDetailCard';
import ReportMarker from '../components/ReportMarker';
import ReportSheet from '../components/ReportSheet';
import { ADDIS_REGION, nearestNeighborhood } from '../constants/places';
import { REPORT_TYPES } from '../constants/reportTypes';
import { useLocation } from '../hooks/useLocation';
import { useReports } from '../hooks/useReports';
import { useI18n } from '../i18n';
import { maybeNotifyNearby } from '../lib/notifications';
import { useSettings } from '../state/SettingsContext';
import { colors, radii, tap } from '../theme';
import { LatLng, Report, ReportType } from '../types';

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILES = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

export default function HomeMapScreen() {
  const { t, lang, toggleLang } = useI18n();
  const { settings } = useSettings();
  const { coords } = useLocation();

  const [filter, setFilter] = useState<ReportType | 'all'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedCoord, setPickedCoord] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { reports, offline, submitReport, vote } = useReports({
    onNewReport: (r) => maybeNotifyNearby(r, coords, settings, t),
  });

  const visible = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.type === filter)),
    [reports, filter]
  );
  const selected = selectedId ? reports.find((r) => r.id === selectedId) ?? null : null;

  const handleSubmit = async (type: ReportType, note: string) => {
    const at = pickedCoord ?? coords ?? ADDIS_REGION;
    setSheetOpen(false);
    setPickedCoord(null);
    try {
      await submitReport({
        type,
        lat: at.latitude,
        lng: at.longitude,
        note: note || undefined,
        neighborhood: nearestNeighborhood(at.latitude, at.longitude),
      });
    } catch {
      // surfaced via the offline badge; report stays out of the list
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={ADDIS_REGION}
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
        onLongPress={(e) => {
          setPickedCoord(e.nativeEvent.coordinate);
          setSheetOpen(true);
        }}
        onPress={() => setSelectedId(null)}
      >
        <UrlTile
          urlTemplate={settings.darkMap ? DARK_TILES : OSM_TILES}
          maximumZ={19}
          flipY={false}
        />
        {visible.map((r) => (
          <ReportMarker key={r.id} report={r} onPress={(rep) => setSelectedId(rep.id)} />
        ))}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.overlayTop} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.brand}>ጉዞ</Text>
          {offline && <Text style={styles.offline}>{t('map.offline')}</Text>}
          <Pressable style={styles.langBtn} onPress={toggleLang} hitSlop={8}>
            <Text style={styles.langText}>{lang === 'en' ? 'አማ' : 'EN'}</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Chip
            label={t('map.filter.all')}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          {REPORT_TYPES.map((rt) => (
            <Chip
              key={rt.key}
              label={`${rt.emoji} ${t(rt.labelKey)}`}
              active={filter === rt.key}
              color={rt.color}
              onPress={() => setFilter(filter === rt.key ? 'all' : rt.key)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {!selected && (
        <Pressable style={styles.fab} onPress={() => setSheetOpen(true)}>
          <Text style={styles.fabPlus}>＋</Text>
          <Text style={styles.fabText}>{t('report.cta')}</Text>
        </Pressable>
      )}

      {selected && (
        <ReportDetailCard
          report={selected}
          onVote={(id, v) => vote(id, v)}
          onClose={() => setSelectedId(null)}
        />
      )}

      <ReportSheet
        visible={sheetOpen}
        usingPickedLocation={pickedCoord !== null}
        onSubmit={handleSubmit}
        onClose={() => {
          setSheetOpen(false);
          setPickedCoord(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 10,
  },
  brand: {
    color: colors.amber,
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  offline: {
    flex: 1,
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(12,18,15,0.85)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  langBtn: {
    marginLeft: 'auto',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  filters: { paddingHorizontal: 14, paddingVertical: 10 },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amber,
    borderRadius: radii.pill,
    paddingHorizontal: 26,
    minHeight: tap.big - 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabPlus: { color: colors.textOnAmber, fontSize: 24, fontWeight: '900' },
  fabText: { color: colors.textOnAmber, fontSize: 18, fontWeight: '900' },
});
