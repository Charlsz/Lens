import { useEffect, useRef, type RefObject } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';

import type { Detection } from '../utils/detection';
import { DetectionOverlay } from './DetectionOverlay';

type Props = {
  cameraRef: RefObject<CameraView | null>;
  permissionGranted: boolean;
  isDetecting: boolean;
  modelLoading: boolean;
  detections: Detection[];
  showBoxes: boolean;
  onCameraReady?: () => void;
};

export function CameraPreview({
  cameraRef,
  permissionGranted,
  isDetecting,
  modelLoading,
  detections,
  showBoxes,
  onCameraReady,
}: Props) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isDetecting) {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [isDetecting, scanAnim]);

  if (!permissionGranted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Camera access needed</Text>
        <Text style={styles.fallbackBody}>Allow camera access to start recognizing objects.</Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="picture"
        animateShutter={false}
        onCameraReady={onCameraReady}
      />

      <DetectionOverlay detections={detections} visible={showBoxes && isDetecting} />

      <View style={styles.topRow}>
        <Text style={styles.brand}>Lens</Text>
        <View style={[styles.badge, isDetecting ? styles.badgeLive : styles.badgeIdle]}>
          <View style={[styles.dot, isDetecting ? styles.dotLive : styles.dotIdle]} />
          <Text style={styles.badgeText}>{isDetecting ? 'Live' : 'Paused'}</Text>
        </View>
      </View>

      {modelLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#7CFFB2" />
          <Text style={styles.loadingText}>Loading model</Text>
        </View>
      ) : null}

      {isDetecting ? (
        <View style={styles.scanArea} pointerEvents="none">
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: scanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 220],
                    }),
                  },
                ],
                opacity: scanAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.35, 1, 0.35],
                }),
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#0B1210',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fallback: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#121A17',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fallbackTitle: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    marginBottom: 8,
  },
  fallbackBody: {
    color: 'rgba(244,255,248,0.68)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  topRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 14, 12, 0.72)',
  },
  badgeLive: {
    borderWidth: 1,
    borderColor: 'rgba(124,255,178,0.35)',
  },
  badgeIdle: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  dotLive: {
    backgroundColor: '#7CFFB2',
  },
  dotIdle: {
    backgroundColor: 'rgba(244,255,248,0.35)',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 10, 0.55)',
    gap: 10,
  },
  loadingText: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  scanArea: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: '28%',
    height: 220,
  },
  scanLine: {
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(124,255,178,0.9)',
    shadowColor: '#7CFFB2',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
