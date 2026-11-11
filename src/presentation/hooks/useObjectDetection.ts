import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';

import { prepareDetectorUseCase, scanPhotoUseCase } from '../../di/container';
import { formatObjectCount } from '../../domain/detection/formatters';
import type { Detection } from '../../domain/entities/Detection';
import {
  ProgressTracker,
  type ProgressUpdate,
} from '../../domain/progress/ProgressTracker';
import { IDLE_STATS, type AppPhase, type ScanStats } from '../types/scan';

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

    prepareDetectorUseCase
      .execute(tracker)
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
    setPhase(prepareDetectorUseCase.isReady() ? 'ready' : 'loading');
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

    const needsModel = !prepareDetectorUseCase.isReady();
    const tracker = createTracker(needsModel ? 'full' : 'scan');
    startElapsedTimer();
    applyProgress({
      message: needsModel ? 'Preparando escaneo y modelo…' : 'Iniciando escaneo por foto…',
      percent: 0,
    });

    try {
      const result = await scanPhotoUseCase.execute({ camera, tracker });

      const totalMs = scanStartedAtRef.current
        ? Date.now() - scanStartedAtRef.current
        : result.inferenceMs;

      tracker.finish(
        result.detections.length > 0
          ? `Listo · ${formatObjectCount(result.detections.length)}`
          : 'Listo · sin objetos detectados',
      );
      stopElapsedTimer();
      setPhotoUri(result.frame.uri);
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
