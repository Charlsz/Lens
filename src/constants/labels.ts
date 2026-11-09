export const TARGET_CLASSES = [
  'person',
  'cell phone',
  'bottle',
  'laptop',
  'book',
  'cup',
  'backpack',
  'chair',
] as const;

export type TargetClass = (typeof TARGET_CLASSES)[number];

export const DISPLAY_NAMES: Record<TargetClass, string> = {
  person: 'Person',
  'cell phone': 'Phone',
  bottle: 'Bottle',
  laptop: 'Laptop',
  book: 'Book',
  cup: 'Cup',
  backpack: 'Backpack',
  chair: 'Chair',
};

export const MIN_SCORE = 0.45;
export const MAX_DETECTIONS = 10;
export const CAPTURE_INTERVAL_MS = 900;
export const INFERENCE_WIDTH = 320;
