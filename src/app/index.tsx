import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraPreview } from '../presentation/components/CameraPreview';
import { DetectionControls } from '../presentation/components/DetectionControls';
import { PerformanceInfo } from '../presentation/components/PerformanceInfo';
import { useObjectDetection } from '../presentation/hooks/useObjectDetection';

export default function HomeScreen() {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  const {
    phase,
    errorMessage,
    detections,
    photoUri,
    stats,
    runPhotoScan,
    resetToCamera,
  } = useObjectDetection(cameraRef);

  const permissionGranted = permission?.granted === true;
  const controlsDisabled =
    !permissionGranted || !cameraReady || phase === 'loading' || phase === 'scanning';

  return (
    <View style={styles.root}>
      <View style={styles.preview}>
        <CameraPreview
          cameraRef={cameraRef}
          permissionGranted={permissionGranted}
          phase={phase}
          photoUri={photoUri}
          detections={detections}
          progressPercent={stats.progressPercent}
          statusMessage={stats.statusMessage}
          onCameraReady={() => setCameraReady(true)}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!permissionGranted ? (
          <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
            <Text style={styles.permissionLabel}>Activar cámara</Text>
          </Pressable>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <PerformanceInfo stats={stats} />

        <DetectionControls
          phase={phase}
          disabled={controlsDisabled}
          onPhotoScan={() => {
            void runPhotoScan();
          }}
          onReset={resetToCamera}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07100D',
  },
  preview: {
    flex: 1,
  },
  bottom: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#07100D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  permissionButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7CFFB2',
  },
  permissionLabel: {
    color: '#0B1210',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
  },
  errorText: {
    color: '#FF8E8E',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
});
