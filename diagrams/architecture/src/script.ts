import { clamp, type EdgeId, type NodeId } from "./geometry";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 900;
const FADE = 12;

export type BeatId = "shape" | "modules" | "job" | "queue" | "provider" | "artifact";

export type Beat = {
  id: BeatId;
  index: string;
  kicker: string;
  title: string;
  body: string;
  start: number;
  end: number;
};

// Neighbouring beats overlap by FADE frames so the sentence can crossfade
// while the diagram itself stays on screen.
export const beats: Beat[] = [
  {
    id: "shape",
    index: "01",
    kicker: "The shape",
    title: "One process, files, and endpoints",
    body: "The browser, the API and the worker are one Node process. An upload becomes a folder under data/. The models stay outside the app, on HTTP endpoints you configure.",
    start: 0,
    end: 132,
  },
  {
    id: "modules",
    index: "02",
    kicker: "Modules",
    title: "A capability, not a screen",
    body: "OCR, transcription, translation, grounding, images, mind maps and chat are modules. Each one names the artifact kinds it accepts and the kinds it produces. The interface follows that list.",
    start: 120,
    end: 258,
  },
  {
    id: "job",
    index: "03",
    kicker: "The job",
    title: "The folder is the job",
    body: "Express checks the upload, then writes data/jobs/<id>/. job.json is the manifest. input/ keeps the source, work/ keeps checkpoints, and output/ keeps the files you will reuse.",
    start: 246,
    end: 402,
  },
  {
    id: "queue",
    index: "04",
    kicker: "The run",
    title: "Redis only carries the run",
    body: "BullMQ stores a run id. The worker reads the manifest and hands the run to that module's executor. The queue does not import OCR, speech or chat.",
    start: 390,
    end: 552,
  },
  {
    id: "provider",
    index: "05",
    kicker: "The provider",
    title: "The executor calls out",
    body: "A provider is the configured endpoint for a module. This scan goes to OCR. The weights are not part of the app, so the same job folder can point at another model.",
    start: 540,
    end: 708,
  },
  {
    id: "artifact",
    index: "06",
    kicker: "The artifact",
    title: "The result remembers its source",
    body: "The text comes back as an artifact: which run wrote it, and which file it came from. That lineage is why the Markdown can continue into a translation, a mind map or a chat. Progress streams to the browser.",
    start: 696,
    end: 900,
  },
];

export const modules = ["OCR", "Transcription", "Translation", "Grounding", "Text to image", "Mind map", "Chat"] as const;

export const nodeEnterAt: Record<NodeId, number> = {
  ui: 0,
  api: 6,
  disk: 12,
  models: 108,
  queue: 378,
  worker: 386,
};

const highlighted: Record<BeatId, NodeId[]> = {
  shape: ["ui", "api", "disk"],
  modules: ["models"],
  job: ["ui", "api", "disk"],
  queue: ["queue", "worker"],
  provider: ["worker", "models"],
  artifact: ["disk", "models", "ui"],
};

export type DiskRow = {
  name: string;
  note: string;
  at: number;
};

export const diskRows: DiskRow[] = [
  { name: "job.json", note: "manifest", at: 250 },
  { name: "input/scan.pdf", note: "source", at: 310 },
  { name: "work/", note: "checkpoints", at: 410 },
  { name: "output/document.md", note: "artifact", at: 760 },
];

export type PacketLeg = {
  edge: EdgeId;
  label: string;
  start: number;
  end: number;
};

export const packetLegs: PacketLeg[] = [
  { edge: "upload", label: "scan.pdf", start: 260, end: 318 },
  { edge: "create", label: "scan.pdf", start: 318, end: 378 },
  { edge: "enqueue", label: "run", start: 410, end: 478 },
  { edge: "dispatch", label: "run", start: 478, end: 530 },
  { edge: "call", label: "scan.pdf", start: 566, end: 660 },
  { edge: "artifact", label: "document.md", start: 740, end: 830 },
];

export const eventsDraw = { start: 760, end: 860 };

export function beatOpacity(frame: number, beat: Beat): number {
  const fadeIn = beat.start === 0 ? 1 : clamp((frame - beat.start) / FADE, 0, 1);
  if (beat.id === "artifact") return fadeIn;
  const fadeOut = clamp((beat.end - frame) / FADE, 0, 1);
  return Math.min(fadeIn, fadeOut);
}

export function dominantBeat(frame: number): Beat {
  let best = beats[0];
  let bestOpacity = -1;
  for (const beat of beats) {
    const opacity = beatOpacity(frame, beat);
    if (opacity >= bestOpacity) {
      best = beat;
      bestOpacity = opacity;
    }
  }
  return best;
}

export function activeNodes(frame: number): NodeId[] {
  return highlighted[dominantBeat(frame).id].filter((id) => frame >= nodeEnterAt[id]);
}

export function edgeShownAt(id: EdgeId): number {
  switch (id) {
    case "upload":
    case "create":
      return 18;
    case "enqueue":
    case "dispatch":
      return 390;
    case "call":
      return 548;
    case "artifact":
    case "events":
      return eventsDraw.start;
  }
}

export function activeEdge(frame: number): EdgeId | null {
  for (const leg of packetLegs) {
    if (frame >= leg.start && frame < leg.end) return leg.edge;
  }
  if (frame >= eventsDraw.start && frame <= DURATION) return "events";
  return null;
}

export function modelsSubtitle(beat: BeatId): string {
  if (beat === "modules") return "Each one names the artifacts it takes and returns";
  if (beat === "provider") return "This scan is sent to the OCR endpoint";
  if (beat === "artifact") return "OCR has answered";
  return "Endpoints you configure";
}

export function diskDetail(beat: BeatId): string {
  if (beat === "shape") return "Plain files are the record";
  if (beat === "artifact") return "Enough to copy, back up or move";
  return "job.json is the manifest";
}
