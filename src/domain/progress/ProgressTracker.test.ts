import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatBytes, ProgressTracker, type ProgressUpdate } from './ProgressTracker';

describe('formatBytes', () => {
  it('formatea bytes legibles', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(2048), '2.0 KB');
    assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
  });
});

describe('ProgressTracker', () => {
  it('avanza con fracciones reales y nunca baja el porcentaje', () => {
    const updates: ProgressUpdate[] = [];
    const tracker = new ProgressTracker('scan', (update) => {
      updates.push({ ...update });
    });

    tracker.begin('capture', 'Tomando foto…');
    tracker.setFraction(0.5, 'Procesando mitad…');
    tracker.setFraction(0.2, 'No debería bajar');
    tracker.complete('Foto lista');
    tracker.finish('Listo');
    tracker.dispose();

    assert.ok(updates.length >= 3);
    assert.equal(updates[0].message, 'Tomando foto…');
    assert.equal(updates[0].percent, 0);

    const percents = updates.map((item) => item.percent);
    for (let index = 1; index < percents.length; index += 1) {
      assert.ok(percents[index] >= percents[index - 1]);
    }
    assert.equal(updates[updates.length - 1].percent, 100);
  });

  it('reporta progreso de boot en cargar pesos', () => {
    const updates: ProgressUpdate[] = [];
    const tracker = new ProgressTracker('boot', (update) => updates.push({ ...update }));

    tracker.begin('load_weights', 'Cargando…');
    tracker.setFraction(1, '17 MB / 17 MB');
    tracker.complete('Modelo cargado');
    tracker.dispose();

    assert.ok(updates.some((item) => item.message.includes('17 MB')));
    assert.equal(updates[updates.length - 1].percent, 78);
  });
});
