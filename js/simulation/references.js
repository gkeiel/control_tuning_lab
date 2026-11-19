/** Create a step or sinusoidal reference function. Sine frequency is specified in Hz. */
export function createReference(config) {
  if (config.type === "step") return () => config.amplitude;
  if (config.type === "sine") {
    if (!(config.frequency > 0)) throw new Error("Sine frequency must be greater than zero.");
    const omega = 2 * Math.PI * config.frequency;
    return (time) => config.offset + config.amplitude * Math.sin(omega * time);
  }
  throw new Error(`Unsupported reference signal: ${config.type}`);
}
