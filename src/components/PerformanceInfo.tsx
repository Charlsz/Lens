import { StyleSheet, Text, View } from 'react-native';

import type { ScanStats } from '../hooks/useObjectDetection';

type Props = {
  stats: ScanStats;
};

export function PerformanceInfo({ stats }: Props) {
  const seconds = (stats.elapsedMs / 1000).toFixed(1);
  const inference =
    stats.lastInferenceMs > 0 ? `${stats.lastInferenceMs} ms` : `${stats.progressPercent}%`;

  return (
    <View style={styles.wrap}>
      <View style={styles.metricsRow}>
        <Metric label="Tiempo" value={`${seconds} s`} />
        <Metric label="Objetos" value={`${stats.objectCount}`} />
        <Metric label="Inferencia" value={inference} />
      </View>

      <View style={styles.statusBlock}>
        <Text style={styles.statusLabel}>Estado</Text>
        <Text style={styles.statusValue} numberOfLines={2}>
          {stats.statusMessage}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.progressPercent}%` }]} />
        </View>
      </View>
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
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
    fontSize: 15,
  },
  statusBlock: {
    gap: 6,
  },
  statusLabel: {
    color: 'rgba(244,255,248,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
  statusValue: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7CFFB2',
  },
});
