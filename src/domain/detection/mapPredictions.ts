import {
  DISPLAY_NAMES,
  MAX_DETECTIONS,
  MIN_SCORE,
  TARGET_CLASSES,
  type TargetClass,
} from '../config/detectionConfig';
import type { Detection, RawPrediction } from '../entities/Detection';

export function isTargetClass(value: string): value is TargetClass {
  return (TARGET_CLASSES as readonly string[]).includes(value);
}

export function toDetections(
  predictions: RawPrediction[],
  imageWidth: number,
  imageHeight: number,
  minScore: number = MIN_SCORE,
): Detection[] {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return [];
  }

  return predictions
    .filter((prediction) => isTargetClass(prediction.class) && prediction.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DETECTIONS)
    .map((prediction, index) => {
      const [x, y, width, height] = prediction.bbox;
      const className = prediction.class as TargetClass;

      return {
        id: `${className}-${index}-${Math.round(prediction.score * 1000)}`,
        label: DISPLAY_NAMES[className],
        className,
        score: prediction.score,
        box: {
          x: clamp(x / imageWidth, 0, 1),
          y: clamp(y / imageHeight, 0, 1),
          width: clamp(width / imageWidth, 0, 1 - x / imageWidth),
          height: clamp(height / imageHeight, 0, 1 - y / imageHeight),
        },
      };
    });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
