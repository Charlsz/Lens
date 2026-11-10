import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';

import { MIN_SCORE } from '../constants/labels';
import { captureScanPhoto } from '../services/camera';
import { detectObjects, isDetectorReady, prepareDetector } from '../services/detector';
import type { Detection } from '../utils/detection';
import { formatObjectCount } from '../utils/detection';
import { ProgressTracker, type ProgressUpdate } from '../utils/progress';

export type AppPhase = 'loading' | 'ready' | 'scanning' | 'result' | 'error';

export type ScanStats = {
  elapsedMs: number;
  objectCount: number;
  statusMessage: string;
  progressPercent: number;
  lastInferenceMs: number;
  stageElapsedMs: number;
};

const IDLE_STATS: ScanStats = {
  elapsedMs: 0,
  objectCount: 0,
  statusMessage: 'Listo para tomar una foto',
  progressPercent: 0,
  lastInferenceMs: 0,
  stageElapsedMs: 0,
};

export function useObjectDetection(cameraRef: RefObject<CameraView | null>) {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [stats, setStats] = useState<ScanStats>(IDLE_STATS);

  const busyRef = useRef(false);
  const scanStartedAtRef = useRef<number | null>(null);
  const stageStartedAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTrackerRef = useRef<ProgressTracker | null>(null);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const startElapsedTimer = useCallback(() => {
    stopElapsedTimer();
    scanStartedAtRef.current = Date.now();
    stageStartedAtRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      const started = scanStartedAtRef.current;
      const stageStarted = stageStartedAtRef.current;
      if (!started) {
        return;
      }
      setStats((current) => ({
        ...current,
        elapsedMs: Date.now() - started,
        stageElapsedMs: stageStarted ? Date.now() - stageStarted : 0,
      }));
    }, 100);
  }, [stopElapsedTimer]);

  const applyProgress = useCallback((update: ProgressUpdate) => {
    setStats((current) => {
      const messageChanged = current.statusMessage !== update.message;
      if (messageChanged || stageStartedAtRef.current == null) {
        stageStartedAtRef.current = Date.now();
      }

      return {
        ...current,
        statusMessage: update.message,
        progressPercent: update.percent,
        elapsedMs: scanStartedAtRef.current
          ? Date.now() - scanStartedAtRef.current
          : current.elapsedMs,
        stageElapsedMs: stageStartedAtRef.current
          ? Date.now() - stageStartedAtRef.current
          : 0,
      };
    });
  }, []);

  const createTracker = useCallback(
    (mode: 'boot' | 'scan' | 'full') => {
      activeTrackerRef.current?.dispose();
      const tracker = new ProgressTracker(mode, applyProgress);
      activeTrackerRef.current = tracker;
      return tracker;
    },
    [applyProgress],
  );

  useEffect(() => {
    let cancelled = false;
    const tracker = createTracker('boot');
    startElapsedTimer();

    prepareDetector(tracker)
      .then(() => {
        if (!cancelled) {
          tracker.finish('Modelo Edge AI listo');
          stopElapsedTimer();
          setPhase('ready');
          setErrorMessage(null);
          setStats({
            ...IDLE_STATS,
            statusMessage: 'Listo para tomar una foto',
            progressPercent: 100,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          stopElapsedTimer();
          setPhase('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'No se pudo cargar el modelo Edge AI',
          );
          setStats({
            ...IDLE_STATS,
            statusMessage: 'Error al cargar el modelo',
            progressPercent: 0,
          });
        }
      });

    return () => {
      cancelled = true;
      tracker.dispose();
      stopElapsedTimer();
    };
  }, [createTracker, startElapsedTimer, stopElapsedTimer]);

  const resetToCamera = useCallback(() => {
    if (busyRef.current) {
      return;
    }

    stopElapsedTimer();
    activeTrackerRef.current?.dispose();
    activeTrackerRef.current = null;
    setPhotoUri(null);
    setDetections([]);
    setErrorMessage(null);
    setPhase(isDetectorReady() ? 'ready' : 'loading');
    setStats(IDLE_STATS);
  }, [stopElapsedTimer]);

  const runPhotoScan = useCallback(async () => {
    if (busyRef.current || phase === 'loading' || phase === 'scanning') {
      return;
    }

    const camera = cameraRef.current;
    if (!camera) {
      setErrorMessage('La cámara no está lista');
      return;
    }

    busyRef.current = true;
    setPhase('scanning');
    setDetections([]);
    setPhotoUri(null);
    setErrorMessage(null);

    const needsModel = !isDetectorReady();
    const tracker = createTracker(needsModel ? 'full' : 'scan');
    startElapsedTimer();
    applyProgress({
      message: needsModel ? 'Preparando escaneo y modelo…' : 'Iniciando escaneo por foto…',
      percent: 0,
    });

    try {
      if (needsModel) {
        await prepareDetector(tracker);
      }

      tracker.begin('capture', 'Tomando foto…');
      const frame = await captureScanPhoto(camera);
      if (!frame) {
        throw new Error('No se pudo capturar la foto');
      }
      tracker.complete('Foto capturada');
      setPhotoUri(frame.uri);

      const result = await detectObjects(frame.base64, {
        tracker,
        minScore: MIN_SCORE,
      });

      const totalMs = scanStartedAtRef.current
        ? Date.now() - scanStartedAtRef.current
        : result.inferenceMs;

      tracker.finish(
        result.detections.length > 0
          ? `Listo · ${formatObjectCount(result.detections.length)}`
          : 'Listo · sin objetos detectados',
      );
      stopElapsedTimer();
      setDetections(result.detections);
      setPhase('result');
      setStats({
        elapsedMs: totalMs,
        objectCount: result.detections.length,
        lastInferenceMs: result.inferenceMs,
        stageElapsedMs: 0,
        statusMessage:
          result.detections.length > 0
            ? `Escaneo listo · ${formatObjectCount(result.detections.length)} · inferencia ${result.inferenceMs} ms`
            : `Escaneo listo · sin objetos · inferencia ${result.inferenceMs} ms`,
        progressPercent: 100,
      });
    } catch (error) {
      stopElapsedTimer();
      tracker.dispose();
      setPhase('error');
      setPhotoUri(null);
      setDetections([]);
      setErrorMessage(error instanceof Error ? error.message : 'Falló el reconocimiento');
      setStats({
        ...IDLE_STATS,
        elapsedMs: scanStartedAtRef.current ? Date.now() - scanStartedAtRef.current : 0,
        statusMessage: 'Error durante el escaneo',
        progressPercent: 0,
      });
    } finally {
      busyRef.current = false;
    }
  }, [applyProgress, cameraRef, createTracker, phase, startElapsedTimer, stopElapsedTimer]);

  return {
    phase,
    errorMessage,
    detections,
    photoUri,
    stats,
    runPhotoScan,
    resetToCamera,
  };
}
