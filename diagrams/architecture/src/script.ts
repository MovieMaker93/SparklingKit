import { clamp, type EdgeId, type NodeId } from "./geometry";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 900;
const FADE = 12;

export type BeatId = "shape" | "check" | "job" | "queue" | "executor" | "provider" | "artifact";

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
    index: "1",
    kicker: "Upload",
    title: "The scan starts here",
    body: "scan.pdf starts in the browser.",
    start: 0,
    end: 140,
  },
  {
    id: "check",
    index: "2",
    kicker: "Check",
    title: "The request is checked",
    body: "Express checks the request, then opens a job.",
    start: 128,
    end: 268,
  },
  {
    id: "job",
    index: "3",
    kicker: "Folder",
    title: "The folder is the job",
    body: "job.json, input/, work/ and output/ are ordinary files.",
    start: 256,
    end: 396,
  },
  {
    id: "queue",
    index: "4",
    kicker: "Queue",
    title: "Redis only carries the run",
    body: "BullMQ stores a run id. The file stays in the folder.",
    start: 384,
    end: 524,
  },
  {
    id: "executor",
    index: "5",
    kicker: "Worker",
    title: "The worker dispatches",
    body: "The worker calls that module's executor. The queue does not.",
    start: 512,
    end: 652,
  },
  {
    id: "provider",
    index: "6",
    kicker: "Model",
    title: "The model stays outside",
    body: "This scan calls OCR. The weights are not part of the app.",
    start: 640,
    end: 780,
  },
  {
    id: "artifact",
    index: "7",
    kicker: "Artifact",
    title: "The result remembers its source",
    body: "document.md remembers scan.pdf, so the next module can use it.",
    start: 768,
    end: 900,
  },
];

export const modules = ["OCR", "Transcription", "Translation", "Grounding", "Text to image", "Mind map", "Chat"] as const;

// The whole board is on screen from the first frame. The ring does the walking.
export const nodeEnterAt: Record<NodeId, number> = {
  ui: 0,
  api: 0,
  disk: 0,
  models: 0,
  queue: 0,
  worker: 0,
};

const highlighted: Record<BeatId, NodeId[]> = {
  shape: ["ui"],
  check: ["api"],
  job: ["disk"],
  queue: ["queue"],
  executor: ["worker"],
  provider: ["models"],
  artifact: ["disk"],
};

export type DiskRow = {
  name: string;
  note: string;
  hotAt: number;
  filledName?: string;
  filledNote?: string;
  filledAt?: number;
};

export const diskRows: DiskRow[] = [
  { name: "job.json", note: "manifest", hotAt: 0 },
  { name: "input/scan.pdf", note: "source", hotAt: 0 },
  { name: "work/", note: "checkpoints", hotAt: 0 },
  { name: "output/document.md", note: "artifact", hotAt: 0 },
];

export type PacketLeg = {
  edge: EdgeId;
  label: string;
  start: number;
  end: number;
};

export const packetLegs: PacketLeg[] = [
  { edge: "upload", label: "scan.pdf", start: 24, end: 110 },
  { edge: "create", label: "scan.pdf", start: 140, end: 230 },
  { edge: "enqueue", label: "run", start: 400, end: 490 },
  { edge: "dispatch", label: "run", start: 520, end: 600 },
  { edge: "call", label: "scan.pdf", start: 660, end: 750 },
  { edge: "artifact", label: "document.md", start: 790, end: 860 },
];

export const eventsDraw = { start: 860, end: 900 };

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

export function edgeShownAt(_id: EdgeId): number {
  return 0;
}

export function activeEdge(frame: number): EdgeId | null {
  for (const leg of packetLegs) {
    if (frame >= leg.start && frame < leg.end) return leg.edge;
  }
  if (frame >= eventsDraw.start && frame <= DURATION) return "events";
  return null;
}

export function modelsSubtitle(beat: BeatId): string {
  if (beat === "provider") return "This scan calls OCR";
  if (beat === "artifact") return "OCR has answered";
  return "Endpoints you configure";
}

export function diskDetail(_beat: BeatId): string {
  return "The folder you can copy";
}
