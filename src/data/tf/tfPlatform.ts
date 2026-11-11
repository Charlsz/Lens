import { Buffer } from 'buffer';
import * as tf from '@tensorflow/tfjs';

let configured = false;

/**
 * TensorFlow.js only auto-registers browser/node platforms.
 * React Native is neither, so `env().platform` stays undefined and
 * ops fail with "Cannot read property 'isTypedArray' of undefined".
 */
export function ensureTfPlatform() {
  if (configured || tf.env().platform != null) {
    configured = true;
    return;
  }

  const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

  tf.env().setPlatform('react-native', {
    fetch(path: string, init?: RequestInit) {
      return fetch(path, init);
    },
    now() {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
      }
      return Date.now();
    },
    encode(text: string, encoding: string) {
      if (encoding !== 'utf-8' && encoding !== 'utf8') {
        throw new Error(`Unsupported encoding: ${encoding}`);
      }
      if (textEncoder) {
        return textEncoder.encode(text);
      }
      return new Uint8Array(Buffer.from(text, 'utf8'));
    },
    decode(bytes: Uint8Array, encoding: string) {
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder(encoding).decode(bytes);
      }
      return Buffer.from(bytes).toString(encoding || 'utf8');
    },
    isTypedArray(a: unknown): a is Float32Array | Int32Array | Uint8Array | Uint8ClampedArray {
      return (
        a instanceof Float32Array ||
        a instanceof Int32Array ||
        a instanceof Uint8Array ||
        a instanceof Uint8ClampedArray
      );
    },
  });

  configured = true;
}
