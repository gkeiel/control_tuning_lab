// Native JavaScript modules need an HTTP origin in browsers; explain this when opened as file://.
if (window.location.protocol === "file:") {
  const message = "JavaScript modules are blocked when this file is opened directly. Double-click start_control_lab.bat to launch the simulator.";
  const output = document.getElementById("output-empty");
  const control = document.getElementById("control-empty");
  if (output) {
    output.querySelector("strong").textContent = "Start the local server";
    output.querySelector("span:last-child").textContent = message;
  }
  if (control) control.querySelector("strong").textContent = "Waiting for local server";
}
