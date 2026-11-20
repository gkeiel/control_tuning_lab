import { createSimulationSession } from "./simulation/simulator.js";
import { drawChart, chartColors } from "./visualization/charts.js";
const byId = (id) => document.getElementById(id);
const elements = {
  plantType: byId("plant-type"), outputCanvas: byId("output-chart"), controlCanvas: byId("control-chart"),
  runButton: byId("run-simulation"), message: byId("form-message"), clock: byId("simulation-clock"),
};
const tabs = { pid: byId("workspace-pid"), pr: byId("workspace-pr"), prep: byId("workspace-prep") };
const sessions = { pid: null, pr: null, prep: null };
let activeWorkspace = "pid";
function updatePlantFields() {
  const second = elements.plantType.value === "secondOrder";
  byId("time-constant-field").classList.toggle("hidden", second);
  byId("damping-field").classList.toggle("hidden", !second);
  byId("natural-frequency-field").classList.toggle("hidden", !second);
  byId("plant-equation").innerHTML = second
    ? 'G(s) = <span class="fraction"><span>Kωₙ²</span><span>s² + 2ζωₙs + ωₙ²</span></span>'
    : 'G(s) = <span class="fraction"><span>K</span><span>τs + 1</span></span>';
}
function updateDisturbanceFields() {
  const enabled = byId("disturbance-enabled").checked;
  byId("disturbance-fields").classList.toggle("hidden", !enabled);
  byId("disturbance-frequency-field").classList.toggle("hidden", !enabled || byId("disturbance-type").value !== "sine");
}
function readConfig(workspace = activeWorkspace) {
  const number = (id, label) => {
    const value = Number(byId(id).value);
    if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
    return value;
  };
  const plant = { type: elements.plantType.value, gain: number("plant-gain", "Plant gain") };
  if (plant.type === "firstOrder") plant.timeConstant = number("plant-tau", "Time constant");
  else { plant.dampingRatio = number("plant-zeta", "Damping ratio"); plant.naturalFrequency = number("plant-wn", "Natural frequency"); }
  const controller = workspace === "pid"
    ? { type: "PID", kp: number("controller-kp", "Proportional gain"), ki: number("controller-ki", "Integral gain"), kd: number("controller-kd", "Derivative gain") }
    : workspace === "pr" ? { type: "PR", kp: number("pr-kp", "Proportional gain"), kr: number("controller-kr", "Resonant gain"), resonantFrequency: number("controller-frequency", "Resonant frequency") }
      : { type: "PREP", kp: number("prep-kp", "Proportional gain"), kr: number("prep-kr", "Repetitive gain"), cutoffFrequency: number("prep-wc", "Cutoff frequency"), resonantFrequency: number("sine-frequency", "Sine frequency") };
  const reference = workspace === "pid"
    ? { type: "step", amplitude: number("sim-setpoint", "Step amplitude") }
    : { type: "sine", amplitude: number("sine-amplitude", "Sine amplitude"), frequency: number("sine-frequency", "Sine frequency"), offset: 0 };
  const disturbance = { enabled: byId("disturbance-enabled").checked, type: byId("disturbance-type").value, amplitude: number("disturbance-amplitude", "Disturbance amplitude"), startTime: number("disturbance-start", "Disturbance start time"), frequency: number("disturbance-frequency", "Disturbance frequency") };
  return { duration: number("sim-duration", "Chart window"), stepSize: number("integration-step", "Integration step"), plant, controller, reference, disturbance };
}
function render(result = sessions[activeWorkspace]?.snapshot()) {
  if (!result) return;
  drawChart(elements.outputCanvas, [
    { time: result.time, values: result.reference, color: chartColors.reference, width: 1.4 },
    { time: result.time, values: result.output, color: chartColors.output, width: 2 },
    { time: result.time, values: result.error, color: chartColors.error, width: 1.5 },
  ]);
  drawChart(elements.controlCanvas, [{ time: result.time, values: result.control, color: chartColors.control, width: 1.8 }]);
  const activeSession = sessions[activeWorkspace];
  elements.clock.textContent = `LIVE · ${activeSession.elapsed.toFixed(2)} s`;
  byId("simulation-step-status").textContent = `Δt = ${activeSession.stepSize} s`;
}
function ensureActiveSession(reset = false) {
  const config = readConfig();
  if (reset || !sessions[activeWorkspace]) sessions[activeWorkspace] = createSimulationSession(config);
  render();
}
function switchWorkspace(workspace) {
  activeWorkspace = workspace;
  tabs.pid.classList.toggle("active", workspace === "pid");
  tabs.pr.classList.toggle("active", workspace === "pr");
  tabs.prep.classList.toggle("active", workspace === "prep");
  for (const key of ["pid", "pr", "prep"]) tabs[key].setAttribute("aria-selected", String(workspace === key));
  tabs.pid.setAttribute("aria-selected", String(workspace === "pid"));
  tabs.pr.setAttribute("aria-selected", String(workspace === "pr"));
  byId("active-workspace-label").textContent = workspace === "pid" ? "PID · Step" : "PR · Sine";
  byId("controller-mode-label").textContent = workspace.toUpperCase();
  byId("pid-controller-fields").classList.toggle("hidden", workspace !== "pid");
  byId("pr-controller-fields").classList.toggle("hidden", workspace !== "pr");
  byId("prep-controller-fields").classList.toggle("hidden", workspace !== "prep");
  byId("prep-equation").classList.toggle("hidden", workspace !== "prep");
  byId("pid-reference-fields").classList.toggle("hidden", workspace !== "pid");
  byId("pr-reference-fields").classList.toggle("hidden", workspace === "pid");
  byId("pr-hint").classList.toggle("hidden", workspace !== "pr");
  byId("pr-hint").textContent = "Set the resonant frequency to match the sine reference frequency.";
  byId("prep-hint").classList.toggle("hidden", workspace !== "prep");
  elements.message.textContent = "";
  try { ensureActiveSession(); } catch (error) { elements.message.textContent = error.message; }
}
function restartPlantSessions() {
  try {
    const plantConfig = readConfig(activeWorkspace).plant;
    for (const key of ["pid", "pr", "prep"]) {
      if (sessions[key]) sessions[key].reset({ ...readConfig(key), plant: plantConfig });
    }
    ensureActiveSession(); elements.message.textContent = "";
  } catch (error) { elements.message.textContent = error.message; }
}
function updateActiveController() {
  try { sessions[activeWorkspace]?.updateController(readConfig().controller); render(); elements.message.textContent = ""; }
  catch (error) { elements.message.textContent = error.message; }
}
function updateActiveReference() {
  try { sessions[activeWorkspace]?.updateReference(readConfig().reference); render(); elements.message.textContent = ""; }
  catch (error) { elements.message.textContent = error.message; }
}
function updateDisturbance() {
  try {
    const disturbance = readConfig().disturbance;
    for (const session of Object.values(sessions)) session?.updateDisturbance(disturbance);
    render(); elements.message.textContent = "";
  } catch (error) { elements.message.textContent = error.message; }
}
function updateTimeSetting(kind) {
  try {
    const config = readConfig();
    for (const session of Object.values(sessions)) {
      if (!session) continue;
      if (kind === "window") session.updateWindow(config.duration);
      else session.updateStepSize(config.stepSize);
    }
    render(); elements.message.textContent = "";
  } catch (error) { elements.message.textContent = error.message; }
}
byId("disturbance-enabled").addEventListener("change", () => { updateDisturbanceFields(); updateDisturbance(); });
byId("disturbance-type").addEventListener("change", () => { updateDisturbanceFields(); updateDisturbance(); });
for (const id of ["disturbance-amplitude", "disturbance-start", "disturbance-frequency"]) byId(id).addEventListener("input", updateDisturbance);
tabs.pid.addEventListener("click", () => switchWorkspace("pid"));
tabs.pr.addEventListener("click", () => switchWorkspace("pr"));
tabs.prep.addEventListener("click", () => switchWorkspace("prep"));
elements.plantType.addEventListener("change", () => { updatePlantFields(); restartPlantSessions(); });
for (const id of ["plant-gain", "plant-tau", "plant-zeta", "plant-wn"]) byId(id).addEventListener("change", restartPlantSessions);
for (const id of ["controller-kp", "controller-ki", "controller-kd", "pr-kp", "controller-kr", "controller-frequency", "prep-kp", "prep-kr", "prep-wc"]) byId(id).addEventListener("input", updateActiveController);
for (const id of ["sim-setpoint", "sine-amplitude"]) byId(id).addEventListener("input", updateActiveReference);
byId("sine-frequency").addEventListener("input", () => { updateActiveReference(); updateActiveController(); });
byId("sim-duration").addEventListener("change", () => updateTimeSetting("window"));
byId("integration-step").addEventListener("change", () => updateTimeSetting("step"));
elements.runButton.addEventListener("click", () => {
  try { ensureActiveSession(true); elements.message.textContent = ""; }
  catch (error) { elements.message.textContent = error.message; }
});
window.addEventListener("resize", () => render());
updatePlantFields(); updateDisturbanceFields(); switchWorkspace("pid");
let lastTick = performance.now();
setInterval(() => {
  const now = performance.now(), seconds = (now - lastTick) / 1000; lastTick = now;
  const activeSession = sessions[activeWorkspace];
  if (!activeSession) return;
  try { activeSession.advance(seconds); render(); }
  catch (error) { elements.message.textContent = error.message; }
}, 50);



