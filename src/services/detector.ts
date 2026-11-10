import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import { toByteArray } from 'base64-js';
import * as jpeg from 'jpeg-js';

import type { Detection, RawPrediction } from '../utils/detection';
import { toDetections } from '../utils/detection';
import { formatBytes, type ProgressTracker } from '../utils/progress';
import { ensureTfPlatform } from './tfPlatform';

// COCO label map used by the SSD model (same as @tensorflow-models/coco-ssd).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CLASSES } = require('@tensorflow-models/coco-ssd/dist/classes') as {
  CLASSES: Record<number, { displayName: string }>;
};

const SHARD_MODULES = [
  require('../../assets/model/group1-shard1of5.bin'),
  require('../../assets/model/group1-shard2of5.bin'),
  require('../../assets/model/group1-shard3of5.bin'),
  require('../../assets/model/group1-shard4of5.bin'),
  require('../../assets/model/group1-shard5of5.bin'),
] as const;

const MODEL_JSON = require('../../assets/model/model.json') as GraphModelJSON;

type GraphModelJSON = {
  format?: string;
  generatedBy?: string;
  convertedBy?: string;
  modelTopology?: object;
  weightsManifest: Array<{
    paths: string[];
    weights: tf.io.WeightsManifestEntry[];
  }>;
};

let graphModel: tf.GraphModel | null = null;
let readyPromise: Promise<void> | null = null;

