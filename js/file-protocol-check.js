// JavaScript modules require HTTP; opening index.html directly cannot start the simulator.
if (window.location.protocol === "file:") {
  const message = "The simulator is not running because this page was opened as a file. Close it and double-click start_control_lab.bat.";
  window.alert(message);
  const status = document.getElementById("form-message");
  if (status) status.textContent = message;
}