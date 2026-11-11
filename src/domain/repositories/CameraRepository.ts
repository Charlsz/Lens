import type { CapturedFrame } from '../entities/Detection';

/**
 * Puerto mínimo de captura. La implementación concreta usa expo-camera,
 * pero el dominio solo conoce este contrato.
 */
export type CameraHandle = {
  takePictureAsync(options: {
    quality?: number;
    base64?: boolean;
    skipProcessing?: boolean;
    shutterSound?: boolean;
  }): Promise<{ uri?: string } | undefined>;
};

export interface CameraRepository {
  captureScanPhoto(camera: CameraHandle): Promise<CapturedFrame | null>;
}
