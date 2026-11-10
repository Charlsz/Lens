import { StyleSheet, Text, View } from 'react-native';

import type { Detection } from '../utils/detection';
import { formatPercent } from '../utils/detection';

type Props = {
  detections: Detection[];
  visible: boolean;
};

export function DetectionOverlay({ detections, visible }: Props) {
  if (!visible || detections.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {detections.map((detection) => (
        <View
          key={detection.id}
          style={[
            styles.box,
            {
              left: `${detection.box.x * 100}%`,
              top: `${detection.box.y * 100}%`,
              width: `${detection.box.width * 100}%`,
              height: `${detection.box.height * 100}%`,
            },
          ]}
        >
          <View style={[styles.label, detection.box.y < 0.08 && styles.labelInside]}>
            <Text style={styles.labelText}>
              {detection.label} {formatPercent(detection.score)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#7CFFB2',
    borderRadius: 10,
  },
  label: {
    position: 'absolute',
    top: -28,
    left: 0,
    backgroundColor: 'rgba(12, 18, 16, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelInside: {
    top: 6,
    left: 6,
  },
  labelText: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
