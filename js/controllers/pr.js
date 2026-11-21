/** Ideal PR: C(s)=Kp+Kr*s/(s²+ω0²), represented by resonant states. */
export function createPrController(config) {
  let position = 0, velocity = 0, omegaSquared;
  function update(next) {
    Object.assign(config, next);
    if (!(config.resonantFrequency > 0)) throw new Error("The PR resonant frequency must be greater than zero.");
    omegaSquared = (2*Math.PI*config.resonantFrequency)**2;
  }
  update(config);
  return {
    update,
    calculate(error, dt) {
      // RK4 integration of x1'=x2, x2'=e-ω0²x1 for the resonant transfer term.
      const acceleration = (x) => error -omegaSquared*x;
      const k1x = velocity, k1v = acceleration(position);
      const k2x = velocity + dt * k1v / 2, k2v = acceleration(position + dt * k1x / 2);
      const k3x = velocity + dt * k2v / 2, k3v = acceleration(position + dt * k2x / 2);
      const k4x = velocity + dt * k3v, k4v = acceleration(position + dt * k3x);
      position += dt * (k1x + 2*k2x + 2*k3x + k4x) / 6;
      velocity += dt * (k1v + 2*k2v + 2*k3v + k4v) / 6;
      return config.kp * error + config.kr * velocity;
    },
  };
}
