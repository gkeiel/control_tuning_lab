/** Filtered repetitive controller C(s)=Kp+Kr/(1-Q(s)e^(-tau*s)). */
export function createPrepController(config) {
  let { kp, kr, cutoffFrequency, resonantFrequency, delayTime } = config;
  if (!(resonantFrequency > 0)) throw new Error("The PREP reference frequency must be greater than zero.");
  if (!(cutoffFrequency > 0)) throw new Error("The PREP cutoff frequency must be greater than zero.");
  if (!(delayTime > 0)) throw new Error("The PREP delay must be greater than zero.");
  let dt = 0, periodSamples, memory, filtered = 0, index = 0, alpha;
  function configure(step) {
    dt = step; periodSamples = Math.max(1, Math.round(delayTime / dt));
    memory = new Float64Array(periodSamples + 1); filtered = 0; index = 0;
    alpha = Math.exp(-2 * Math.PI * cutoffFrequency * dt);
  }
  return {
    calculate(error, step) {
      if (step !== dt) configure(step);
      const delayed = memory[(index - periodSamples + memory.length) % memory.length];
      filtered = alpha * filtered + (1 - alpha) * delayed;
      const repetitive = error + filtered;
      memory[index] = repetitive; index = (index + 1) % memory.length;
      return kp * error + kr * repetitive;
    },
    update(next) {
      if (!(next.resonantFrequency > 0)) throw new Error("The PREP reference frequency must be greater than zero.");
      if (!(next.cutoffFrequency > 0)) throw new Error("The PREP cutoff frequency must be greater than zero.");
      if (!(next.delayTime > 0)) throw new Error("The PREP delay must be greater than zero.");
      const changed = next.resonantFrequency !== resonantFrequency || next.cutoffFrequency !== cutoffFrequency || next.delayTime !== delayTime;
      kp = next.kp; kr = next.kr; resonantFrequency = next.resonantFrequency; cutoffFrequency = next.cutoffFrequency; delayTime = next.delayTime;
      if (changed && dt > 0) configure(dt);
    },
  };
}
