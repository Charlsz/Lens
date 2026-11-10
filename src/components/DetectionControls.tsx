import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppPhase } from '../hooks/useObjectDetection';

type Props = {
  phase: AppPhase;
  disabled: boolean;
  onPhotoScan: () => void;
  onStartLive: () => void;
  onStopLive: () => void;
  onReset: () => void;
};

export function DetectionControls({
  phase,
  disabled,
  onPhotoScan,
  onStartLive,
  onStopLive,
  onReset,
}: Props) {
  if (phase === 'live') {
    return (
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={onStopLive}
          style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
        >
          <Text style={styles.stopLabel}>Detener en vivo</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryLabel}>Nueva foto</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onStartLive}
          style={({ pressed }) => [
            styles.secondaryButton,
            disabled && styles.disabled,
            pressed && !disabled && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryLabel}>En vivo</Text>
        </Pressable>
      </View>
    );
  }

  const busy = phase === 'scanning' || phase === 'loading';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || busy}
        onPress={onPhotoScan}
        style={({ pressed }) => [
          styles.primaryButton,
          (disabled || busy) && styles.disabled,
          pressed && !disabled && !busy && styles.pressed,
        ]}
      >
        <Text style={styles.primaryLabel}>
          {phase === 'scanning' ? 'Escaneando…' : 'Tomar foto'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={disabled || busy}
        onPress={onStartLive}
        style={({ pressed }) => [
          styles.secondaryButton,
          (disabled || busy) && styles.disabled,
          pressed && !disabled && !busy && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryLabel}>En vivo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    flex: 1.25,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7CFFB2',
    paddingHorizontal: 10,
  },
  primaryLabel: {
    color: '#0B1210',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
  },
  secondaryLabel: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  stopButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
  },
  stopLabel: {
    color: '#FFF8F8',
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
