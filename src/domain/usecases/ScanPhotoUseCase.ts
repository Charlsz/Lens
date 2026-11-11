import { MIN_SCORE } from '../config/detectionConfig';
import type { ScanPhotoResult } from '../entities/Detection';
import type { ProgressReporter } from '../progress/ProgressTracker';
import type { CameraHandle, CameraRepository } from '../repositories/CameraRepository';
import type { DetectorRepository } from '../repositories/DetectorRepository';

export class ScanPhotoUseCase {
  constructor(
    private readonly detectorRepository: DetectorRepository,
    private readonly cameraRepository: CameraRepository,
  ) {}

  async execute(input: {
    camera: CameraHandle;
    tracker?: ProgressReporter;
  }): Promise<ScanPhotoResult> {
    const { camera, tracker } = input;

    if (!this.detectorRepository.isReady()) {
      await this.detectorRepository.prepare(tracker);
    }

    tracker?.begin('capture', 'Tomando foto…');
    const frame = await this.cameraRepository.captureScanPhoto(camera);
    if (!frame) {
      throw new Error('No se pudo capturar la foto');
    }
    tracker?.complete('Foto capturada');

    const result = await this.detectorRepository.detect(frame.base64, {
      tracker,
      minScore: MIN_SCORE,
    });

    return {
      frame,
      detections: result.detections,
      inferenceMs: result.inferenceMs,
    };
  }
}
