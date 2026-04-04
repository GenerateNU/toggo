/**
 * Generates a deterministic bar-height array for a pitch waveform.
 * Seeded from the pitch ID so the same pitch always shows the same shape.
 * Heights are in pixels, ranging from 4 to 28.
 */
export function getPitchBarHeights(
  pitchId: string,
  barCount: number,
): number[] {
  return Array.from({ length: barCount }, (_, i) => {
    let hash = 0;
    const seed = `${pitchId}${i}`;
    for (let j = 0; j < seed.length; j++) {
      hash = (hash * 31 + seed.charCodeAt(j)) & 0xffffffff;
    }
    return 10 + (Math.abs(hash) % 22);
  });
}

const METERING_MIN_HEIGHT = 4;
const METERING_MAX_HEIGHT = 36;

/**
 * Interpolates a live metering history buffer into a fixed-length bar-height array.
 * Heights are in pixels.
 */
export function computeBarHeightsFromMetering(
  meteringHistory: number[],
  barCount: number,
): number[] {
  const historyLen = meteringHistory.length;
  return Array.from({ length: barCount }, (_, i) => {
    let amplitude: number;
    if (historyLen > 1) {
      const srcIdx = (i / (barCount - 1)) * (historyLen - 1);
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, historyLen - 1);
      const t = srcIdx - lo;
      amplitude =
        (meteringHistory[lo] ?? 0) * (1 - t) + (meteringHistory[hi] ?? 0) * t;
    } else {
      amplitude = meteringHistory[i] ?? 0;
    }
    return (
      METERING_MIN_HEIGHT +
      amplitude * (METERING_MAX_HEIGHT - METERING_MIN_HEIGHT)
    );
  });
}
