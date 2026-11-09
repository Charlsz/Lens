import { Buffer } from 'buffer';

const root = globalThis as typeof globalThis & { Buffer?: typeof Buffer };

if (typeof root.Buffer === 'undefined') {
  root.Buffer = Buffer;
}
