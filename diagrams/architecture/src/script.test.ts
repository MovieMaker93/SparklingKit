import assert from "node:assert/strict";
import test from "node:test";
import {
  continueStrip,
  edgeById,
  edges,
  nodes,
  pointAlong,
  polylineLength,
  stage,
  strictlyInside,
  type NodeId,
} from "./geometry";
import {
  DURATION,
  activeEdge,
  activeNodes,
  beatOpacity,
  beats,
  diskRows,
  dominantBeat,
  edgeShownAt,
  eventsDraw,
  nodeEnterAt,
  packetLegs,
} from "./script";

const FADE = 12;

test("beats cover the timeline and crossfade", () => {
  assert.equal(beats[0].start, 0);
  assert.equal(beats[beats.length - 1].end, DURATION);
  assert.equal(beats[beats.length - 1].id, "artifact");
  for (let i = 1; i < beats.length; i++) {
    const overlap = beats[i - 1].end - beats[i].start;
    assert.equal(overlap, FADE);
    assert.ok(beats[i].start > beats[i - 1].start);
  }
});

test("one sentence is fully visible in the middle of each step", () => {
  const expected: Array<[number, string]> = [
    [60, "shape"],
    [189, "modules"],
    [324, "job"],
    [471, "queue"],
    [624, "provider"],
    [860, "artifact"],
  ];
  for (const [frame, id] of expected) {
    const beat = beats.find((item) => item.id === id);
    assert.ok(beat);
    assert.equal(dominantBeat(frame).id, id);
    assert.equal(beatOpacity(frame, beat), 1);
  }
});

test("a highlighted node is already on screen", () => {
  for (let frame = 0; frame < DURATION; frame += 3) {
    for (const id of activeNodes(frame)) {
      assert.ok(frame >= nodeEnterAt[id], `${id} highlighted at ${frame}`);
    }
  }
});

test("an edge appears only after both of its nodes", () => {
  const owners: Record<string, [NodeId, NodeId]> = {
    upload: ["ui", "api"],
    events: ["api", "ui"],
    create: ["api", "disk"],
    enqueue: ["api", "queue"],
    dispatch: ["queue", "worker"],
    call: ["worker", "models"],
    artifact: ["models", "disk"],
  };
  for (const edge of edges) {
    const [from, to] = owners[edge.id];
    const shown = edgeShownAt(edge.id);
    assert.ok(shown >= nodeEnterAt[from]);
    assert.ok(shown >= nodeEnterAt[to]);
  }
});

test("packet legs stay inside the timeline and on a real edge", () => {
  for (const leg of packetLegs) {
    assert.ok(leg.start < leg.end);
    assert.ok(leg.start >= 0 && leg.end <= DURATION);
    assert.ok(edgeById[leg.edge]);
    assert.ok(polylineLength(edgeById[leg.edge].points) > 40);
  }
  assert.ok(eventsDraw.start < eventsDraw.end);
  assert.equal(activeEdge(300), "upload");
  assert.equal(activeEdge(800), "artifact");
  assert.equal(activeEdge(880), "events");
});

test("routes stay in the stage and off the cards", () => {
  const cards = Object.values(nodes);
  for (const edge of edges) {
    const length = polylineLength(edge.points);
    const steps = Math.ceil(length / 4);
    for (let step = 0; step <= steps; step++) {
      const point = pointAlong(edge.points, step / steps);
      assert.ok(point.x >= 0 && point.x <= stage.w, `${edge.id} x ${point.x}`);
      assert.ok(point.y >= 0 && point.y <= stage.h, `${edge.id} y ${point.y}`);
      for (const card of cards) {
        assert.equal(strictlyInside(card, point), false, `${edge.id} crosses a card at ${point.x},${point.y}`);
      }
    }
  }
});

test("the closing strip sits under the worker and inside the stage", () => {
  const worker = nodes.worker;
  assert.ok(continueStrip.y >= worker.y + worker.h + 16);
  assert.ok(continueStrip.y + continueStrip.h <= stage.h);
  assert.ok(continueStrip.x + continueStrip.w <= stage.w);
});

test("disk rows arrive in the order the story tells them", () => {
  const job = beats.find((beat) => beat.id === "job");
  assert.ok(job);
  assert.ok(diskRows[0].hotAt >= job.start);
  for (let i = 1; i < diskRows.length; i++) {
    assert.ok(diskRows[i].hotAt >= diskRows[i - 1].hotAt);
  }
});

test("enqueue does not leave the browser card", () => {
  const ui = nodes.ui;
  const edge = edgeById.enqueue;
  const steps = Math.ceil(polylineLength(edge.points) / 4);
  for (let step = 0; step <= steps; step++) {
    const point = pointAlong(edge.points, step / steps);
    const underTheBrowser = point.x > ui.x + 8 && point.x < ui.x + ui.w - 8 && point.y > ui.y + ui.h + 4;
    assert.equal(underTheBrowser, false);
  }
  for (const edge of edges) {
    assert.equal(strictlyInside(nodes.ui, edge.labelAt), false, edge.id);
    assert.equal(strictlyInside(nodes.api, edge.labelAt), false, edge.id);
    assert.equal(strictlyInside(nodes.disk, edge.labelAt), false, edge.id);
    assert.equal(strictlyInside(nodes.models, edge.labelAt), false, edge.id);
    assert.equal(strictlyInside(nodes.queue, edge.labelAt), false, edge.id);
    assert.equal(strictlyInside(nodes.worker, edge.labelAt), false, edge.id);
  }
});
