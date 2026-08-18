import type { ThreadEdge, ThreadLayout, ThreadNode } from '../schemas';

export interface ThreadPoint {
  x: number;
  y: number;
}

export interface ThreadRenderNode extends Omit<ThreadNode, 'position'> {
  position?: ThreadNode['position'];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThreadRenderEdge extends ThreadEdge {
  points: ThreadPoint[];
  path: string;
  labelPoint: ThreadPoint;
}

export interface ThreadLayoutResult {
  width: number;
  height: number;
  nodes: ThreadRenderNode[];
  edges: ThreadRenderEdge[];
}

interface BuildThreadLayoutInput {
  layout: ThreadLayout;
  nodes: ThreadNode[];
  edges: ThreadEdge[];
  compact?: boolean;
}

const WIDE_NODE_WIDTH = 148;
const COMPACT_NODE_WIDTH = 216;
const NODE_HEIGHT = 72;
const MARGIN_X = 98;
const MARGIN_Y = 68;

function evenlySpaced(index: number, total: number, start: number, end: number): number {
  if (total <= 1) return (start + end) / 2;
  return start + (index * (end - start)) / (total - 1);
}

function compactPositions(
  nodes: ThreadNode[],
): Pick<ThreadLayoutResult, 'width' | 'height' | 'nodes'> {
  const width = 320;
  const height = Math.max(260, 108 + nodes.length * 126);
  return {
    width,
    height,
    nodes: nodes.map((node, index) => ({
      ...node,
      x: width / 2,
      y: 70 + index * 126,
      width: COMPACT_NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
  };
}

function normalizedPositions(
  nodes: ThreadNode[],
): Pick<ThreadLayoutResult, 'width' | 'height' | 'nodes'> | undefined {
  if (!nodes.every((node) => node.position)) return undefined;
  const width = 920;
  const height = 520;
  return {
    width,
    height,
    nodes: nodes.map((node) => ({
      ...node,
      x: MARGIN_X + node.position!.x * (width - MARGIN_X * 2),
      y: MARGIN_Y + node.position!.y * (height - MARGIN_Y * 2),
      width: WIDE_NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
  };
}

function sequentialPositions(
  layout: ThreadLayout,
  nodes: ThreadNode[],
): Pick<ThreadLayoutResult, 'width' | 'height' | 'nodes'> {
  if (layout === 'vertical') {
    const width = 440;
    const height = Math.max(300, MARGIN_Y * 2 + (nodes.length - 1) * 126);
    return {
      width,
      height,
      nodes: nodes.map((node, index) => ({
        ...node,
        x: width / 2,
        y: evenlySpaced(index, nodes.length, MARGIN_Y, height - MARGIN_Y),
        width: WIDE_NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
    };
  }

  if (layout === 'stack') {
    const width = 560;
    const height = Math.max(330, MARGIN_Y * 2 + (nodes.length - 1) * 112);
    return {
      width,
      height,
      nodes: nodes.map((node, index) => ({
        ...node,
        x: width / 2 + (index % 2 === 0 ? -62 : 62),
        y: evenlySpaced(index, nodes.length, MARGIN_Y, height - MARGIN_Y),
        width: WIDE_NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
    };
  }

  const width = Math.max(680, MARGIN_X * 2 + (nodes.length - 1) * 184);
  const height = layout === 'loop' ? 300 : 230;
  return {
    width,
    height,
    nodes: nodes.map((node, index) => ({
      ...node,
      x: evenlySpaced(index, nodes.length, MARGIN_X, width - MARGIN_X),
      y: height / 2,
      width: WIDE_NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
  };
}

function layeredPositions(
  nodes: ThreadNode[],
  edges: ThreadEdge[],
): Pick<ThreadLayoutResult, 'width' | 'height' | 'nodes'> {
  const levels = new Map(nodes.map((node) => [node.id, node.stage === 'intent' ? 0 : -1]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    for (const edge of edges.filter((item) => item.kind !== 'iteration')) {
      const fromLevel = levels.get(edge.from) ?? -1;
      const toLevel = levels.get(edge.to) ?? -1;
      if (fromLevel >= 0 && fromLevel + 1 > toLevel) levels.set(edge.to, fromLevel + 1);
    }
  }
  let fallbackLevel = 0;
  for (const node of nodes) {
    if ((levels.get(node.id) ?? -1) < 0) {
      fallbackLevel += 1;
      levels.set(node.id, fallbackLevel);
    }
  }

  const maxLevel = Math.max(1, ...levels.values());
  const groups = new Map<number, ThreadNode[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    const group = groups.get(level) ?? [];
    group.push(node);
    groups.set(level, group);
  }
  const largestGroup = Math.max(...[...groups.values()].map((group) => group.length));
  const width = Math.max(760, MARGIN_X * 2 + maxLevel * 210);
  const height = Math.max(320, MARGIN_Y * 2 + (largestGroup - 1) * 132);
  const renderNodes: ThreadRenderNode[] = [];
  for (const [level, group] of [...groups.entries()].sort(([left], [right]) => left - right)) {
    group.forEach((node, index) => {
      renderNodes.push({
        ...node,
        x: evenlySpaced(level, maxLevel + 1, MARGIN_X, width - MARGIN_X),
        y: evenlySpaced(index, group.length, MARGIN_Y, height - MARGIN_Y),
        width: WIDE_NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  }
  return { width, height, nodes: renderNodes };
}

function trimEndpoint(center: ThreadPoint, next: ThreadPoint, node: ThreadRenderNode): ThreadPoint {
  if (center.x === next.x) {
    return { x: center.x, y: center.y + (next.y > center.y ? node.height / 2 : -node.height / 2) };
  }
  return { x: center.x + (next.x > center.x ? node.width / 2 : -node.width / 2), y: center.y };
}

function trimRoute(
  points: ThreadPoint[],
  from: ThreadRenderNode,
  to: ThreadRenderNode,
): ThreadPoint[] {
  if (points.length < 2) return points;
  const trimmed = points.map((point) => ({ ...point }));
  trimmed[0] = trimEndpoint(trimmed[0]!, trimmed[1]!, from);
  trimmed[trimmed.length - 1] = trimEndpoint(
    trimmed[trimmed.length - 1]!,
    trimmed[trimmed.length - 2]!,
    to,
  );
  return trimmed.filter(
    (point, index) =>
      index === 0 || point.x !== trimmed[index - 1]!.x || point.y !== trimmed[index - 1]!.y,
  );
}

function segmentIntersectsNode(
  start: ThreadPoint,
  end: ThreadPoint,
  node: ThreadRenderNode,
  padding = 8,
): boolean {
  const left = node.x - node.width / 2 - padding;
  const right = node.x + node.width / 2 + padding;
  const top = node.y - node.height / 2 - padding;
  const bottom = node.y + node.height / 2 + padding;
  if (start.y === end.y) {
    return (
      start.y >= top &&
      start.y <= bottom &&
      Math.max(start.x, end.x) >= left &&
      Math.min(start.x, end.x) <= right
    );
  }
  if (start.x === end.x) {
    return (
      start.x >= left &&
      start.x <= right &&
      Math.max(start.y, end.y) >= top &&
      Math.min(start.y, end.y) <= bottom
    );
  }
  return true;
}

export function routeCrossesNode(route: ThreadPoint[], node: ThreadRenderNode): boolean {
  return route.slice(1).some((point, index) => segmentIntersectsNode(route[index]!, point, node));
}

function longestSegmentMidpoint(points: ThreadPoint[]): ThreadPoint {
  let best = { length: -1, point: points[0] ?? { x: 0, y: 0 } };
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const length = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    if (length > best.length) {
      best = { length, point: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } };
    }
  }
  return best.point;
}

function routeEdge(
  edge: ThreadEdge,
  index: number,
  nodes: ThreadRenderNode[],
  width: number,
  height: number,
): ThreadRenderEdge {
  const from = nodes.find((node) => node.id === edge.from)!;
  const to = nodes.find((node) => node.id === edge.to)!;
  const centerFrom = { x: from.x, y: from.y };
  const centerTo = { x: to.x, y: to.y };
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const lane = 18 + (index % 5) * 13;
  const top = lane;
  const bottom = height - lane;
  const left = lane;
  const right = width - lane;
  const direct = [centerFrom, centerTo];
  const viaMidX = [centerFrom, { x: midX, y: from.y }, { x: midX, y: to.y }, centerTo];
  const viaMidY = [centerFrom, { x: from.x, y: midY }, { x: to.x, y: midY }, centerTo];
  const viaTop = [centerFrom, { x: from.x, y: top }, { x: to.x, y: top }, centerTo];
  const viaBottom = [centerFrom, { x: from.x, y: bottom }, { x: to.x, y: bottom }, centerTo];
  const viaLeft = [centerFrom, { x: left, y: from.y }, { x: left, y: to.y }, centerTo];
  const viaRight = [centerFrom, { x: right, y: from.y }, { x: right, y: to.y }, centerTo];
  const candidates =
    edge.kind === 'iteration'
      ? [viaTop, viaBottom, viaLeft, viaRight, viaMidX, viaMidY]
      : [direct, viaMidX, viaMidY, viaTop, viaBottom, viaLeft, viaRight];

  const obstacles = nodes.filter((node) => node.id !== from.id && node.id !== to.id);
  let points = trimRoute(viaRight, from, to);
  for (const candidate of candidates) {
    const trimmed = trimRoute(candidate, from, to);
    const axisAligned = trimmed
      .slice(1)
      .every(
        (point, pointIndex) =>
          point.x === trimmed[pointIndex]!.x || point.y === trimmed[pointIndex]!.y,
      );
    if (axisAligned && obstacles.every((node) => !routeCrossesNode(trimmed, node))) {
      points = trimmed;
      break;
    }
  }

  return {
    ...edge,
    points,
    path: points
      .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
    labelPoint: longestSegmentMidpoint(points),
  };
}

export function buildThreadLayout({
  layout,
  nodes,
  edges,
  compact = false,
}: BuildThreadLayoutInput): ThreadLayoutResult {
  const positioned = compact
    ? compactPositions(nodes)
    : (normalizedPositions(nodes) ??
      (layout === 'fork' || layout === 'compare' || layout === 'feedback'
        ? layeredPositions(nodes, edges)
        : sequentialPositions(layout, nodes)));
  return {
    ...positioned,
    edges: edges.map((edge, index) =>
      routeEdge(edge, index, positioned.nodes, positioned.width, positioned.height),
    ),
  };
}

export function wrapThreadLabel(label: string, maximum = 20): string[] {
  const words = label.trim().split(/\s+/u);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > maximum) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, 3);
}
