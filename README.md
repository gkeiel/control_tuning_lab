# Control Tuning Lab

Control Tuning Lab is a browser-based control systems simulator built with plain HTML, CSS, and JavaScript modules.


## Features

- First-order and second-order plant models with visible transfer functions.
- Two focused workspaces: PID with a step reference, and PR with a sinusoidal reference.
- The PID workspace exposes all three gains; set unused gains to zero for P, PI, or PD behavior.
- Optional additive disturbance at the plant input, selectable as a step or sine wave, with amplitude and start time (and frequency for sine) controls.
- Live charts for reference, output, and tracking error, with a separate controller signal chart.
- Continuous real-time simulation with configurable chart window and integration step.
- Plant parameter edits restart the sessions; controller, reference, and disturbance edits apply while preserving the plant state.


## Project structure

```text
controller_tuning_lab/
├── index.html
├── README.md
├── LICENSE
├── package.json
├── start_control_lab.bat
├── assets/
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── simulation/
│   │   ├── simulator.js
│   │   ├── plants.js
│   │   ├── references.js
│   │   └── disturbances.js
│   ├── controllers/
│   │   ├── pid.js
│   │   └── pr.js
│   └── visualization/
│       └── charts.js
└── tests/
    ├── app-ui.test.js
    └── simulation.test.js
```

The simulator keeps the plant, reference, disturbance, and controller models separate from the interface. Add new controllers as independent modules and register them in `js/simulation/simulator.js` when a workspace uses them.


## Numerical integration

It uses fixed-step fourth-order Runge–Kutta (RK4) method, with a default step size of 0.01 seconds. The controller output is held constant over each sample. A time-varying sine disturbance is evaluated at all four RK4 stages, rather than treated as constant during a step. The step size can be changed in the interface.


## Tests

Run the dependency-free test suite with Node.js:

```bash
npm test
```

Coverage includes the plant models, PID/PR controllers, step and sine references/disturbances, RK4 accuracy, workspace switching, and live simulation updates.


## Acknowledgments

The HTML interface was developed with AI assistance, being reviewed and adapted by the author.