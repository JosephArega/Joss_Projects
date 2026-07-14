import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  label: string;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}

export default function Chip({ label, active, color, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: color ?? colors.amber, borderColor: color ?? colors.amber },
      ]}
      hitSlop={6}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  labelActive: { color: colors.textOnAmber },
});
