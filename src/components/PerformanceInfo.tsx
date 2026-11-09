import { StyleSheet, Text, View } from 'react-native';

import type { PerformanceStats } from '../hooks/useObjectDetection';

type Props = {
  stats: PerformanceStats;
};

export function PerformanceInfo({ stats }: Props) {
  return (
    <View style={styles.wrap}>
      <Metric label="Time" value={`${stats.inferenceMs} ms`} />
      <Metric label="FPS" value={`${stats.fps}`} />
      <Metric label="Objects" value={`${stats.objectCount}`} />
      <Metric label="Status" value={stats.statusLabel} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metric: {
    flex: 1,
  },
  label: {
    color: 'rgba(244,255,248,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    marginBottom: 4,
  },
  value: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
});
