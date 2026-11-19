/** Proportional-integral-derivative controller. */
export function createPidController(config) {
  let integral = 0, previousError = 0, initialized = false;
  return {
    update(next) { Object.assign(config, next); },
    calculate(error, dt) {
      integral += error * dt;
      const derivative = initialized ? (error - previousError) / dt : 0;
      previousError = error; initialized = true;
      return config.kp * error + config.ki * integral + config.kd * derivative;
    },
  };
}
