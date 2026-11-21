"""Start the Control Tuning Lab on an available local port."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import webbrowser

os.chdir(Path(__file__).resolve().parent)
server = ThreadingHTTPServer(("127.0.0.1", 0), SimpleHTTPRequestHandler)
url = f"http://127.0.0.1:{server.server_address[1]}/"
print(f"Control Tuning Lab is running at {url}")
print("Keep this window open while using the simulator. Press Ctrl+C to stop it.")
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("Control Tuning Lab server stopped.")
finally:
    server.server_close()