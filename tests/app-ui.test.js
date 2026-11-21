import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const pageIds = new Set([...readFileSync(new URL("../index.html", import.meta.url), "utf8").matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id));
class FakeElement {
  constructor(id, value = "") {
    this.id = id; this.value = value; this.textContent = ""; this.innerHTML = ""; this.listeners = {}; this.attributes = {};
    this.classes = new Set(id.includes("field") || id.endsWith("-fields") ? ["hidden"] : []);
    this.classList = { toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name), add: (name) => this.classes.add(name), contains: (name) => this.classes.has(name) };
    this.drawCalls = 0;
  }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  dispatch(type) { this.listeners[type]?.({ target: this }); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getBoundingClientRect() { return { width: 480, height: 240 }; }
  getContext() { return new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => { if (key === "stroke") this.drawCalls += 1; } }); }
}

test("PID, PR, and PREP workspaces fit the shared live simulation interface", async () => {
  const values = {
    "plant-type": "firstOrder", "plant-gain": "1", "plant-tau": "1", "plant-zeta": "0.7", "plant-wn": "2",
    "controller-kp": "2", "controller-ki": "0.5", "controller-kd": "0.2", "pr-kp": "2", "controller-kr": "1", "controller-frequency": "1",
    "prep-kp": "2", "prep-kr": "1", "prep-wc": "20", "prep-tau": "0.02",
    "sim-duration": "1", "integration-step": "0.01", "sim-setpoint": "1", "sine-amplitude": "1", "sine-frequency": "1",
  };
  const elements = new Map();
  globalThis.document = { getElementById: (id) => { if (!pageIds.has(id)) throw new Error("Missing #" + id + " in index.html"); if (!elements.has(id)) elements.set(id, new FakeElement(id, values[id] ?? "")); return elements.get(id); } };
  globalThis.window = { devicePixelRatio: 1, addEventListener() {} };
  let fakeNow = 0;
  globalThis.performance.now = () => fakeNow;
  globalThis.setInterval = (callback) => { globalThis.controlLabTick = () => { fakeNow += 50; callback(); }; return 1; };
  await import("../js/app.js");
  const el = (id) => elements.get(id);
  assert.equal(el("pid-controller-fields").classList.contains("hidden"), false);
  assert.equal(el("simulation-engine-status").textContent, "RUNNING");
  assert.equal(el("pr-controller-fields").classList.contains("hidden"), true);
  assert.equal(el("pid-reference-fields").classList.contains("hidden"), false);
  assert.equal(el("pid-equation").classList.contains("hidden"), false);
  assert.equal(el("pr-equation").classList.contains("hidden"), true);
  assert.ok(el("output-chart").drawCalls > 0);
  assert.ok(el("control-chart").drawCalls > 0);
  globalThis.controlLabTick();
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.05 s");

  el("plant-type").value = "secondOrder"; el("plant-type").dispatch("change");
  assert.match(el("plant-equation").innerHTML, /s² \+ 2ζωₙs \+ ωₙ²/);
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.00 s");
  el("workspace-pr").dispatch("click");
  assert.equal(el("workspace-pr").attributes["aria-selected"], "true");
  assert.equal(el("pr-controller-fields").classList.contains("hidden"), false);
  assert.equal(el("pr-reference-fields").classList.contains("hidden"), false);
  assert.match(el("pr-hint").textContent, /match the sine reference frequency/i);
  assert.equal(el("pr-equation").classList.contains("hidden"), false);
  globalThis.controlLabTick();
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.05 s");

  el("controller-frequency").value = "0"; el("controller-frequency").dispatch("input");
  assert.match(el("form-message").textContent, /frequency/i);
  el("controller-frequency").value = "1"; el("controller-frequency").dispatch("input");
  assert.equal(el("form-message").textContent, "");
  el("workspace-prep").dispatch("click");
  assert.equal(el("prep-controller-fields").classList.contains("hidden"), false);
  assert.equal(el("pid-equation").classList.contains("hidden"), true);
  assert.equal(el("pr-equation").classList.contains("hidden"), true);
  assert.equal(el("prep-equation").classList.contains("hidden"), false);
  el("prep-tau").value = "0"; el("prep-tau").dispatch("input");
  assert.match(el("form-message").textContent, /PREP delay/i);
  el("prep-tau").value = "0.04"; el("prep-tau").dispatch("input");
  assert.equal(el("form-message").textContent, "");
  globalThis.controlLabTick();
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.05 s");
  el("integration-step").value = "0.005"; el("integration-step").dispatch("change");
  assert.equal(el("simulation-step-status").textContent, "Δt = 0.005 s");
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.05 s");
  el("workspace-pid").dispatch("click");
  assert.equal(el("pid-controller-fields").classList.contains("hidden"), false);
  assert.equal(el("simulation-engine-status").textContent, "RUNNING");
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.00 s");
  el("run-simulation").dispatch("click");
  assert.equal(el("simulation-clock").textContent, "LIVE · 0.00 s");
});


