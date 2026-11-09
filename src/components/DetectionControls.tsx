import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  isDetecting: boolean;
  disabled: boolean;
  showBoxes: boolean;
  objectCount: number;
  onToggle: () => void;
  onToggleBoxes: () => void;
};

export function DetectionControls({
  isDetecting,
  disabled,
  showBoxes,
  objectCount,
  onToggle,
  onToggleBoxes,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.primaryButton,
          isDetecting && styles.primaryButtonActive,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={[styles.primaryLabel, isDetecting && styles.primaryLabelActive]}>
          {isDetecting ? 'Stop' : 'Start'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onToggleBoxes}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryLabel}>{showBoxes ? 'Hide boxes' : 'Show boxes'}</Text>
      </Pressable>

      <View style={styles.counter}>
        <Text style={styles.counterValue}>{objectCount}</Text>
        <Text style={styles.counterLabel}>objects</Text>
      </View>
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
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FFF8',
  },
  primaryButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  primaryLabel: {
    color: '#0B1210',
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
  },
  primaryLabelActive: {
    color: '#FFF8F8',
  },
  secondaryButton: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryLabel: {
    color: '#E7F2EC',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  counter: {
    minWidth: 64,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  counterValue: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    lineHeight: 20,
  },
  counterLabel: {
    color: 'rgba(244,255,248,0.62)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
