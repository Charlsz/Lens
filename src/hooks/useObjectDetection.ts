import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';

import { CAPTURE_INTERVAL_MS } from '../constants/labels';
import { captureInferenceFrame } from '../services/camera';
import { detectObjects, prepareDetector } from '../services/detector';
import type { Detection } from '../utils/detection';

export type DetectionStatus = 'loading' | 'ready' | 'running' | 'error';

export type PerformanceStats = {
  inferenceMs: number;
  fps: number;
  objectCount: number;
  statusLabel: string;
};

const IDLE_STATS: PerformanceStats = {
  inferenceMs: 0,
  fps: 0,
  objectCount: 0,
  statusLabel: 'Idle',
};

export function useObjectDetection(cameraRef: RefObject<CameraView | null>) {
  const [status, setStatus] = useState<DetectionStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<PerformanceStats>(IDLE_STATS);

  const isDetectingRef = useRef(false);
  const busyRef = useRef(false);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    prepareDetector()
      .then(() => {
        if (!cancelled) {
          setStatus('ready');
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'Could not load the model');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    isDetectingRef.current = isDetecting;
  }, [isDetecting]);

  const runLoop = useCallback(async () => {
    if (!isDetectingRef.current || busyRef.current) {
      return;
    }

    const camera = cameraRef.current;
    if (!camera) {
      return;
    }

    busyRef.current = true;

    try {
      const frame = await captureInferenceFrame(camera);
      if (!frame || !isDetectingRef.current) {
        return;
      }

      const result = await detectObjects(frame.base64);
      if (!isDetectingRef.current) {
        return;
      }

      const now = Date.now();
      frameTimesRef.current = [...frameTimesRef.current.filter((time) => now - time < 3000), now];
      const fps =
        frameTimesRef.current.length > 1
          ? Number(
              (
                ((frameTimesRef.current.length - 1) * 1000) /
                (frameTimesRef.current[frameTimesRef.current.length - 1] -
                  frameTimesRef.current[0])
              ).toFixed(1),
            )
          : 0;

      setDetections(result.detections);
      setStats({
        inferenceMs: result.inferenceMs,
        fps,
        objectCount: result.detections.length,
        statusLabel: result.detections.length > 0 ? 'Detecting' : 'Scanning',
      });
    } catch (error) {
      setStatus('error');
      setIsDetecting(false);
      isDetectingRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : 'Detection failed');
    } finally {
      busyRef.current = false;
    }
  }, [cameraRef]);

  useEffect(() => {
    if (!isDetecting) {
      return;
    }

    void runLoop();
    const timer = setInterval(() => {
      void runLoop();
    }, CAPTURE_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [isDetecting, runLoop]);

  const startDetection = useCallback(() => {
    if (status === 'loading' || status === 'error') {
      return;
    }

    frameTimesRef.current = [];
    setStatus('running');
    setIsDetecting(true);
    setStats({
      inferenceMs: 0,
      fps: 0,
      objectCount: 0,
      statusLabel: 'Scanning',
    });
  }, [status]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    setDetections([]);
    setStats(IDLE_STATS);
    setStatus((current) => (current === 'error' ? current : 'ready'));
  }, []);

  const toggleBoxes = useCallback(() => {
    setShowBoxes((current) => !current);
  }, []);

  return {
    status,
    errorMessage,
    isDetecting,
    showBoxes,
    detections,
    stats,
    startDetection,
    stopDetection,
    toggleBoxes,
  };
}
