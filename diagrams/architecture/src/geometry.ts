export type NodeId = "ui" | "api" | "disk" | "models" | "queue" | "worker";

export type EdgeId =
  | "upload"
  | "create"
  | "enqueue"
  | "dispatch"
  | "call"
  | "artifact"
  | "events";

export type Pt = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

export const stage = { w: 1184, h: 960 };

// The queue sits under the job folder, not under the browser. Its arrow
// leaves the API, runs down the gap beside the folder, and only then turns
// into the queue, so it does not look like the UI enqueued the run.
export const nodes: Record<NodeId, Rect> = {
  ui: { x: 28, y: 40, w: 292, h: 136 },
  api: { x: 412, y: 40, w: 320, h: 136 },
  disk: { x: 412, y: 260, w: 320, h: 328 },
  models: { x: 908, y: 260, w: 248, h: 328 },
  queue: { x: 412, y: 676, w: 250, h: 112 },
  worker: { x: 760, y: 676, w: 300, h: 112 },
};

export const continueStrip: Rect = {
  x: 36,
  y: nodes.worker.y + nodes.worker.h + 40,
  w: stage.w - 72,
  h: 88,
};

const midX = (rect: Rect) => rect.x + rect.w / 2;
const midY = (rect: Rect) => rect.y + rect.h / 2;

export type Edge = {
  id: EdgeId;
  label: string;
  points: Pt[];
  labelAt: Pt;
  dashed?: boolean;
};

export const edges: Edge[] = (() => {
  const { ui, api, disk, models, queue, worker } = nodes;
  const uploadY = midY(ui) + 22;
  const eventsY = midY(ui) - 30;
  const gutterX = (ui.x + ui.w + disk.x) / 2;
  const turnY = api.y + api.h + 28;
  const underDiskY = disk.y + disk.h + 32;
  const intoQueueX = midX(queue);
  // Level with the output/ row, so the returning file meets the line it is written to.
  const writeY = disk.y + disk.h - 108;
  const callX = midX(models);

  return [
    {
      id: "upload",
      label: "upload",
      points: [
        { x: ui.x + ui.w, y: uploadY },
        { x: api.x, y: uploadY },
      ],
      labelAt: { x: (ui.x + ui.w + api.x) / 2, y: uploadY + 20 },
    },
    {
      id: "events",
      label: "events",
      dashed: true,
      points: [
        { x: api.x, y: eventsY },
        { x: ui.x + ui.w, y: eventsY },
      ],
      labelAt: { x: (ui.x + ui.w + api.x) / 2, y: eventsY - 18 },
    },
    {
      id: "create",
      label: "create",
      points: [
        { x: midX(api), y: api.y + api.h },
        { x: midX(disk), y: disk.y },
      ],
      labelAt: { x: midX(api) + 72, y: (api.y + api.h + disk.y) / 2 },
    },
    {
      id: "enqueue",
      label: "enqueue",
      points: [
        { x: api.x + 36, y: api.y + api.h },
        { x: api.x + 36, y: turnY },
        { x: gutterX, y: turnY },
        { x: gutterX, y: underDiskY },
        { x: intoQueueX, y: underDiskY },
        { x: intoQueueX, y: queue.y },
      ],
      labelAt: { x: gutterX - 58, y: (turnY + underDiskY) / 2 },
    },
    {
      id: "dispatch",
      label: "dispatch",
      points: [
        { x: queue.x + queue.w, y: midY(queue) },
        { x: worker.x, y: midY(worker) },
      ],
      labelAt: { x: (queue.x + queue.w + worker.x) / 2, y: queue.y - 18 },
    },
    {
      id: "call",
      label: "call",
      points: [
        { x: callX, y: worker.y },
        { x: callX, y: models.y + models.h },
      ],
      labelAt: { x: models.x + models.w - 28, y: (worker.y + models.y + models.h) / 2 },
    },
    {
      id: "artifact",
      label: "write",
      points: [
        { x: models.x, y: writeY },
        { x: disk.x + disk.w, y: writeY },
      ],
      labelAt: { x: (models.x + disk.x + disk.w) / 2, y: writeY - 36 },
    },
  ];
})();

export const edgeById = Object.fromEntries(edges.map((edge) => [edge.id, edge])) as Record<EdgeId, Edge>;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function polylineLength(points: Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

export function pointAlong(points: Pt[], t: number): Pt {
  const total = polylineLength(points);
  if (points.length === 0) return { x: 0, y: 0 };
  if (total === 0) return points[0];
  let remaining = clamp(t, 0, 1) * total;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (remaining <= length) {
      const u = length === 0 ? 0 : remaining / length;
      return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

export function toPath(points: Pt[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function strictlyInside(rect: Rect, point: Pt, inset = 1): boolean {
  return (
    point.x > rect.x + inset &&
    point.x < rect.x + rect.w - inset &&
    point.y > rect.y + inset &&
    point.y < rect.y + rect.h - inset
  );
}
