import type { TargetClass } from '../config/detectionConfig';

export type RawPrediction = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

export type Detection = {
  id: string;
  label: string;
  className: TargetClass;
  score: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type CapturedFrame = {
  uri: string;
  base64: string;
  width: number;
  height: number;
};

export type DetectionResult = {
  detections: Detection[];
  inferenceMs: number;
  imageWidth: number;
  imageHeight: number;
};

export type ScanPhotoResult = {
  frame: CapturedFrame;
  detections: Detection[];
  inferenceMs: number;
};
