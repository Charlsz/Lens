import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatElapsed, formatObjectCount, formatPercent } from './formatters';
import { isTargetClass, toDetections } from './mapPredictions';
import type { RawPrediction } from '../entities/Detection';

describe('isTargetClass', () => {
  it('acepta clases objetivo en inglés del modelo', () => {
    assert.equal(isTargetClass('cup'), true);
    assert.equal(isTargetClass('person'), true);
    assert.equal(isTargetClass('cell phone'), true);
  });

  it('rechaza clases fuera del set Edge AI', () => {
    assert.equal(isTargetClass('dog'), false);
    assert.equal(isTargetClass('Taza'), false);
  });
});

describe('toDetections', () => {
  const predictions: RawPrediction[] = [
    { bbox: [10, 20, 100, 80], class: 'cup', score: 0.91 },
    { bbox: [0, 0, 50, 50], class: 'dog', score: 0.99 },
    { bbox: [5, 5, 40, 40], class: 'person', score: 0.28 },
    { bbox: [200, 100, 60, 90], class: 'bottle', score: 0.55 },
  ];

  it('filtra por clase objetivo y umbral, y usa etiquetas en español', () => {
    const detections = toDetections(predictions, 300, 400, 0.32);

    assert.equal(detections.length, 2);
    assert.equal(detections[0].label, 'Taza');
    assert.equal(detections[0].className, 'cup');
    assert.equal(detections[1].label, 'Botella');
  });

  it('normaliza cajas a coordenadas relativas', () => {
    const [cup] = toDetections(
      [{ bbox: [30, 40, 60, 80], class: 'cup', score: 0.8 }],
      300,
      400,
      0.3,
    );

    assert.ok(cup.box.x > 0 && cup.box.x < 1);
    assert.ok(cup.box.y > 0 && cup.box.y < 1);
    assert.ok(cup.box.width > 0 && cup.box.width <= 1);
    assert.ok(cup.box.height > 0 && cup.box.height <= 1);
  });

  it('devuelve vacío si el tamaño de imagen es inválido', () => {
    assert.deepEqual(toDetections(predictions, 0, 400), []);
  });

  it('respeta un umbral personalizado', () => {
    const detections = toDetections(
      [
        { bbox: [1, 1, 10, 10], class: 'cup', score: 0.35 },
        { bbox: [1, 1, 10, 10], class: 'book', score: 0.5 },
      ],
      100,
      100,
      0.38,
    );

    assert.equal(detections.length, 1);
    assert.equal(detections[0].className, 'book');
  });
});

describe('format helpers', () => {
  it('formatea porcentaje, tiempo y conteo en español', () => {
    assert.equal(formatPercent(0.876), '88%');
    assert.equal(formatElapsed(1530), '1.5 s');
    assert.equal(formatObjectCount(1), '1 objeto');
    assert.equal(formatObjectCount(3), '3 objetos');
  });
});
