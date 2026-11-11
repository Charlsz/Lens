import { type RefObject } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView } from 'expo-camera';

import type { Detection } from '../../domain/entities/Detection';
import type { AppPhase } from '../types/scan';
import { DetectionOverlay } from './DetectionOverlay';

const FILL = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

type Props = {
  cameraRef: RefObject<CameraView | null>;
  permissionGranted: boolean;
  phase: AppPhase;
  photoUri: string | null;
  detections: Detection[];
  progressPercent: number;
  statusMessage: string;
  onCameraReady?: () => void;
};

export function CameraPreview({
  cameraRef,
  permissionGranted,
  phase,
  photoUri,
  detections,
  progressPercent,
  statusMessage,
  onCameraReady,
}: Props) {
  if (!permissionGranted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Se necesita la cámara</Text>
        <Text style={styles.fallbackBody}>
          Permite el acceso a la cámara para reconocer objetos con Edge AI.
        </Text>
      </View>
    );
  }

  const showPhoto = Boolean(photoUri) && (phase === 'result' || phase === 'scanning');
  const showScanningOverlay = phase === 'scanning' || phase === 'loading';

  return (
    <View style={styles.frame}>
      <CameraView
        ref={cameraRef}
        style={[FILL, showPhoto && styles.hiddenCamera]}
        facing="back"
        mode="picture"
        animateShutter={false}
        onCameraReady={onCameraReady}
      />

      {showPhoto && photoUri ? (
        <Image source={{ uri: photoUri }} style={FILL} resizeMode="cover" />
      ) : null}

      <DetectionOverlay detections={detections} visible={phase === 'result'} />

      <View style={styles.topRow}>
        <Text style={styles.brand}>Lens</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Edge AI</Text>
        </View>
      </View>

      {showScanningOverlay ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#7CFFB2" />
          <Text style={styles.loadingText}>{statusMessage}</Text>
          <Text style={styles.loadingPercent}>{progressPercent}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0B1210',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#121A17',
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 14, 12, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(124,255,178,0.35)',
  },
  badgeText: {
    color: '#7CFFB2',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
  hiddenCamera: {
    opacity: 0,
  },
  loading: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 10, 0.62)',
    gap: 10,
    paddingHorizontal: 28,
  },
  loadingText: {
    color: '#F4FFF8',
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingPercent: {
    color: '#7CFFB2',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
  },
  progressTrack: {
    width: '70%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7CFFB2',
  },
});
