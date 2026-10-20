/**
 * @file The route of a chapter on the campaign map: where its ten levels sit, and
 * the smooth road that joins them. Pure functions on numbers, no drawing.
 */

/** The levels of a chapter on a tall map (phones held upright), from the bottom up. */
const TALL = Object.freeze([
  [0.18, 0.88], [0.44, 0.81], [0.72, 0.75], [0.77, 0.63], [0.49, 0.55],
  [0.23, 0.46], [0.33, 0.34], [0.62, 0.3], [0.8, 0.19], [0.51, 0.09],
]);

/** The same on a wide map (larger screens, phones on their side), from left to right. */
const WIDE = Object.freeze([
  [0.07, 0.74], [0.17, 0.5], [0.27, 0.28], [0.38, 0.46], [0.47, 0.72],
  [0.57, 0.52], [0.65, 0.27], [0.76, 0.4], [0.85, 0.66], [0.93, 0.38],
]);

/**
 * Positions of a chapter's levels on a map of the given size, in pixels. Every other
 * chapter runs mirrored, so two chapters in a row never look alike.
 * @param {number} chapter chapter number (1-based)
 * @param {number} width
 * @param {number} height
 * @returns {Array<{x: number, y: number}>}
 */
export function levelSpots(chapter, width, height) {
  const tall = height > width;
  const mirrored = chapter % 2 === 0;
  return (tall ? TALL : WIDE).map(([x, y]) => {
    const nx = tall && mirrored ? 1 - x : x;
    const ny = !tall && mirrored ? 1 - y : y;
    return { x: Math.round(nx * width), y: Math.round(ny * height) };
  });
}

/**
 * The road through the points, as cubic Bézier segments (a Catmull-Rom spline:
 * it passes through every point, with no sharp corner).
 * @param {Array<{x: number, y: number}>} points
 */
export function roadSegments(points) {
  const at = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    segments.push({
      from: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    });
  }
  return segments;
}

/** SVG path data of consecutive segments ('' when there are none). */
export function pathData(segments) {
  if (!segments.length) return '';
  const r = (v) => Math.round(v * 10) / 10;
  const [first] = segments;
  let d = `M${r(first.from.x)} ${r(first.from.y)}`;
  for (const s of segments) d += ` C${r(s.c1.x)} ${r(s.c1.y)} ${r(s.c2.x)} ${r(s.c2.y)} ${r(s.to.x)} ${r(s.to.y)}`;
  return d;
}
