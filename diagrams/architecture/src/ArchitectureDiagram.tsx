import { AbsoluteFill, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Nunito";
import {
  continueStrip,
  edges,
  nodes,
  smoothstep,
  stage,
  strictlyInside,
  toPath,
  type Edge,
  type NodeId,
  type Pt,
  type Rect,
} from "./geometry";
import {
  activeEdge,
  beatOpacity,
  beats,
  diskRows,
  dominantBeat,
  modules,
  type BeatId,
} from "./script";
import { theme } from "./theme";

const nunito = loadFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

const origin = { x: 110, y: 188 };

const fill: Record<NodeId, string> = {
  ui: theme.request,
  api: theme.app,
  disk: theme.paper,
  queue: theme.app,
  worker: theme.app,
  models: theme.model,
};

const stepOf: Record<BeatId, { n: string; rect: Rect }> = {
  shape: { n: "1", rect: nodes.ui },
  check: { n: "2", rect: nodes.api },
  job: { n: "3", rect: nodes.disk },
  queue: { n: "4", rect: nodes.queue },
  executor: { n: "5", rect: nodes.worker },
  provider: { n: "6", rect: nodes.models },
  artifact: { n: "7", rect: continueStrip },
};

const badgeOf = (beat: BeatId): Pt => {
  const rect = stepOf[beat].rect;
  return { x: rect.x - 2, y: rect.y - 2 };
};

export const ArchitectureDiagram = () => {
  const frame = useCurrentFrame();
  const beat = dominantBeat(frame);
  const hotEdge = activeEdge(frame);
  const ring = ringAt(frame);

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: nunito.fontFamily, color: theme.ink }}>
      <AbsoluteFill
        style={{
          margin: 28,
          borderRadius: 28,
          border: "1.5px solid #c5ddd0",
        }}
      />
      <Header frame={frame} />
      <div
        style={{
          position: "absolute",
          left: origin.x,
          top: origin.y,
          width: stage.w,
          height: stage.h,
        }}
      >
        <Arrows hotEdge={hotEdge} />
        {(Object.keys(nodes) as NodeId[]).map((id) => (
          <Card key={id} id={id} beat={beat.id} />
        ))}
        <Lineage beat={beat.id} />
        {beats.map((item) => (
          <Badge key={item.id} n={stepOf[item.id].n} at={badgeOf(item.id)} />
        ))}
        <Ring at={ring} frame={frame} />
      </div>
    </AbsoluteFill>
  );
};

const ringAt = (frame: number): Pt => {
  const beat = dominantBeat(frame);
  const index = beats.findIndex((item) => item.id === beat.id);
  const to = badgeOf(beat.id);
  if (index <= 0) return to;
  const from = badgeOf(beats[index - 1].id);
  const t = smoothstep((frame - beat.start) / 14);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
};

const Header = ({ frame }: { frame: number }) => {
  return (
    <div style={{ position: "absolute", left: 72, right: 72, top: 48 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 10, height: 46, borderRadius: 8, background: theme.ring }} />
          <h1 style={{ margin: 0, fontSize: 48, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>
            How a <Word tone={theme.titleFile}>file</Word> becomes the <Word tone={theme.titleNext}>next one</Word>
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>SparklingKit</div>
          <Legend />
        </div>
      </div>
      <div style={{ position: "relative", height: 64, marginTop: 14, marginLeft: 26 }}>
        {beats.map((beat) => (
          <p
            key={beat.id}
            style={{
              position: "absolute",
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: theme.muted,
              opacity: beatOpacity(frame, beat),
            }}
          >
            {beat.body}
          </p>
        ))}
      </div>
    </div>
  );
};

const Word = ({ children, tone }: { children: string; tone: string }) => {
  return (
    <span
      style={{
        background: tone,
        borderRadius: 12,
        padding: "0 10px 2px",
      }}
    >
      {children}
    </span>
  );
};

const Legend = () => {
  const items = [
    { color: theme.request, label: "request" },
    { color: theme.app, label: "the app" },
    { color: theme.model, label: "the model" },
    { color: theme.artifact, label: "the artifact" },
  ];
  return (
    <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "flex-end" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, color: theme.muted, fontSize: 14, fontWeight: 700 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: item.color, border: "1px solid rgba(0,0,0,0.06)" }} />
          {item.label}
        </div>
      ))}
    </div>
  );
};

const Card = ({ id, beat }: { id: NodeId; beat: BeatId }) => {
  const rect = nodes[id];
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: "border-box",
        padding: "26px 16px 12px 22px",
        borderRadius: 18,
        background: fill[id],
      }}
    >
      {id === "ui" ? <UploadCard /> : null}
      {id === "api" ? <ApiCard /> : null}
      {id === "disk" ? <DiskCard /> : null}
      {id === "queue" ? <PlainCard kicker="Coordination" title="Redis · BullMQ" detail="Holds the run id" /> : null}
      {id === "worker" ? <PlainCard kicker="Same process" title="Worker" detail="Module executor" /> : null}
      {id === "models" ? <ModulesCard beat={beat} /> : null}
    </div>
  );
};

const Kicker = ({ children }: { children: string }) => {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.4, color: theme.muted, textTransform: "uppercase" }}>
      {children}
    </div>
  );
};

