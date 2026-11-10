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
  person: 'Persona',
  'cell phone': 'Teléfono',
  bottle: 'Botella',
  laptop: 'Portátil',
  book: 'Libro',
  cup: 'Taza',
  backpack: 'Mochila',
  chair: 'Silla',
};

export const MIN_SCORE = 0.32;
export const MAX_DETECTIONS = 10;
/** Ancho cercano al input nativo del SSD (300). */
export const INFERENCE_WIDTH = 300;
