import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { typeMeta } from '../constants/reportTypes';
import { colors } from '../theme';
import { Report } from '../types';

interface Props {
  report: Report;
  onPress: (report: Report) => void;
}

function ReportMarker({ report, onPress }: Props) {
  const meta = typeMeta(report.type);
  const verified = report.status === 'high_priority';
  return (
    <Marker
      coordinate={{ latitude: report.lat, longitude: report.lng }}
      onPress={() => onPress(report)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={[
          styles.pin,
          { backgroundColor: meta.color },
          verified && styles.verified,
        ]}
      >
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
    elevation: 4,
  },
  verified: {
    borderWidth: 3,
    borderColor: colors.amber,
  },
  emoji: { fontSize: 18 },
});

export default React.memo(ReportMarker);
