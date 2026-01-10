import { MinHeap } from './MinHeap';
import type { Vec2 } from './types';

interface PolarAStarPlanParams {
  start: Vec2;
  goal: Vec2;
  obstaclePoints: Vec2[];
  pixelSize: number;
  systemBaseOrbit: number;
}

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const angleWrap = (a: number): number => {
  let x = a % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x;
};

const worldAngle = (p: Vec2): number => angleWrap(Math.atan2(p.y, p.x));
const worldRadius = (p: Vec2): number => Math.hypot(p.x, p.y);

export function planPolarAStarPath(params: PolarAStarPlanParams): Vec2[] {
  const { start, goal, obstaclePoints, pixelSize, systemBaseOrbit } = params;

  const startR = worldRadius(start);
  const goalR = worldRadius(goal);
  const maxOrbit = Math.max(
    startR,
    goalR,
    ...obstaclePoints.map((p) => worldRadius(p))
  );

  const sunAvoid = systemBaseOrbit * 0.5;
  const minR = Math.max(sunAvoid, Math.min(startR, goalR) * 0.65);
  const maxR = Math.max(minR + 1, maxOrbit * 1.25);

  const ringCount = 18;
  const angleCount = 64;

  const ringStep = (maxR - minR) / (ringCount - 1);
  const angleStep = (Math.PI * 2) / angleCount;

  const toNode = (p: Vec2): number => {
    const r = worldRadius(p);
    const a = worldAngle(p);
    const ri = clamp(Math.round((r - minR) / ringStep), 0, ringCount - 1);
    const ai =
      ((Math.round(a / angleStep) % angleCount) + angleCount) % angleCount;
    return ri * angleCount + ai;
  };

  const nodeToPoint = (id: number): Vec2 => {
    const ri = Math.floor(id / angleCount);
    const ai = id - ri * angleCount;
    const r = minR + ri * ringStep;
    const a = ai * angleStep;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  };

  const obstacleCost = (p: Vec2): number => {
    const r = worldRadius(p);
    if (r < sunAvoid) return 1e9;

    let cost = 0;
    for (const q of obstaclePoints) {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      const avoid = pixelSize * 18;
      if (d < avoid) return 1e9;
      const influence = pixelSize * 70;
      if (d < influence) {
        const t = 1 - d / influence;
        cost += t * t * 1800;
      }
    }

    const mid = (minR + maxR) * 0.5;
    cost += Math.abs(r - mid) * 0.12;
    return cost;
  };

  const startId = toNode(start);
  const goalId = toNode(goal);
  if (startId === goalId) return [start, goal];

  const nodeCount = ringCount * angleCount;
  const gScore = new Float64Array(nodeCount);
  const fScore = new Float64Array(nodeCount);
  const cameFrom = new Int32Array(nodeCount);
  const closed = new Uint8Array(nodeCount);
  const inOpen = new Uint8Array(nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    gScore[i] = Number.POSITIVE_INFINITY;
    fScore[i] = Number.POSITIVE_INFINITY;
    cameFrom[i] = -1;
  }

  const heuristic = (a: Vec2, b: Vec2): number =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const startPt = nodeToPoint(startId);
  const goalPt = nodeToPoint(goalId);
  gScore[startId] = 0;
  fScore[startId] = heuristic(startPt, goalPt);

  const open = new MinHeap<number>();
  open.push(fScore[startId], startId);
  inOpen[startId] = 1;

  const neighborIds = (id: number): number[] => {
    const ri = Math.floor(id / angleCount);
    const ai = id - ri * angleCount;
    const out: number[] = [];
    const a0 = (ai - 1 + angleCount) % angleCount;
    const a1 = (ai + 1) % angleCount;
    out.push(ri * angleCount + a0, ri * angleCount + a1);
    if (ri > 0) out.push((ri - 1) * angleCount + ai);
    if (ri + 1 < ringCount) out.push((ri + 1) * angleCount + ai);
    if (ri > 0)
      out.push((ri - 1) * angleCount + a0, (ri - 1) * angleCount + a1);
    if (ri + 1 < ringCount)
      out.push((ri + 1) * angleCount + a0, (ri + 1) * angleCount + a1);
    return out;
  };

  let found = false;
  const maxIterations = 6000;
  let iterations = 0;

  while (open.size > 0 && iterations++ < maxIterations) {
    const current = open.pop()!;
    const id = current.value;
    if (closed[id]) continue;
    closed[id] = 1;
    inOpen[id] = 0;

    if (id === goalId) {
      found = true;
      break;
    }

    const p = nodeToPoint(id);
    const neighbors = neighborIds(id);
    for (const nb of neighbors) {
      if (closed[nb]) continue;
      const np = nodeToPoint(nb);
      const base = Math.hypot(np.x - p.x, np.y - p.y);

      const mid = { x: (p.x + np.x) * 0.5, y: (p.y + np.y) * 0.5 };
      const penalty = obstacleCost(mid);
      if (penalty >= 1e8) continue;

      const tentative = gScore[id] + base + penalty * 0.001;
      if (tentative < gScore[nb]) {
        cameFrom[nb] = id;
        gScore[nb] = tentative;
        fScore[nb] = tentative + heuristic(np, goalPt);
        open.push(fScore[nb], nb);
        inOpen[nb] = 1;
      }
    }
  }

  if (!found) {
    const sa = worldAngle(start);
    const ga = worldAngle(goal);
    const delta = Math.atan2(Math.sin(ga - sa), Math.cos(ga - sa));
    const midA = sa + delta * 0.5;
    const midR = Math.max(sunAvoid * 1.35, (startR + goalR) * 0.6);
    const mid = { x: Math.cos(midA) * midR, y: Math.sin(midA) * midR };
    return [start, mid, goal];
  }

  const nodes: number[] = [];
  let cur = goalId;
  nodes.push(cur);
  while (cur !== startId && cameFrom[cur] !== -1) {
    cur = cameFrom[cur];
    nodes.push(cur);
  }
  nodes.reverse();

  let pts: Vec2[] = nodes.map(nodeToPoint);
  pts[0] = start;
  pts[pts.length - 1] = goal;

  const chaikin = (input: Vec2[]): Vec2[] => {
    if (input.length < 3) return input;
    const out: Vec2[] = [input[0]];
    for (let i = 0; i < input.length - 1; i++) {
      const p0 = input[i];
      const p1 = input[i + 1];
      out.push(
        { x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 },
        { x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 }
      );
    }
    out.push(input[input.length - 1]);
    return out;
  };

  pts = chaikin(pts);
  pts = chaikin(pts);

  const reduced: Vec2[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = reduced[reduced.length - 1];
    if (Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > pixelSize * 2) {
      reduced.push(pts[i]);
    }
  }
  if (reduced.length < 2) return [start, goal];
  reduced[0] = start;
  reduced[reduced.length - 1] = goal;
  return reduced;
}
