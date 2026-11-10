export type ProgressUpdate = {
  message: string;
  percent: number;
};

export type ProgressStage =
  | 'tf_init'
  | 'copy_shards'
  | 'load_weights'
  | 'warmup'
  | 'capture'
  | 'decode'
  | 'infer'
  | 'filter';

type StageRange = { start: number; end: number; estimateMs: number };

const BOOT_RANGES: Record<
  Exclude<ProgressStage, 'capture' | 'decode' | 'infer' | 'filter'>,
  StageRange
> = {
  tf_init: { start: 0, end: 8, estimateMs: 1200 },
  copy_shards: { start: 8, end: 28, estimateMs: 4000 },
  load_weights: { start: 28, end: 78, estimateMs: 8000 },
  warmup: { start: 78, end: 100, estimateMs: 5000 },
};

const SCAN_RANGES: Record<
  Extract<ProgressStage, 'capture' | 'decode' | 'infer' | 'filter'>,
  StageRange
> = {
  capture: { start: 0, end: 22, estimateMs: 2500 },
  decode: { start: 22, end: 32, estimateMs: 800 },
  infer: { start: 32, end: 92, estimateMs: 6000 },
  filter: { start: 92, end: 100, estimateMs: 200 },
};

const FULL_RANGES: Record<ProgressStage, StageRange> = {
  tf_init: { start: 0, end: 6, estimateMs: 1200 },
  copy_shards: { start: 6, end: 18, estimateMs: 4000 },
  load_weights: { start: 18, end: 48, estimateMs: 8000 },
  warmup: { start: 48, end: 58, estimateMs: 5000 },
  capture: { start: 58, end: 72, estimateMs: 2500 },
  decode: { start: 72, end: 78, estimateMs: 800 },
  infer: { start: 78, end: 96, estimateMs: 6000 },
  filter: { start: 96, end: 100, estimateMs: 200 },
};

export type ProgressMode = 'boot' | 'scan' | 'full';

type Listener = (update: ProgressUpdate) => void;

/**
 * Progreso basado en etapas reales + fracción medida (bytes/archivos)
 * y un latido por tiempo solo dentro del rango de la etapa activa.
 */
export class ProgressTracker {
  private mode: ProgressMode;
  private listener: Listener;
  private stage: ProgressStage | null = null;
  private range: StageRange | null = null;
  private stageStartedAt = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastPercent = 0;
  private lastMessage = '';
  private estimates: Partial<Record<ProgressStage, number>> = {};

  constructor(mode: ProgressMode, listener: Listener) {
    this.mode = mode;
    this.listener = listener;
  }

  begin(stage: ProgressStage, message: string) {
    this.stopHeartbeat();
    this.stage = stage;
    this.range = this.resolveRange(stage);
    this.stageStartedAt = Date.now();
    this.emit(message, this.range.start);
    this.startHeartbeat();
  }

  /** Fracción real 0..1 dentro de la etapa (p. ej. bytes leídos). */
  setFraction(fraction: number, message: string) {
    if (!this.range) {
      return;
    }
    const clamped = Math.max(0, Math.min(1, fraction));
    const span = this.range.end - this.range.start;
    // Deja 1% de margen para el cierre de etapa.
    const percent = this.range.start + span * clamped * 0.99;
    this.emit(message, percent);
  }

  complete(message?: string) {
    if (!this.stage || !this.range) {
      return;
    }

    const elapsed = Date.now() - this.stageStartedAt;
    if (elapsed > 200) {
      this.estimates[this.stage] = elapsed;
    }

    this.stopHeartbeat();
    this.emit(message ?? this.lastMessage, this.range.end);
    this.stage = null;
    this.range = null;
  }

  finish(message: string) {
    this.stopHeartbeat();
    this.stage = null;
    this.range = null;
    this.emit(message, 100);
  }

  dispose() {
    this.stopHeartbeat();
  }

  private resolveRange(stage: ProgressStage): StageRange {
    const base =
      this.mode === 'boot'
        ? (BOOT_RANGES as Record<string, StageRange>)[stage]
        : this.mode === 'scan'
          ? (SCAN_RANGES as Record<string, StageRange>)[stage]
          : FULL_RANGES[stage];

    if (!base) {
      return { start: this.lastPercent, end: Math.min(100, this.lastPercent + 10), estimateMs: 3000 };
    }

    return {
      ...base,
      estimateMs: this.estimates[stage] ?? base.estimateMs,
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (!this.range || !this.stage) {
        return;
      }
      const elapsed = Date.now() - this.stageStartedAt;
      const ratio = Math.min(0.92, elapsed / this.range.estimateMs);
      const span = this.range.end - this.range.start;
      const timed = this.range.start + span * ratio;
      // Nunca bajar el %; el latido solo avanza si no hay fracción real más alta.
      if (timed > this.lastPercent) {
        this.emit(this.lastMessage, timed);
      }
    }, 180);
  }

  private stopHeartbeat() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private emit(message: string, percent: number) {
    const next = Math.max(this.lastPercent, Math.min(100, Math.round(percent)));
    this.lastPercent = next;
    this.lastMessage = message;
    this.listener({ message, percent: next });
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
