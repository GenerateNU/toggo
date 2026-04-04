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
    return 4 + (Math.abs(hash) % 24);
  });
}
