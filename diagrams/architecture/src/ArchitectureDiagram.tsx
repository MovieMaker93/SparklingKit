import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import {
  continueStrip,
  edgeById,
  edges,
  nodes,
  pointAlong,
  smoothstep,
  stage,
  strictlyInside,
  toPath,
  type Edge,
  type EdgeId,
  type NodeId,
  type Rect,
} from "./geometry";
import {
  activeEdge,
  activeNodes,
  beatOpacity,
  beats,
  diskDetail,
  diskRows,
  dominantBeat,
  edgeShownAt,
  eventsDraw,
  modules,
  modelsSubtitle,
  nodeEnterAt,
  packetLegs,
  type BeatId,
} from "./script";
import { theme } from "./theme";

const inter = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const manrope = loadManrope("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const stageOrigin = { x: 672, y: 60 };

const appear = (frame: number, fps: number, at: number) => {
  if (frame < at) return 0;
  return spring({ frame: frame - at, fps, config: { damping: 200 } });
};

const cardCopy: Record<NodeId, { kicker: string; title: string; detail?: string }> = {
  ui: { kicker: "Browser", title: "React UI", detail: "Workbench and chat" },
  api: { kicker: "One Node process", title: "Express API", detail: "Checks the request" },
  disk: { kicker: "Durable record", title: "data/jobs/<id>" },
  models: { kicker: "Outside the app", title: "Seven modules" },
  queue: { kicker: "Coordination", title: "Redis · BullMQ", detail: "Holds the run id" },
  worker: { kicker: "Same process", title: "Worker", detail: "Module executor" },
};

export const ArchitectureDiagram = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = dominantBeat(frame);
  const hot = new Set(activeNodes(frame));
  const edgeHot = activeEdge(frame);
  const enters = Object.fromEntries(
    (Object.keys(nodes) as NodeId[]).map((id) => [id, appear(frame, fps, nodeEnterAt[id])]),
  ) as Record<NodeId, number>;

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: inter.fontFamily, color: theme.ink }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(880px 520px at 78% 40%, rgba(103, 220, 165, 0.09), transparent 68%)",
        }}
      />
      <Copy frame={frame} beatId={beat.id} />
      <div
        style={{
          position: "absolute",
          left: stageOrigin.x,
          top: stageOrigin.y,
          width: stage.w,
          height: stage.h,
          borderRadius: 28,
          background: theme.stage,
          border: `1px solid ${theme.lineSoft}`,
          overflow: "hidden",
        }}
      >
        <EdgeLayer frame={frame} enters={enters} hotEdge={edgeHot} />
        {(Object.keys(nodes) as NodeId[]).map((id) => (
          <Card
            key={id}
            id={id}
            rect={nodes[id]}
            enter={enters[id]}
            active={hot.has(id)}
            beat={beat.id}
            frame={frame}
            fps={fps}
          />
        ))}
        <Packet frame={frame} />
        <ContinueStrip frame={frame} fps={fps} />
      </div>
    </AbsoluteFill>
  );
};

