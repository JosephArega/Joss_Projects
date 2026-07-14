import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chip from '../components/Chip';
import { useLocation } from '../hooks/useLocation';
import { useI18n } from '../i18n';
import { formatDate } from '../lib/ethiopianDate';
import { ensureNotificationPermission, registerDeviceForPush } from '../lib/notifications';
import { useSettings } from '../state/SettingsContext';
import { colors, radii } from '../theme';
import { VehicleType } from '../types';

const VEHICLES: VehicleType[] = ['car', 'minibus', 'taxi', 'truck', 'bajaj', 'motorbike', 'other'];

export default function SettingsScreen() {
  const { t, lang } = useI18n();
  const { settings, update } = useSettings();
  const { coords } = useLocation();

  const toggleNotify = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) return;
    }
    update({ notifyEnabled: enabled });
    registerDeviceForPush(coords, { ...settings, notifyEnabled: enabled });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <Text style={styles.section}>{t('settings.language')}</Text>
        <View style={styles.row}>
          <Chip label="English" active={lang === 'en'} onPress={() => update({ lang: 'en' })} />
          <Chip label="አማርኛ" active={lang === 'am'} onPress={() => update({ lang: 'am' })} />
        </View>

        <Text style={styles.section}>{t('settings.calendar')}</Text>
        <View style={styles.row}>
          <Chip
            label={t('settings.calendar.gc')}
            active={settings.calendar === 'gc'}
            onPress={() => update({ calendar: 'gc' })}
          />
          <Chip
            label={t('settings.calendar.ec')}
            active={settings.calendar === 'ec'}
            onPress={() => update({ calendar: 'ec' })}
          />
        </View>
        <Text style={styles.hint}>
          {t('settings.today', { date: formatDate(new Date(), settings.calendar, lang) })}
        </Text>

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('settings.darkMap')}</Text>
          <Switch
            value={settings.darkMap}
            onValueChange={(v) => update({ darkMap: v })}
            trackColor={{ true: colors.green, false: colors.border }}
            thumbColor={colors.amber}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.label}>{t('settings.notify')}</Text>
            <Text style={styles.hint}>
              {t('settings.notifyDesc', { km: settings.notifyRadiusKm })}
            </Text>
          </View>
          <Switch
            value={settings.notifyEnabled}
            onValueChange={toggleNotify}
            trackColor={{ true: colors.green, false: colors.border }}
            thumbColor={colors.amber}
          />
        </View>
        {settings.notifyEnabled && (
          <View style={styles.row}>
            {[1, 2, 5].map((km) => (
              <Chip
                key={km}
                label={`${km} km`}
                active={settings.notifyRadiusKm === km}
                onPress={() => update({ notifyRadiusKm: km })}
              />
            ))}
          </View>
        )}

        <Text style={styles.section}>{t('settings.profile')}</Text>
        <Text style={styles.hint}>{t('settings.anonymousNote')}</Text>
        <TextInput
          style={styles.input}
          value={settings.nickname}
          onChangeText={(v) => update({ nickname: v })}
          placeholder={t('settings.nickname')}
          placeholderTextColor={colors.textDim}
          maxLength={24}
        />
        <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>
          {t('settings.vehicle')}
        </Text>
        <View style={[styles.row, { flexWrap: 'wrap', rowGap: 8 }]}>
          {VEHICLES.map((v) => (
            <Chip
              key={v}
              label={t(`vehicle.${v}`)}
              active={settings.vehicle === v}
              onPress={() => update({ vehicle: v })}
            />
          ))}
        </View>

        <Text style={styles.about}>
          ጉዞ Guzo v0.1 · {t('app.tagline')}
          {'\n'}
          {t('about.osm')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 6 },
  section: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  row: { flexDirection: 'row' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    marginTop: 18,
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  about: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 32,
    textAlign: 'center',
  },
});
