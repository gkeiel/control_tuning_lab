/** Create an input disturbance function added between the controller and plant. */
export function createDisturbance(config = { enabled: false }) {
  if (!config.enabled) return () => 0;
  const startTime = config.startTime ?? 0;
  if (!Number.isFinite(config.amplitude) || !Number.isFinite(startTime) || startTime < 0) throw new Error("Disturbance amplitude and nonnegative start time must be finite.");
  if (config.type === "step") return (time) => time >= startTime ? config.amplitude : 0;
  if (config.type === "sine") {
    if (!(config.frequency > 0)) throw new Error("Disturbance frequency must be greater than zero.");
    const omega = 2 * Math.PI * config.frequency;
    return (time) => time < startTime ? 0 : config.amplitude * Math.sin(omega * (time - startTime));
  }
  throw new Error(`Unsupported disturbance: ${config.type}`);
}

