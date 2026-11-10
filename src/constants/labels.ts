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

/** Umbral para foto (mejor recall). */
export const MIN_SCORE = 0.32;
/** Umbral un poco más estricto en vivo para menos falsos positivos. */
export const LIVE_MIN_SCORE = 0.38;
export const MAX_DETECTIONS = 10;
/** Ancho cercano al input nativo del SSD (300). */
export const INFERENCE_WIDTH = 300;
/** Ancho más bajo en vivo para velocidad. */
export const LIVE_INFERENCE_WIDTH = 256;
/** Intervalo entre capturas en modo en vivo. */
export const LIVE_CAPTURE_INTERVAL_MS = 1400;
