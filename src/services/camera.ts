import type { CameraView } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

import { INFERENCE_WIDTH } from '../constants/labels';

export type CapturedFrame = {
  base64: string;
  width: number;
  height: number;
};

export async function captureInferenceFrame(
  camera: CameraView,
): Promise<CapturedFrame | null> {
  const photo = await camera.takePictureAsync({
    quality: 0.45,
    base64: false,
    skipProcessing: true,
    shutterSound: false,
  });

  if (!photo?.uri) {
    return null;
  }

  const resized = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize: { width: INFERENCE_WIDTH } }],
    {
      compress: 0.65,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!resized.base64) {
    return null;
  }

  return {
    base64: resized.base64,
    width: resized.width,
    height: resized.height,
  };
}
