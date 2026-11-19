/** Plant factory. Add models here behind the shared state/output/derivative interface. */
export function createPlant(config) {
  if (config.type === "firstOrder") {
    const { gain, timeConstant } = config;
    if (!(timeConstant > 0)) throw new Error("The plant time constant must be greater than zero.");
    return {
      initialState: () => ({ output: 0 }),
      output: (state) => state.output,
      derivative: (state, input) => ({ output: (gain * input - state.output) / timeConstant }),
    };
  }
  if (config.type === "secondOrder") {
    const { gain, dampingRatio, naturalFrequency } = config;
    if (!(naturalFrequency > 0)) throw new Error("The natural frequency must be greater than zero.");
    return {
      initialState: () => ({ output: 0, velocity: 0 }),
      output: (state) => state.output,
      derivative: (state, input) => ({
        output: state.velocity,
        // Standard second-order form: y'' + 2ζωₙy' + ωₙ²y = Kωₙ²u.
        velocity: gain * naturalFrequency ** 2 * input - 2 * dampingRatio * naturalFrequency * state.velocity - naturalFrequency ** 2 * state.output,
      }),
    };
  }
  throw new Error(`Unsupported plant model: ${config.type}`);
}
