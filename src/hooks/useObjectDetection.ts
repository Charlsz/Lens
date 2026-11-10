import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';

import {
  LIVE_CAPTURE_INTERVAL_MS,
  LIVE_MIN_SCORE,
  MIN_SCORE,
} from '../constants/labels';
import { captureLiveFrame, captureScanPhoto } from '../services/camera';
import {
  detectObjects,
  isDetectorReady,
  prepareDetector,
  type ProgressUpdate,
} from '../services/detector';
import type { Detection } from '../utils/detection';
import { formatObjectCount } from '../utils/detection';

export type AppPhase = 'loading' | 'ready' | 'scanning' | 'live' | 'result' | 'error';

export type ScanStats = {
  elapsedMs: number;
  objectCount: number;
  statusMessage: string;
  progressPercent: number;
  lastInferenceMs: number;
};

const IDLE_STATS: ScanStats = {
  elapsedMs: 0,
  objectCount: 0,
  statusMessage: 'Listo para reconocer objetos',
  progressPercent: 0,
  lastInferenceMs: 0,
};

export function useObjectDetection(cameraRef: RefObject<CameraView | null>) {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [stats, setStats] = useState<ScanStats>(IDLE_STATS);

  const busyRef = useRef(false);
  const liveActiveRef = useRef(false);
  const scanStartedAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const startElapsedTimer = useCallback(() => {
    stopElapsedTimer();
    scanStartedAtRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      const started = scanStartedAtRef.current;
      if (!started) {
        return;
      }
      setStats((current) => ({
        ...current,
        elapsedMs: Date.now() - started,
      }));
    }, 100);
  }, [stopElapsedTimer]);

  const applyProgress = useCallback((update: ProgressUpdate) => {
    setStats((current) => ({
      ...current,
      statusMessage: update.message,
      progressPercent: Math.max(0, Math.min(100, Math.round(update.percent))),
      elapsedMs: scanStartedAtRef.current
        ? Date.now() - scanStartedAtRef.current
        : current.elapsedMs,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    prepareDetector((update) => {
      if (!cancelled) {
        setStats({
          ...IDLE_STATS,
          statusMessage: update.message,
          progressPercent: update.percent,
        });
      }
    })
      .then(() => {
        if (!cancelled) {
          setPhase('ready');
          setErrorMessage(null);
          setStats({
            ...IDLE_STATS,
            statusMessage: 'Listo para reconocer objetos',
            progressPercent: 100,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
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
      liveActiveRef.current = false;
      stopElapsedTimer();
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    };
  }, [stopElapsedTimer]);

  const stopLive = useCallback(() => {
    liveActiveRef.current = false;
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    stopElapsedTimer();
    busyRef.current = false;
    setDetections([]);
    setPhotoUri(null);
    setPhase(isDetectorReady() ? 'ready' : 'loading');
    setStats(IDLE_STATS);
  }, [stopElapsedTimer]);

  const resetToCamera = useCallback(() => {
    if (busyRef.current || liveActiveRef.current) {
      return;
    }

    stopElapsedTimer();
    setPhotoUri(null);
    setDetections([]);
    setErrorMessage(null);
    setPhase(isDetectorReady() ? 'ready' : 'loading');
    setStats(IDLE_STATS);
  }, [stopElapsedTimer]);

  const runPhotoScan = useCallback(async () => {
    if (busyRef.current || liveActiveRef.current || phase === 'loading' || phase === 'scanning') {
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
    startElapsedTimer();
    applyProgress({ message: 'Iniciando escaneo por foto…', percent: 2 });

    try {
      if (!isDetectorReady()) {
        await prepareDetector(applyProgress);
      } else {
        applyProgress({ message: 'Modelo Edge AI listo', percent: 30 });
      }

      applyProgress({ message: 'Tomando foto…', percent: 40 });
      const frame = await captureScanPhoto(camera);
      if (!frame) {
        throw new Error('No se pudo capturar la foto');
      }

      setPhotoUri(frame.uri);
      applyProgress({ message: 'Foto capturada. Preparando imagen…', percent: 55 });

      const result = await detectObjects(frame.base64, {
        onProgress: applyProgress,
        minScore: MIN_SCORE,
      });
      const totalMs = scanStartedAtRef.current
        ? Date.now() - scanStartedAtRef.current
        : result.inferenceMs;

      stopElapsedTimer();
      setDetections(result.detections);
      setPhase('result');
      setStats({
        elapsedMs: totalMs,
        objectCount: result.detections.length,
        lastInferenceMs: result.inferenceMs,
        statusMessage:
          result.detections.length > 0
            ? `Foto lista · ${formatObjectCount(result.detections.length)}`
            : 'Foto lista · sin objetos detectados',
        progressPercent: 100,
      });
    } catch (error) {
      stopElapsedTimer();
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
  }, [applyProgress, cameraRef, phase, startElapsedTimer, stopElapsedTimer]);

  const runLiveLoop = useCallback(async () => {
    if (!liveActiveRef.current || busyRef.current) {
      return;
    }

    const camera = cameraRef.current;
    if (!camera) {
      return;
    }

    busyRef.current = true;

    try {
      applyProgress({ message: 'Capturando frame en vivo…', percent: 45 });
      const frame = await captureLiveFrame(camera);
      if (!frame || !liveActiveRef.current) {
        return;
      }

      applyProgress({ message: 'Analizando frame con Edge AI…', percent: 75 });
      const result = await detectObjects(frame.base64, {
        quiet: true,
        minScore: LIVE_MIN_SCORE,
      });

      if (!liveActiveRef.current) {
        return;
      }

      setDetections(result.detections);
      setStats((current) => ({
        ...current,
        objectCount: result.detections.length,
        lastInferenceMs: result.inferenceMs,
        progressPercent: 100,
        statusMessage:
          result.detections.length > 0
            ? `En vivo · ${formatObjectCount(result.detections.length)} · ${result.inferenceMs} ms`
            : `En vivo · buscando objetos · ${result.inferenceMs} ms`,
      }));
    } catch (error) {
      liveActiveRef.current = false;
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
      stopElapsedTimer();
      setPhase('error');
      setDetections([]);
      setErrorMessage(error instanceof Error ? error.message : 'Falló el modo en vivo');
      setStats({
        ...IDLE_STATS,
        statusMessage: 'Error en reconocimiento en vivo',
        progressPercent: 0,
      });
    } finally {
      busyRef.current = false;
    }
  }, [applyProgress, cameraRef, stopElapsedTimer]);

  const startLive = useCallback(async () => {
    if (busyRef.current || liveActiveRef.current || phase === 'loading' || phase === 'scanning') {
      return;
    }

    if (!cameraRef.current) {
      setErrorMessage('La cámara no está lista');
      return;
    }

    setPhotoUri(null);
    setDetections([]);
    setErrorMessage(null);
    setPhase('live');
    liveActiveRef.current = true;
    startElapsedTimer();
    applyProgress({ message: 'Iniciando reconocimiento en vivo…', percent: 10 });

    try {
      if (!isDetectorReady()) {
        await prepareDetector(applyProgress);
      }
      applyProgress({ message: 'En vivo · esperando primer frame…', percent: 35 });
      void runLiveLoop();
      liveTimerRef.current = setInterval(() => {
        void runLiveLoop();
      }, LIVE_CAPTURE_INTERVAL_MS);
    } catch (error) {
      liveActiveRef.current = false;
      stopElapsedTimer();
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo iniciar el modo en vivo');
    }
  }, [
    applyProgress,
    cameraRef,
    phase,
    runLiveLoop,
    startElapsedTimer,
    stopElapsedTimer,
  ]);

  return {
    phase,
    errorMessage,
    detections,
    photoUri,
    stats,
    runPhotoScan,
    startLive,
    stopLive,
    resetToCamera,
  };
}
