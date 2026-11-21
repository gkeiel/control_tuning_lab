import test from "node:test";
import assert from "node:assert/strict";
import { createPlant } from "../js/simulation/plants.js";
import { createReference } from "../js/simulation/references.js";
import { createDisturbance } from "../js/simulation/disturbances.js";
import { createPidController } from "../js/controllers/pid.js";
import { createPrController } from "../js/controllers/pr.js";
import { createPrepController } from "../js/controllers/prep.js";
import { simulate, createSimulationSession } from "../js/simulation/simulator.js";
const closeTo = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) <= e, `${a} differs from ${b}`);
test("first- and second-order plant derivatives and invalid parameters", () => {
  assert.deepEqual(createPlant({ type: "firstOrder", gain: 2, timeConstant: 4 }).derivative({ output: 0 }, 1), { output: 0.5 });
  assert.deepEqual(createPlant({ type: "secondOrder", gain: 2, dampingRatio: 0.5, naturalFrequency: 3 }).derivative({ output: 0, velocity: 0 }, 1), { output: 0, velocity: 18 });
  assert.throws(() => createPlant({ type: "firstOrder", timeConstant: 0 }), /time constant/);
  assert.throws(() => createPlant({ type: "secondOrder", naturalFrequency: 0 }), /natural frequency/);
});
test("step and sine reference waveforms", () => {
  assert.equal(createReference({ type: "step", amplitude: 2 })(9), 2);
  const sine = createReference({ type: "sine", amplitude: 2, frequency: 0.5, offset: 1 });
  closeTo(sine(0), 1); closeTo(sine(0.5), 3); closeTo(sine(1), 1);
  assert.throws(() => createReference({ type: "sine", frequency: 0 }), /frequency/);
});
test("PID supports P, PI, and PD terms by setting unused gains to zero", () => {
  const proportional = createPidController({ kp: 3, ki: 0, kd: 0 });
  assert.equal(proportional.calculate(2, 0.5), 6);
  const pi = createPidController({ kp: 2, ki: 4, kd: 0 });
  assert.equal(pi.calculate(1, 0.5), 4); assert.equal(pi.calculate(1, 0.5), 6);
  const pd = createPidController({ kp: 2, ki: 0, kd: 3 });
  assert.equal(pd.calculate(1, 0.5), 2); assert.equal(pd.calculate(2, 0.5), 10);
  const pid = createPidController({ kp: 2, ki: 4, kd: 3 });
  assert.equal(pid.calculate(1, 0.5), 4); assert.equal(pid.calculate(2, 0.5), 16);
});
test("PR controller response and resonant-frequency validation", () => {
  const pr = createPrController({ kp: 2, kr: 1, resonantFrequency: 1 }); closeTo(pr.calculate(3, 0.001), 6.003, 1e-5);
  assert.throws(() => createPrController({ kp: 1, kr: 1, resonantFrequency: 0 }), /frequency/);
});
test("PREP delay is independent, configurable, and validated", () => {
  const config = { kp: 0, kr: 1, cutoffFrequency: 1000, resonantFrequency: 1, delayTime: 0.02 };
  const shortDelay = createPrepController(config);
  const longDelay = createPrepController({ ...config, delayTime: 0.04 });
  const shortOutput = Array.from({ length: 3 }, () => shortDelay.calculate(1, 0.01));
  const longOutput = Array.from({ length: 5 }, () => longDelay.calculate(1, 0.01));
  assert.equal(shortOutput[0], 1);
  assert.equal(shortOutput[1], 1);
  assert.ok(shortOutput[2] > 1);
  assert.ok(longOutput.slice(0, 4).every((value) => value === 1));
  assert.ok(longOutput[4] > 1);
  shortDelay.update({ ...config, delayTime: 0.04 });
  assert.equal(shortDelay.calculate(1, 0.01), 1);
  assert.throws(() => shortDelay.update({ ...config, delayTime: 0 }), /PREP delay/);
  assert.throws(() => createPrepController({ ...config, delayTime: 0 }), /PREP delay/);
});
test("disturbance source supports disabled, step, and sinusoidal input", () => {
  assert.equal(createDisturbance({ enabled: false, type: "sine", frequency: 0 })(1), 0);
  const step = createDisturbance({ enabled: true, type: "step", amplitude: 2, startTime: 0.5 });
  assert.equal(step(0.49), 0); assert.equal(step(0.5), 2);
  const sine = createDisturbance({ enabled: true, type: "sine", amplitude: 2, frequency: 0.5, startTime: 1 });
  assert.equal(sine(0.9), 0); closeTo(sine(1.5), 2);
  assert.throws(() => createDisturbance({ enabled: true, type: "sine", amplitude: 1, frequency: 0 }), /frequency/);
});
test("RK4 integrates a first-order response to a step disturbance accurately", () => {
  const result = simulate({ duration: 1, stepSize: 0.1, plant: { type: "firstOrder", gain: 1, timeConstant: 1 }, controller: { type: "PID", kp: 0, ki: 0, kd: 0 }, reference: { type: "step", amplitude: 0 }, disturbance: { enabled: true, type: "step", amplitude: 1, startTime: 0 } });
  closeTo(result.output.at(-1), 1 - Math.exp(-1), 1e-6);
});
test("RK4 evaluates a sine disturbance at intermediate integration stages", () => {
  const omega = 2 * Math.PI;
  const result = simulate({ duration: 1, stepSize: 0.01, plant: { type: "firstOrder", gain: 1, timeConstant: 1 }, controller: { type: "PID", kp: 0, ki: 0, kd: 0 }, reference: { type: "step", amplitude: 0 }, disturbance: { enabled: true, type: "sine", amplitude: 1, frequency: 1, startTime: 0 } });
  const expected = (Math.sin(omega) - omega * Math.cos(omega) + omega * Math.exp(-1)) / (1 + omega ** 2);
  closeTo(result.output.at(-1), expected, 1e-7);
});
test("simulator covers both plants and both active controllers", () => {
  for (const plant of [{ type: "firstOrder", gain: 1, timeConstant: 0.5 }, { type: "secondOrder", gain: 1, dampingRatio: 0.7, naturalFrequency: 3 }]) {
    for (const type of ["PID", "PR"]) {
      const result = simulate({ duration: 1, stepSize: 0.01, plant, controller: { type, kp: 2, ki: 0.5, kd: 0.1, kr: 1, resonantFrequency: 1 }, reference: { type: "step", amplitude: 1 }, disturbance: { enabled: true, type: "step", amplitude: 0.2, startTime: 0.5 } });
      assert.equal(result.time.length, 101); assert.equal(result.reference[0], 1);
      assert.ok(Number.isFinite(result.output.at(-1))); assert.ok(Number.isFinite(result.control.at(-1)));
    }
  }
});
test("invalid simulation configurations fail clearly", () => {
  assert.throws(() => simulate({ duration: 0, plant: {}, controller: {} }), /Duration/);
  assert.throws(() => simulate({ duration: 1, plant: { type: "firstOrder", gain: 1, timeConstant: 1 }, controller: { type: "bad" } }), /Unsupported controller/);
  assert.throws(() => simulate({ duration: 1, plant: { type: "firstOrder", gain: 1, timeConstant: 1 }, controller: { type: "PID" }, reference: { type: "bad" } }), /Unsupported reference/);
  assert.throws(() => simulate({ duration: 1, plant: { type: "firstOrder", gain: 1, timeConstant: 1 }, controller: { type: "PID" }, disturbance: { enabled: true, type: "bad", amplitude: 1, startTime: 0 } }), /Unsupported disturbance/);
});
test("live session updates disturbance and integration step without resetting plant state", () => {
  const config = { duration: 0.2, stepSize: 0.01, plant: { type: "firstOrder", gain: 1, timeConstant: 0.5 }, controller: { type: "PID", kp: 2, ki: 0, kd: 0 }, reference: { type: "step", amplitude: 1 }, disturbance: { enabled: false, type: "step", amplitude: 1, startTime: 0 } };
  const session = createSimulationSession(config); session.step(8);
  const before = session.snapshot();
  session.updateController({ type: "PID", kp: 3, ki: 0, kd: 0 });
  session.updateReference({ type: "sine", amplitude: 1, frequency: 1, offset: 0 });
  session.updateDisturbance({ enabled: true, type: "step", amplitude: 0.2, startTime: 0.1 });
  assert.equal(session.elapsed, 0.08); assert.equal(session.snapshot().output.at(-1), before.output.at(-1));
  session.step(2); assert.equal(session.elapsed, 0.1);
  session.updateStepSize(0.005); session.step(2); assert.equal(session.elapsed, 0.11);
  assert.equal(session.snapshot().error.at(-1), session.snapshot().reference.at(-1) - session.snapshot().output.at(-1));
});

