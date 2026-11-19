import { createPlant } from "./plants.js";
import { createReference } from "./references.js";
import { createDisturbance } from "./disturbances.js";
import { createPidController } from "../controllers/pid.js";
import { createPrController } from "../controllers/pr.js";

const CONTROLLER_FACTORIES = { PID: createPidController, PR: createPrController };
const addScaled = (base, increment, scale) => Object.fromEntries(Object.keys(base).map((key) => [key, base[key] + increment[key] * scale]));
function validate(config) {
  if (!(config.duration > 0) || !(config.stepSize > 0)) throw new Error("Duration and time step must be greater than zero.");
  if (Math.ceil(config.duration / config.stepSize) > 250_000) throw new Error("Choose a shorter duration or a larger integration step.");
  createPlant(config.plant);
  if (!CONTROLLER_FACTORIES[config.controller.type]) throw new Error(`Unsupported controller: ${config.controller.type}`);
  createReference(config.reference ?? { type: "step", amplitude: config.setpoint ?? 1 });
  createDisturbance(config.disturbance);
}

/** Stateful live simulation using fixed-step classical RK4 for plant-state integration. */
export function createSimulationSession(initialConfig) {
  let config = { ...initialConfig };
  let plant, controller, controllerType, referenceAt, disturbanceAt, state, elapsed = 0;
  let capacity, head = 0, size = 0, time, reference, output, errorSignal, control;
  let realTimeRemainder = 0;
  function allocateBuffer(windowDuration, previous) {
    capacity = Math.max(2, Math.ceil(windowDuration / config.stepSize) + 1);
    time = new Float64Array(capacity); reference = new Float64Array(capacity);
    output = new Float64Array(capacity); errorSignal = new Float64Array(capacity); control = new Float64Array(capacity);
    head = 0; size = 0;
    if (previous) {
      const start = Math.max(0, previous.time.length - capacity);
      for (let i = start; i < previous.time.length; i += 1) append(previous.time[i], previous.reference[i], previous.output[i], previous.control[i]);
    }
  }
  function append(t, r, y, u) {
    const index = (head + size) % capacity;
    time[index] = t; reference[index] = r; output[index] = y; errorSignal[index] = r - y; control[index] = u;
    if (size < capacity) size += 1; else head = (head + 1) % capacity;
  }
  function configure(nextConfig) {
    validate(nextConfig);
    config = { ...nextConfig };
    plant = createPlant(config.plant); state = plant.initialState(); elapsed = 0; realTimeRemainder = 0;
    controller = CONTROLLER_FACTORIES[config.controller.type](config.controller); controllerType = config.controller.type;
    referenceAt = createReference(config.reference ?? { type: "step", amplitude: config.setpoint ?? 1 });
    disturbanceAt = createDisturbance(config.disturbance);
    allocateBuffer(config.duration, null);
    append(0, referenceAt(0), plant.output(state), 0);
  }
  configure(config);
  function advanceOneStep() {
    const dt = config.stepSize, t = elapsed;
    const y = plant.output(state), r = referenceAt(t);
    const u = controller.calculate(r - y, dt);
    // Hold controller output for this sample; evaluate a time-varying disturbance
    // at each RK4 stage so sinusoidal disturbances retain fourth-order accuracy.
    const derivative = (sampleState, sampleTime) => plant.derivative(sampleState, u + disturbanceAt(sampleTime));
    const k1 = derivative(state, t);
    const k2 = derivative(addScaled(state, k1, dt / 2), t + dt / 2);
    const k3 = derivative(addScaled(state, k2, dt / 2), t + dt / 2);
    const k4 = derivative(addScaled(state, k3, dt), t + dt);
    state = Object.fromEntries(Object.keys(state).map((key) => [key, state[key] + dt / 6 * (k1[key] + 2*k2[key] + 2*k3[key] + k4[key])]));
    elapsed = Math.round((elapsed + dt) * 1e12) / 1e12;
    append(elapsed, referenceAt(elapsed), plant.output(state), u);
  }
  function snapshot() {
    const result = { time: new Float64Array(size), reference: new Float64Array(size), output: new Float64Array(size), error: new Float64Array(size), control: new Float64Array(size) };
    for (let i = 0; i < size; i += 1) {
      const index = (head + i) % capacity;
      result.time[i] = time[index]; result.reference[i] = reference[index]; result.output[i] = output[index]; result.error[i] = errorSignal[index]; result.control[i] = control[index];
    }
    return result;
  }
  return {
    step(count = 1) { for (let i = 0; i < count; i += 1) advanceOneStep(); return snapshot(); },
    advance(realSeconds) {
      realTimeRemainder += Math.min(Math.max(realSeconds, 0), 1);
      const count = Math.floor((realTimeRemainder + 1e-12) / config.stepSize);
      if (count > 0) realTimeRemainder -= count * config.stepSize;
      return this.step(count);
    },
    snapshot,
    updateController(nextController) {
      const next = { ...config, controller: { ...nextController } }; validate(next);
      if (controllerType === nextController.type && controller.update) controller.update(nextController);
      else { controller = CONTROLLER_FACTORIES[nextController.type](nextController); controllerType = nextController.type; }
      config = next;
    },
    updateReference(nextReference) {
      const next = { ...config, reference: { ...nextReference } }; validate(next);
      referenceAt = createReference(next.reference); config = next;
    },
    updateDisturbance(nextDisturbance) {
      const next = { ...config, disturbance: { ...nextDisturbance } }; validate(next);
      disturbanceAt = createDisturbance(next.disturbance); config = next;
    },
    updateStepSize(stepSize) {
      const next = { ...config, stepSize }; validate(next);
      config = next; realTimeRemainder = 0; allocateBuffer(config.duration, null);
      append(elapsed, referenceAt(elapsed), plant.output(state), 0);
    },
    updateWindow(duration) {
      const next = { ...config, duration }; validate(next);
      const previous = snapshot(); config = next; allocateBuffer(duration, previous);
    },
    reset(nextConfig = config) { configure(nextConfig); return snapshot(); },
    get elapsed() { return elapsed; },
    get stepSize() { return config.stepSize; },
  };
}

/** Batch simulation helper for numerical experiments and automated tests. */
export function simulate(config) {
  const normalized = { ...config, stepSize: config.stepSize ?? 0.01 };
  const session = createSimulationSession(normalized);
  return session.step(Math.ceil(normalized.duration / normalized.stepSize));
}

