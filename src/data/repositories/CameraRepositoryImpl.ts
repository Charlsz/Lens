import * as ImageManipulator from 'expo-image-manipulator';

import { INFERENCE_WIDTH } from '../../domain/config/detectionConfig';
import type { CapturedFrame } from '../../domain/entities/Detection';
import type { CameraHandle, CameraRepository } from '../../domain/repositories/CameraRepository';

export class CameraRepositoryImpl implements CameraRepository {
  async captureScanPhoto(camera: CameraHandle): Promise<CapturedFrame | null> {
    const photo = await camera.takePictureAsync({
      quality: 0.7,
      base64: false,
      skipProcessing: false,
      shutterSound: false,
    });

    if (!photo?.uri) {
      return null;
    }

    const resized = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: INFERENCE_WIDTH } }],
      {
        compress: 0.82,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );

    if (!resized.base64) {
      return null;
    }

    return {
      uri: resized.uri,
      base64: resized.base64,
      width: resized.width,
      height: resized.height,
    };
  }
}