const Copy = ({ frame, beatId }: { frame: number; beatId: BeatId }) => {
  return (
    <div style={{ position: "absolute", left: 64, top: 72, width: 560 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: manrope.fontFamily, fontWeight: 700, fontSize: 22, letterSpacing: -0.4 }}>
          SparklingKit
        </span>
        <span style={{ color: theme.muted, fontSize: 15, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase" }}>
          Architecture
        </span>
      </div>
      <div style={{ position: "relative", height: 470, marginTop: 36 }}>
        {beats.map((beat) => {
          const opacity = beatOpacity(frame, beat);
          return (
            <div key={beat.id} style={{ position: "absolute", inset: 0, opacity }}>
              <div style={{ color: theme.accent, fontWeight: 700, fontSize: 15, letterSpacing: 1.6 }}>
                {beat.index}  {beat.kicker.toUpperCase()}
              </div>
              <h1
                style={{
                  margin: "14px 0 0",
                  height: 124,
                  fontFamily: manrope.fontFamily,
                  fontWeight: 700,
                  fontSize: 46,
                  lineHeight: 1.08,
                  letterSpacing: -1.1,
                }}
              >
                {beat.title}
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 25, lineHeight: 1.38, color: theme.body }}>{beat.body}</p>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {beats.map((beat) => {
          const on = beat.id === beatId;
          return (
            <div
              key={beat.id}
              style={{
                width: on ? 36 : 10,
                height: 8,
                borderRadius: 99,
                background: on ? theme.accent : theme.lineSoft,
              }}
            />
          );
        })}
      </div>
      <div style={{ marginTop: 28, color: theme.muted, fontSize: 16, lineHeight: 1.4 }}>
        Mint marks the part this sentence is about.
      </div>
    </div>
  );
};

const Card = ({
  id,
  rect,
  enter,
  active,
  beat,
  frame,
  fps,
}: {
  id: NodeId;
  rect: Rect;
  enter: number;
  active: boolean;
  beat: BeatId;
  frame: number;
  fps: number;
}) => {
  const copy = cardCopy[id];
  const detail = id === "disk" ? diskDetail(beat) : id === "models" ? modelsSubtitle(beat) : copy.detail;
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: "border-box",
        padding: "16px 18px",
        borderRadius: 18,
        background: active ? theme.card : theme.cardIdle,
        border: `1.5px solid ${active ? theme.accent : theme.lineSoft}`,
        boxShadow: active ? `0 0 0 6px ${theme.accentGlow}` : "none",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 14}px)`,
      }}
    >
      <div
        style={{
          color: active ? theme.accent : theme.muted,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1.3,
          textTransform: "uppercase",
        }}
      >
        {copy.kicker}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: manrope.fontFamily,
          fontWeight: 700,
          fontSize: id === "disk" || id === "models" ? 26 : 28,
          letterSpacing: -0.5,
        }}
      >
        {copy.title}
      </div>
      {detail ? (
        <div style={{ marginTop: 4, color: theme.body, fontSize: 15, lineHeight: 1.3, minHeight: id === "models" ? 40 : 0 }}>
          {detail}
        </div>
      ) : null}
      {id === "disk" ? <DiskRows frame={frame} /> : null}
      {id === "models" ? <ModuleList beat={beat} /> : null}
    </div>
  );
};

const DiskRows = ({ frame }: { frame: number }) => {
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {diskRows.map((row) => {
        const filled = row.filledAt !== undefined && frame >= row.filledAt;
        const hot = frame >= row.hotAt;
        return (
          <div
            key={row.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 16 }}>
              {filled && row.filledName ? row.filledName : row.name}
            </span>
            <span style={{ color: hot ? theme.accent : theme.muted, fontSize: 13, fontWeight: 600 }}>
              {filled && row.filledNote ? row.filledNote : row.note}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ModuleList = ({ beat }: { beat: BeatId }) => {
  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
      {modules.map((name) => {
        const hot = name === "OCR" && (beat === "provider" || beat === "artifact");
        return (
          <div
            key={name}
            style={{
              height: 28,
              borderRadius: 8,
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: hot ? theme.accentSoft : "transparent",
              color: hot ? theme.accent : theme.ink,
              fontSize: 16,
              fontWeight: hot ? 700 : 500,
            }}
          >
            <span>{name}</span>
            {hot ? <span style={{ fontSize: 12, fontWeight: 700 }}>{beat === "provider" ? "this scan" : "done"}</span> : null}
          </div>
        );
      })}
    </div>
  );
};

const EdgeLayer = ({
  frame,
  enters,
  hotEdge,
}: {
  frame: number;
  enters: Record<NodeId, number>;
  hotEdge: EdgeId | null;
}) => {
  const owners: Record<Edge["id"], [NodeId, NodeId]> = {
    upload: ["ui", "api"],
    events: ["api", "ui"],
    create: ["api", "disk"],
    enqueue: ["api", "queue"],
    dispatch: ["queue", "worker"],
    call: ["worker", "models"],
    artifact: ["models", "disk"],
  };
  return (
    <svg width={stage.w} height={stage.h} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <marker id="head-idle" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill={theme.line} />
        </marker>
        <marker id="head-hot" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill={theme.accent} />
        </marker>
      </defs>
      {edges.map((edge) => {
        const [from, to] = owners[edge.id];
        const shown = frame >= edgeShownAt(edge.id);
        const opacity = shown ? Math.min(enters[from], enters[to]) : 0;
        const hot = edge.id === hotEdge;
        const draw =
          edge.id === "events"
            ? interpolate(frame, [eventsDraw.start, eventsDraw.end], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;
        return (
          <g key={edge.id} opacity={opacity}>
            <path
              d={toPath(edge.points)}
              fill="none"
              stroke={hot ? theme.accent : theme.line}
              strokeWidth={hot ? 3 : 2}
              strokeDasharray={edge.dashed ? "1" : undefined}
              strokeDashoffset={edge.dashed ? draw : undefined}
              pathLength={edge.dashed ? 1 : undefined}
              markerEnd={edge.dashed && draw > 0.08 ? undefined : hot ? "url(#head-hot)" : "url(#head-idle)"}
            />
            <EdgeLabel edge={edge} hot={hot} opacity={hot ? 1 : 0} />
          </g>
        );
      })}
    </svg>
  );
};

const EdgeLabel = ({ edge, hot, opacity }: { edge: Edge; hot: boolean; opacity: number }) => {
  // The label sits in the gutter beside the line. Skip it when that point
  // would land on a card (the short dispatch gap is the tight one).
  if (Object.values(nodes).some((rect) => strictlyInside(rect, edge.labelAt, 0))) return null;
  return (
    <text
      x={edge.labelAt.x}
      y={edge.labelAt.y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={hot ? theme.accent : theme.muted}
      fontSize={14}
      fontWeight={700}
      opacity={opacity}
      fontFamily={inter.fontFamily}
    >
      {edge.label}
    </text>
  );
};

const Packet = ({ frame }: { frame: number }) => {
  const leg = packetLegs.find((item) => frame >= item.start && frame < item.end);
  if (!leg) return null;
  const t = smoothstep((frame - leg.start) / (leg.end - leg.start));
  const point = pointAlong(edgeById[leg.edge].points, t);
  return (
    <div
      style={{
        position: "absolute",
        left: point.x,
        top: point.y,
        transform: "translate(-50%, -50%)",
        background: theme.accent,
        color: theme.accentInk,
        fontWeight: 700,
        fontSize: 15,
        lineHeight: 1,
        padding: "8px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        boxShadow: "0 8px 20px rgba(103, 220, 165, 0.28)",
      }}
    >
      {leg.label}
    </div>
  );
};

const ContinueStrip = ({ frame, fps }: { frame: number; fps: number }) => {
  const enter = appear(frame, fps, 760);
  if (enter === 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: continueStrip.x,
        top: continueStrip.y,
        width: continueStrip.w,
        height: continueStrip.h,
        boxSizing: "border-box",
        borderRadius: 16,
        border: `1.5px solid ${theme.accent}`,
        background: theme.accentSoft,
        padding: "14px 20px",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 10}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 18 }}>
        scan.pdf → document.md
      </div>
      <div style={{ marginTop: 4, color: theme.body, fontSize: 16 }}>
        Continue with translation, a mind map or chat. Copy the folder and the job comes with you.
      </div>
    </div>
  );
};
