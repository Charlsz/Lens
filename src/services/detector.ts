import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import { toByteArray } from 'base64-js';
import * as jpeg from 'jpeg-js';

import type { Detection, RawPrediction } from '../utils/detection';
import { toDetections } from '../utils/detection';
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

export type ProgressUpdate = {
  message: string;
  percent: number;
};

type ProgressCallback = (update: ProgressUpdate) => void;

let graphModel: tf.GraphModel | null = null;
let readyPromise: Promise<void> | null = null;

export async function prepareDetector(onProgress?: ProgressCallback): Promise<void> {
  if (graphModel) {
    onProgress?.({ message: 'Modelo listo en el dispositivo', percent: 30 });
    return;
  }

  if (!readyPromise) {
    readyPromise = (async () => {
      onProgress?.({ message: 'Inicializando TensorFlow.js…', percent: 4 });
      ensureTfPlatform();
      await tf.setBackend('cpu');
      await tf.ready();

      onProgress?.({ message: 'Preparando archivos del modelo…', percent: 10 });
      const modelDir = await ensureLocalModel((copied, total) => {
        const shardPercent = 10 + Math.round((copied / total) * 12);
        onProgress?.({
          message: `Copiando pesos del modelo (${copied}/${total})…`,
          percent: shardPercent,
        });
      });

      onProgress?.({ message: 'Cargando modelo Edge AI en memoria…', percent: 24 });
      graphModel = await loadGraphModelFromDirectory(modelDir);

      onProgress?.({ message: 'Calentando modelo (primera inferencia)…', percent: 28 });
      const warm = tf.zeros([1, 300, 300, 3], 'int32');
      const warmResult = (await graphModel.executeAsync(warm)) as tf.Tensor[];
      warmResult.forEach((tensor) => tensor.dispose());
      warm.dispose();

      onProgress?.({ message: 'Modelo listo en el dispositivo', percent: 30 });
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
    onProgress?: ProgressCallback;
    minScore?: number;
    quiet?: boolean;
  },
): Promise<{
  detections: Detection[];
  inferenceMs: number;
  imageWidth: number;
  imageHeight: number;
}> {
  const onProgress = options?.onProgress;
  const quiet = options?.quiet === true;

  await prepareDetector(quiet ? undefined : onProgress);

  if (!graphModel) {
    throw new Error('El modelo no está listo');
  }

  if (!quiet) {
    onProgress?.({ message: 'Decodificando imagen…', percent: 62 });
  }
  const { tensor, width, height } = imageToTensor(base64);
  const started = Date.now();

  try {
    if (!quiet) {
      onProgress?.({ message: 'Ejecutando reconocimiento Edge AI…', percent: 72 });
    }
    const predictions = await runDetection(graphModel, tensor, 20, 0.25);
    const inferenceMs = Date.now() - started;

    if (!quiet) {
      onProgress?.({ message: 'Filtrando detecciones…', percent: 92 });
    }
    const detections = toDetections(predictions, width, height, options?.minScore);

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
  onShardProgress?: (copied: number, total: number) => void,
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

    if (!destination.exists) {
      await asset.downloadAsync();

      if (!asset.localUri) {
        throw new Error(`Falta el fragmento del modelo: ${shardName}`);
      }

      const source = new File(asset.localUri);
      await source.copy(destination);
    }

    copied += 1;
    onShardProgress?.(copied, assets.length);
  }

  return modelDir;
}

async function loadGraphModelFromDirectory(modelDir: Directory) {
  const modelFile = new File(modelDir, 'model.json');
  const modelJSON = JSON.parse(await modelFile.text()) as GraphModelJSON;

  const weightSpecs: tf.io.WeightsManifestEntry[] = [];
  const chunks: Uint8Array[] = [];

  for (const group of modelJSON.weightsManifest) {
    weightSpecs.push(...group.weights);

    for (const path of group.paths) {
      const shard = new File(modelDir, path);
      const bytes = await shard.bytes();
      chunks.push(bytes);
    }
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const weightData = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    weightData.set(chunk, offset);
    offset += chunk.byteLength;
  }

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
