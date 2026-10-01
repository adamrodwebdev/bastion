/**
 * @file Road followed by enemies, with position lookup by travelled distance.
 */

/**
 * A poly-line followed by enemies. Coordinates are in tile units
 * (1 = one tile), so the engine is independent of screen size.
 */
export class Path {
  /** @param {{x:number,y:number}[]} points */
  constructor(points) {
    if (!points || points.length < 2) throw new Error('A path needs at least two points');
    this.points = points;
    this.segments = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      this.segments.push({ a, b, start: total, length, angle: Math.atan2(b.y - a.y, b.x - a.x) });
      total += length;
    }
    this.length = total;
  }

  /** Builds a path that goes through the centre of the given grid cells. */
  static fromGrid(cells) {
    return new Path(cells.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 })));
  }

  /** Position (and heading) at a given travelled distance. */
  pointAt(distance) {
    if (distance <= 0) {
      const s = this.segments[0];
      return { x: s.a.x, y: s.a.y, angle: s.angle };
    }
    if (distance >= this.length) {
      const s = this.segments[this.segments.length - 1];
      return { x: s.b.x, y: s.b.y, angle: s.angle };
    }
    // Segments are few (< 20), a linear scan is the fastest option here.
    for (const s of this.segments) {
      if (distance <= s.start + s.length) {
        const t = (distance - s.start) / s.length;
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, angle: s.angle };
      }
    }
    const last = this.segments[this.segments.length - 1];
    return { x: last.b.x, y: last.b.y, angle: last.angle };
  }
}
