/**
 * @file Road followed by enemies, with position lookup by travelled distance.
 */

/**
 * A poly-line followed by enemies. Coordinates are in tile units
 * (1 = one tile), so the engine is independent of screen size.
 */
export class Path {
  /**
   * @param {{x:number,y:number}[]} points
   * @param {{air?:boolean}} [opts] air = straight flight lane (not drawn, not blocking)
   */
  constructor(points, { air = false } = {}) {
    if (!points || points.length < 2) throw new Error('A path needs at least two points');
    this.points = points;
    this.air = air;
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
  static fromGrid(cells, opts) {
    return new Path(
      cells.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 })),
      opts,
    );
  }

  /** Straight flight lane from the first to the last point of a ground path. */
  static airLane(path) {
    const a = path.points[0];
    const b = path.points[path.points.length - 1];
    return new Path([a, b], { air: true });
  }

  /**
   * Position (and heading) at a given travelled distance.
   * @param {number} distance
   * @returns {{x:number, y:number, angle:number}}
   */
  pointAt(distance) {
    if (distance <= 0) {
      const s = this.segments[0];
      return { x: s.a.x, y: s.a.y, angle: s.angle };
    }
    if (distance >= this.length) {
      const s = this.segments[this.segments.length - 1];
      return { x: s.b.x, y: s.b.y, angle: s.angle };
    }
    // Segments are few (< 20): a linear scan is the fastest option here.
    for (const s of this.segments) {
      if (distance <= s.start + s.length) {
        const t = (distance - s.start) / s.length;
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, angle: s.angle };
      }
    }
    const last = this.segments[this.segments.length - 1];
    return { x: last.b.x, y: last.b.y, angle: last.angle };
  }

  /**
   * Closest point of the path to (x, y).
   * @returns {{x:number, y:number, distance:number, d2:number}} distance = travelled distance at that point
   */
  closestPoint(x, y) {
    let best = null;
    for (const s of this.segments) {
      const dx = s.b.x - s.a.x;
      const dy = s.b.y - s.a.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - s.a.x) * dx + (y - s.a.y) * dy) / len2));
      const px = s.a.x + dx * t;
      const py = s.a.y + dy * t;
      const d2 = (px - x) ** 2 + (py - y) ** 2;
      if (!best || d2 < best.d2) best = { x: px, y: py, distance: s.start + s.length * t, d2 };
    }
    return best;
  }
}