const UploadCard = () => {
  return (
    <>
      <Kicker>Browser</Kicker>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 800 }}>React UI</div>
      <div style={{ marginTop: 12, background: theme.paper, borderRadius: 12, padding: "10px 12px", fontSize: 16, fontWeight: 700 }}>
        scan.pdf
        <div style={{ fontWeight: 600, color: theme.muted, marginTop: 2 }}>Workbench and chat</div>
      </div>
    </>
  );
};

const ApiCard = () => {
  return (
    <>
      <Kicker>One Node process</Kicker>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 800 }}>Express API</div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Chip>validate</Chip>
        <Chip>open job</Chip>
      </div>
    </>
  );
};

const Chip = ({ children, hot = false }: { children: string; hot?: boolean }) => {
  return (
    <span
      style={{
        background: hot ? theme.model : theme.paper,
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 15,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
};

const DiskCard = () => {
  return (
    <>
      <Kicker>Durable record</Kicker>
      <div style={{ marginTop: 2, fontSize: 26, fontWeight: 800 }}>data/jobs/&lt;id&gt;</div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {diskRows.map((row) => (
          <div key={row.name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 16, fontWeight: 700 }}>
            <span>{row.name}</span>
            <span style={{ color: theme.muted, fontWeight: 700 }}>{row.note}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const PlainCard = ({ kicker, title, detail }: { kicker: string; title: string; detail: string }) => {
  return (
    <>
      <Kicker>{kicker}</Kicker>
      <div style={{ marginTop: 4, fontSize: 26, fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 700, color: theme.muted }}>{detail}</div>
    </>
  );
};

const ModulesCard = ({ beat }: { beat: BeatId }) => {
  return (
    <>
      <Kicker>Outside the app</Kicker>
      <div style={{ marginTop: 2, fontSize: 26, fontWeight: 800 }}>Seven modules</div>
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {modules.map((name) => {
          const hot = name === "OCR" && (beat === "provider" || beat === "artifact");
          return (
            <div
              key={name}
              style={{
                background: theme.paper,
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 15,
                fontWeight: 800,
                display: "flex",
                justifyContent: "space-between",
                gridColumn: name === "Chat" ? "1 / -1" : undefined,
                outline: hot ? `2px solid ${theme.ring}` : "none",
              }}
            >
              <span>{name}</span>
              {hot ? <span style={{ color: theme.ring }}>{beat === "provider" ? "this scan" : "done"}</span> : null}
            </div>
          );
        })}
      </div>
    </>
  );
};

const Lineage = ({ beat }: { beat: BeatId }) => {
  const on = beat === "artifact";
  return (
    <div
      style={{
        position: "absolute",
        left: continueStrip.x,
        top: continueStrip.y,
        width: continueStrip.w,
        height: continueStrip.h,
        boxSizing: "border-box",
        borderRadius: 18,
        background: theme.artifact,
        padding: "16px 22px 14px 36px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        outline: on ? `2px solid ${theme.ring}` : "none",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800 }}>scan.pdf → document.md</div>
      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 700, color: theme.muted }}>
        Continue with translation, a mind map or chat. Copy the folder and the job comes with you.
      </div>
    </div>
  );
};

const Badge = ({ n, at }: { n: string; at: Pt }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: at.x - 17,
        top: at.y - 17,
        width: 34,
        height: 34,
        borderRadius: 99,
        background: theme.ink,
        color: "#fff",
        fontWeight: 800,
        fontSize: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n}
    </div>
  );
};

const Ring = ({ at, frame }: { at: Pt; frame: number }) => {
  const pulse = 1 + Math.sin(frame / 5) * 0.04;
  return (
    <div
      style={{
        position: "absolute",
        left: at.x - 24,
        top: at.y - 24,
        width: 48,
        height: 48,
        borderRadius: 99,
        border: `4px solid ${theme.ring}`,
        transform: `scale(${pulse})`,
      }}
    />
  );
};

const Arrows = ({ hotEdge }: { hotEdge: ReturnType<typeof activeEdge> }) => {
  return (
    <svg width={stage.w} height={stage.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <marker id="head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill={theme.line} />
        </marker>
        <marker id="head-hot" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill={theme.ring} />
        </marker>
      </defs>
      {edges.map((edge) => {
        const hot = edge.id === hotEdge;
        return (
          <g key={edge.id}>
            <path
              d={toPath(edge.points)}
              fill="none"
              stroke={hot ? theme.ring : theme.line}
              strokeWidth={hot ? 2.5 : 1.75}
              strokeDasharray={edge.dashed ? "7 6" : undefined}
              markerEnd={hot ? "url(#head-hot)" : "url(#head)"}
            />
            {hot ? <EdgeLabel edge={edge} hot={hot} /> : null}
          </g>
        );
      })}
    </svg>
  );
};

const EdgeLabel = ({ edge, hot }: { edge: Edge; hot: boolean }) => {
  if (Object.values(nodes).some((rect) => strictlyInside(rect, edge.labelAt, 0))) return null;
  return (
    <text
      x={edge.labelAt.x}
      y={edge.labelAt.y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={hot ? theme.ring : theme.muted}
      fontSize={15}
      fontWeight={800}
      fontFamily={nunito.fontFamily}
    >
      {edge.label}
    </text>
  );
};
