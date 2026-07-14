import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chip from '../components/Chip';
import TipCard from '../components/TipCard';
import { PLACES, nearestNeighborhood, placeLabel } from '../constants/places';
import { useLocation } from '../hooks/useLocation';
import { useTips } from '../hooks/useTips';
import { useI18n } from '../i18n';
import { useSettings } from '../state/SettingsContext';
import { colors, radii, tap } from '../theme';

const FEATURED = ['Bole Medhanealem', 'Kazanchis', 'Merkato', 'Piassa', 'CMC', 'Megenagna'];

export default function TipsScreen() {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const { coords } = useLocation();
  const { tips, postTip, upvoteTip } = useTips();

  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftArea, setDraftArea] = useState<string | null>(null);

  const featuredPlaces = useMemo(
    () => PLACES.filter((p) => FEATURED.includes(p.name)),
    []
  );
  const shown = areaFilter ? tips.filter((x) => x.neighborhood === areaFilter) : tips;

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    const neighborhood =
      draftArea ??
      (coords ? nearestNeighborhood(coords.latitude, coords.longitude) : FEATURED[0]);
    setDraft('');
    await postTip({
      body,
      neighborhood,
      lat: coords?.latitude,
      lng: coords?.longitude,
      nickname: settings.nickname || undefined,
    }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('tips.title')}</Text>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Chip
            label={t('tips.all')}
            active={areaFilter === null}
            onPress={() => setAreaFilter(null)}
          />
          {featuredPlaces.map((p) => (
            <Chip
              key={p.name}
              label={placeLabel(p, lang)}
              active={areaFilter === p.name}
              onPress={() => setAreaFilter(areaFilter === p.name ? null : p.name)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => <TipCard tip={item} onUpvote={upvoteTip} />}
        contentContainerStyle={{ paddingBottom: 12 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {featuredPlaces.map((p) => (
              <Chip
                key={p.name}
                label={placeLabel(p, lang)}
                active={draftArea === p.name}
                onPress={() => setDraftArea(draftArea === p.name ? null : p.name)}
              />
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('tips.placeholder')}
              placeholderTextColor={colors.textDim}
              maxLength={500}
              multiline
            />
            <Pressable
              style={[styles.post, !draft.trim() && { opacity: 0.35 }]}
              onPress={submit}
              disabled={!draft.trim()}
            >
              <Text style={styles.postText}>{t('tips.post')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filters: { paddingHorizontal: 14, paddingBottom: 12 },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
  },
  post: {
    backgroundColor: colors.amber,
    borderRadius: radii.md,
    minHeight: tap.min - 4,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postText: { color: colors.textOnAmber, fontWeight: '900', fontSize: 15 },
});