export async function prepareDetector(tracker?: ProgressTracker): Promise<void> {
  if (graphModel) {
    return;
  }

  if (!readyPromise) {
    readyPromise = (async () => {
      tracker?.begin('tf_init', 'Inicializando TensorFlow.js…');
      ensureTfPlatform();
      await tf.setBackend('cpu');
      await tf.ready();
      tracker?.complete('TensorFlow.js listo');

      tracker?.begin('copy_shards', 'Preparando archivos del modelo…');
      const modelDir = await ensureLocalModel((copied, total, reused) => {
        tracker?.setFraction(
          copied / total,
          reused
            ? `Pesos en caché (${copied}/${total})`
            : `Copiando pesos del modelo (${copied}/${total})…`,
        );
      });
      tracker?.complete('Archivos del modelo listos');

      tracker?.begin('load_weights', 'Cargando modelo Edge AI en memoria…');
      graphModel = await loadGraphModelFromDirectory(modelDir, (readBytes, totalBytes) => {
        tracker?.setFraction(
          totalBytes > 0 ? readBytes / totalBytes : 0,
          `Cargando pesos ${formatBytes(readBytes)} / ${formatBytes(totalBytes)}`,
        );
      });
      tracker?.complete('Modelo cargado en memoria');

      tracker?.begin('warmup', 'Calentando modelo (primera inferencia)…');
      const warm = tf.zeros([1, 300, 300, 3], 'int32');
      const warmResult = (await graphModel.executeAsync(warm)) as tf.Tensor[];
      warmResult.forEach((tensor) => tensor.dispose());
      warm.dispose();
      tracker?.complete('Calentamiento terminado');
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }

  await readyPromise;
}

export function isDetectorReady() {
  return graphModel !== null;
}

export async function detectObjects(
  base64: string,
  options?: {
    tracker?: ProgressTracker;
    minScore?: number;
  },
): Promise<{
  detections: Detection[];
  inferenceMs: number;
  imageWidth: number;
  imageHeight: number;
}> {
  const tracker = options?.tracker;

  if (!graphModel) {
    await prepareDetector(tracker);
  }

  if (!graphModel) {
    throw new Error('El modelo no está listo');
  }

  tracker?.begin('decode', 'Decodificando imagen…');
  const { tensor, width, height } = imageToTensor(base64);
  tracker?.complete(`Imagen lista (${width}×${height})`);

  const started = Date.now();

  try {
    tracker?.begin('infer', 'Ejecutando reconocimiento Edge AI…');
    const predictions = await runDetection(graphModel, tensor, 20, 0.25);
    const inferenceMs = Date.now() - started;
    tracker?.complete(`Inferencia terminada en ${inferenceMs} ms`);

    tracker?.begin('filter', 'Filtrando detecciones…');
    const detections = toDetections(predictions, width, height, options?.minScore);
    tracker?.complete(
      detections.length > 0
        ? `${detections.length} objeto${detections.length === 1 ? '' : 's'} detectado${detections.length === 1 ? '' : 's'}`
        : 'Sin objetos en el umbral',
    );

    return {
      detections,
      inferenceMs,
      imageWidth: width,
      imageHeight: height,
    };
  } finally {
    tensor.dispose();
  }
}

async function runDetection(
  model: tf.GraphModel,
  img: tf.Tensor3D,
  maxNumBoxes: number,
  minScore: number,
): Promise<RawPrediction[]> {
  const batched = tf.tidy(() => tf.expandDims(img));
  const height = batched.shape[1] ?? 0;
  const width = batched.shape[2] ?? 0;

  const result = (await model.executeAsync(batched)) as tf.Tensor[];
  const scores = result[0].dataSync() as Float32Array;
  const boxes = result[1].dataSync() as Float32Array;
  const numBoxes = result[0].shape[1] ?? 0;
  const numClasses = result[0].shape[2] ?? 0;
  const boxCount = result[1].shape[1] ?? 0;

  batched.dispose();
  tf.dispose(result);

  const [maxScores, classes] = calculateMaxScores(scores, numBoxes, numClasses);

  const indexTensor = tf.tidy(() => {
    const boxes2 = tf.tensor2d(boxes, [boxCount, 4]);
    return tf.image.nonMaxSuppression(boxes2, maxScores, maxNumBoxes, minScore, minScore);
  });
  const indexes = Array.from(indexTensor.dataSync());
  indexTensor.dispose();

  return buildDetectedObjects(width, height, boxes, maxScores, indexes, classes);
}

function calculateMaxScores(scores: Float32Array | Int32Array | Uint8Array, numBoxes: number, numClasses: number) {
  const maxes: number[] = [];
  const classes: number[] = [];

  for (let i = 0; i < numBoxes; i += 1) {
    let max = Number.MIN_VALUE;
    let index = -1;

    for (let j = 0; j < numClasses; j += 1) {
      const score = scores[i * numClasses + j];
      if (score > max) {
        max = score;
        index = j;
      }
    }

    maxes[i] = max;
    classes[i] = index;
  }

  return [maxes, classes] as const;
}

function buildDetectedObjects(
  width: number,
  height: number,
  boxes: Float32Array | Int32Array | Uint8Array,
  scores: number[],
  indexes: number[],
  classes: number[],
): RawPrediction[] {
  return indexes.map((indexed) => {
    const minY = boxes[indexed * 4] * height;
    const minX = boxes[indexed * 4 + 1] * width;
    const maxY = boxes[indexed * 4 + 2] * height;
    const maxX = boxes[indexed * 4 + 3] * width;
    const classId = classes[indexed] + 1;

    return {
      bbox: [minX, minY, maxX - minX, maxY - minY],
      class: CLASSES[classId]?.displayName ?? `class-${classId}`,
      score: scores[indexed],
    };
  });
}

function imageToTensor(base64: string) {
  const bytes = toByteArray(base64);
  const decoded = jpeg.decode(bytes, { useTArray: true });
  const { width, height, data } = decoded;
  const rgb = new Uint8Array(width * height * 3);

  let source = 0;
  let target = 0;
  while (source < data.length) {
    rgb[target++] = data[source];
    rgb[target++] = data[source + 1];
    rgb[target++] = data[source + 2];
    source += 4;
  }

  return {
    tensor: tf.tensor3d(rgb, [height, width, 3]),
    width,
    height,
  };
}

async function ensureLocalModel(
  onShardProgress?: (copied: number, total: number, reused: boolean) => void,
): Promise<Directory> {
  const modelDir = new Directory(Paths.document, 'lens-model');
  const modelFile = new File(modelDir, 'model.json');

  if (!modelDir.exists) {
    modelDir.create({ intermediates: true, idempotent: true });
  }

  if (!modelFile.exists) {
    modelFile.create({ intermediates: true, overwrite: true });
    await modelFile.write(JSON.stringify(MODEL_JSON));
  }

  const assets = await Asset.loadAsync([...SHARD_MODULES]);
  let copied = 0;

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const shardName = `group1-shard${index + 1}of5`;
    const destination = new File(modelDir, shardName);
    let reused = true;

    if (!destination.exists) {
      reused = false;
      await asset.downloadAsync();

      if (!asset.localUri) {
        throw new Error(`Falta el fragmento del modelo: ${shardName}`);
      }

      const source = new File(asset.localUri);
      await source.copy(destination);
    }

    copied += 1;
    onShardProgress?.(copied, assets.length, reused);
  }

  return modelDir;
}

async function loadGraphModelFromDirectory(
  modelDir: Directory,
  onBytes?: (readBytes: number, totalBytes: number) => void,
) {
  const modelFile = new File(modelDir, 'model.json');
  const modelJSON = JSON.parse(await modelFile.text()) as GraphModelJSON;

  const weightSpecs: tf.io.WeightsManifestEntry[] = [];
  const shardPaths: string[] = [];

  for (const group of modelJSON.weightsManifest) {
    weightSpecs.push(...group.weights);
    shardPaths.push(...group.paths);
  }

  let totalBytes = 0;
  for (const path of shardPaths) {
    const shard = new File(modelDir, path);
    const size = typeof shard.size === 'number' ? shard.size : 0;
    totalBytes += size;
  }

  const chunks: Uint8Array[] = [];
  let readBytes = 0;

  for (let index = 0; index < shardPaths.length; index += 1) {
    const shard = new File(modelDir, shardPaths[index]);
    const bytes = await shard.bytes();
    chunks.push(bytes);
    readBytes += bytes.byteLength;

    const estimatedTotal =
      totalBytes > 0
        ? totalBytes
        : readBytes + Math.max(0, shardPaths.length - index - 1) * bytes.byteLength;

    onBytes?.(readBytes, Math.max(estimatedTotal, readBytes));
  }

  const weightData = new Uint8Array(readBytes);
  let offset = 0;
  for (const chunk of chunks) {
    weightData.set(chunk, offset);
    offset += chunk.byteLength;
  }

  onBytes?.(readBytes, readBytes);

  return tf.loadGraphModel(
    tf.io.fromMemory({
      modelTopology: modelJSON.modelTopology,
      weightSpecs,
      weightData: weightData.buffer,
      format: modelJSON.format,
      generatedBy: modelJSON.generatedBy,
      convertedBy: modelJSON.convertedBy,
    }),
  );
}
