import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { REPORT_TYPES, typeMeta } from '../constants/reportTypes';
import { useI18n } from '../i18n';
import { colors, radii, tap } from '../theme';
import { ReportType } from '../types';

interface Props {
  visible: boolean;
  usingPickedLocation: boolean;
  onSubmit: (type: ReportType, note: string) => void;
  onClose: () => void;
}

/** Bottom-sheet report panel: two taps to file a report while parked. */
export default function ReportSheet({ visible, usingPickedLocation, onSubmit, onClose }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [note, setNote] = useState('');

  const meta = selected ? typeMeta(selected) : null;
  const noteMissing = !!meta?.noteRequired && note.trim().length === 0;

  const reset = () => {
    setSelected(null);
    setNote('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!selected || noteMissing) return;
    onSubmit(selected, note.trim());
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('report.title')}</Text>

          <View style={styles.grid}>
            {REPORT_TYPES.map((rt) => {
              const active = selected === rt.key;
              return (
                <Pressable
                  key={rt.key}
                  onPress={() => setSelected(rt.key)}
                  style={[
                    styles.typeBtn,
                    active && { borderColor: rt.color, backgroundColor: colors.card },
                  ]}
                >
                  <Text style={styles.typeEmoji}>{rt.emoji}</Text>
                  <Text style={[styles.typeLabel, active && { color: colors.text }]}>
                    {t(rt.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selected && (
            <TextInput
              style={styles.note}
              value={note}
              onChangeText={setNote}
              placeholder={t(meta?.noteRequired ? 'report.noteRequired' : 'report.notePlaceholder')}
              placeholderTextColor={colors.textDim}
              maxLength={280}
              multiline
            />
          )}

          <Text style={styles.locationHint}>
            {t(usingPickedLocation ? 'report.locationPicked' : 'report.locationCurrent')}
          </Text>

          <Pressable
            onPress={submit}
            disabled={!selected || noteMissing}
            style={[styles.submit, (!selected || noteMissing) && styles.submitDisabled]}
          >
            <Text style={styles.submitText}>{t('report.submit')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeBtn: {
    width: '48.5%',
    minHeight: tap.big,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: 10,
  },
  typeEmoji: { fontSize: 24 },
  typeLabel: { color: colors.textDim, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  note: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    minHeight: 64,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  locationHint: { color: colors.textDim, fontSize: 12, marginVertical: 10 },
  submit: {
    backgroundColor: colors.amber,
    minHeight: tap.min,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.35 },
  submitText: { color: colors.textOnAmber, fontSize: 17, fontWeight: '800' },
});
