import type { CameraView } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

import { INFERENCE_WIDTH, LIVE_INFERENCE_WIDTH } from '../constants/labels';

export type CapturedFrame = {
  uri: string;
  base64: string;
  width: number;
  height: number;
};

async function captureAndResize(
  camera: CameraView,
  options: {
    quality: number;
    skipProcessing: boolean;
    resizeWidth: number;
    compress: number;
  },
): Promise<CapturedFrame | null> {
  const photo = await camera.takePictureAsync({
    quality: options.quality,
    base64: false,
    skipProcessing: options.skipProcessing,
    shutterSound: false,
  });

  if (!photo?.uri) {
    return null;
  }

  const resized = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize: { width: options.resizeWidth } }],
    {
      compress: options.compress,
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

/** Foto única: mejor calidad y orientación correcta. */
export async function captureScanPhoto(
  camera: CameraView,
): Promise<CapturedFrame | null> {
  return captureAndResize(camera, {
    quality: 0.7,
    skipProcessing: false,
    resizeWidth: INFERENCE_WIDTH,
    compress: 0.82,
  });
}

/** Frame en vivo: más rápido y ligero. */
export async function captureLiveFrame(
  camera: CameraView,
): Promise<CapturedFrame | null> {
  return captureAndResize(camera, {
    quality: 0.4,
    skipProcessing: true,
    resizeWidth: LIVE_INFERENCE_WIDTH,
    compress: 0.6,
  });
}
