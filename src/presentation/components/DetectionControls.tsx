import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppPhase } from '../types/scan';

type Props = {
  phase: AppPhase;
  disabled: boolean;
  onPhotoScan: () => void;
  onReset: () => void;
};

export function DetectionControls({ phase, disabled, onPhotoScan, onReset }: Props) {
  const isResult = phase === 'result';
  const busy = phase === 'scanning' || phase === 'loading';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || busy}
        onPress={isResult ? onReset : onPhotoScan}
        style={({ pressed }) => [
          styles.primaryButton,
          (disabled || busy) && styles.disabled,
          pressed && !disabled && !busy && styles.pressed,
        ]}
      >
        <Text style={styles.primaryLabel}>
          {busy ? 'Escaneando…' : isResult ? 'Nueva foto' : 'Tomar foto'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7CFFB2',
  },
  primaryLabel: {
    color: '#0B1210',
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
