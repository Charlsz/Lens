import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraPreview } from '../components/CameraPreview';
import { DetectionControls } from '../components/DetectionControls';
import { PerformanceInfo } from '../components/PerformanceInfo';
import { useObjectDetection } from '../hooks/useObjectDetection';

export default function HomeScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  const {
    status,
    errorMessage,
    isDetecting,
    showBoxes,
    detections,
    stats,
    startDetection,
    stopDetection,
    toggleBoxes,
  } = useObjectDetection(cameraRef);

  const permissionGranted = permission?.granted === true;
  const controlsDisabled = !permissionGranted || !cameraReady || status === 'loading' || status === 'error';

  return (
    <View style={styles.root}>
      <View style={styles.glowA} />
      <View style={styles.glowB} />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <CameraPreview
          cameraRef={cameraRef}
          permissionGranted={permissionGranted}
          isDetecting={isDetecting}
          modelLoading={status === 'loading'}
          detections={detections}
          showBoxes={showBoxes}
          onCameraReady={() => setCameraReady(true)}
        />

        <View style={styles.bottom}>
          {!permissionGranted ? (
            <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
              <Text style={styles.permissionLabel}>Enable camera</Text>
            </Pressable>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <PerformanceInfo stats={stats} />

          <DetectionControls
            isDetecting={isDetecting}
            disabled={controlsDisabled}
            showBoxes={showBoxes}
            objectCount={stats.objectCount}
            onToggle={() => {
              if (isDetecting) {
                stopDetection();
              } else {
                startDetection();
              }
            }}
            onToggleBoxes={toggleBoxes}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07100D',
  },
  glowA: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: 'rgba(124,255,178,0.08)',
    top: -60,
    right: -40,
  },
  glowB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(90,160,255,0.08)',
    bottom: 40,
    left: -70,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  bottom: {
    gap: 12,
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
