export function formatPercent(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function formatElapsed(ms: number) {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatObjectCount(count: number) {
  return count === 1 ? '1 objeto' : `${count} objetos`;
}
