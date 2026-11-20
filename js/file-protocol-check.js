// Native JavaScript modules need an HTTP origin in browsers; explain this when opened as file://.
if (window.location.protocol === "file:") {
  const message = "The simulator needs a local server. Double-click start_control_lab.bat, then use the browser tab it opens.";
  const status = document.getElementById("form-message");
  if (status) status.textContent = message;
}
