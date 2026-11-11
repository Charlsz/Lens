export type AppPhase = 'loading' | 'ready' | 'scanning' | 'result' | 'error';

export type ScanStats = {
  elapsedMs: number;
  objectCount: number;
  statusMessage: string;
  progressPercent: number;
  lastInferenceMs: number;
  stageElapsedMs: number;
};

export const IDLE_STATS: ScanStats = {
  elapsedMs: 0,
  objectCount: 0,
  statusMessage: 'Listo para tomar una foto',
  progressPercent: 0,
  lastInferenceMs: 0,
  stageElapsedMs: 0,
};
