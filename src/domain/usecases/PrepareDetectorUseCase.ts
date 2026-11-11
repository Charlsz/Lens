import type { ProgressReporter } from '../progress/ProgressTracker';
import type { DetectorRepository } from '../repositories/DetectorRepository';

export class PrepareDetectorUseCase {
  constructor(private readonly detectorRepository: DetectorRepository) {}

  execute(tracker?: ProgressReporter): Promise<void> {
    return this.detectorRepository.prepare(tracker);
  }

  isReady(): boolean {
    return this.detectorRepository.isReady();
  }
}
