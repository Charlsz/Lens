import type { DetectionResult } from '../entities/Detection';
import type { ProgressReporter } from '../progress/ProgressTracker';

export type DetectObjectsOptions = {
  tracker?: ProgressReporter;
  minScore?: number;
};

export interface DetectorRepository {
  prepare(tracker?: ProgressReporter): Promise<void>;
  isReady(): boolean;
  detect(base64: string, options?: DetectObjectsOptions): Promise<DetectionResult>;
}
