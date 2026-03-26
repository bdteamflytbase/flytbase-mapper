#!/usr/bin/env python3
"""
FlytBase Site Intelligence Viewer — Server
Serves the UI + all map/model assets.

Usage:
    python scripts/serve.py
    python scripts/serve.py --port 4000
"""

import argparse
import http.server
import mimetypes
import socketserver
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
VIEWER = PROJECT / "viewer"
ODM_OUT = PROJECT / "odm_project"
OUTPUT = PROJECT / "output"

ASSET_MAP = {
    "orthophoto.jpg": ODM_OUT / "odm_orthophoto" / "odm_orthophoto.tif",
    "orthophoto_jpg": OUTPUT / "odm_orthophoto.jpg",
    "mesh.ply": OUTPUT / "mesh.ply",
    "point_cloud.ply": OUTPUT / "point_cloud.ply",
    "dsm.jpg": OUTPUT / "odm_dsm_preview.jpg",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Root → viewer
        if self.path == "/" or self.path == "/index.html":
            self._serve_file(VIEWER / "index.html", "text/html")
            return

        # Assets
        if self.path.startswith("/assets/"):
            name = self.path[8:]  # strip /assets/

            # Special: orthophoto needs RGBA→RGB conversion, use pre-converted JPG
            if name == "orthophoto.jpg":
                f = OUTPUT / "odm_orthophoto.jpg"
                if f.exists():
                    self._serve_file(f, "image/jpeg")
                    return

            # Check asset map
            if name in ASSET_MAP and ASSET_MAP[name].exists():
                mt = mimetypes.guess_type(str(ASSET_MAP[name]))[0] or "application/octet-stream"
                self._serve_file(ASSET_MAP[name], mt)
                return

            # Check output dir
            f = OUTPUT / name
            if f.exists():
                mt = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                self._serve_file(f, mt)
                return

            # Check ODM output dirs
            for sub in ["odm_orthophoto", "odm_dem", "odm_texturing", "odm_georeferencing"]:
                f = ODM_OUT / sub / name
                if f.exists():
                    mt = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                    self._serve_file(f, mt)
                    return

            self.send_error(404, f"Asset not found: {name}")
            return

        # Static files from viewer dir
        rel = self.path.lstrip("/")
        f = VIEWER / rel
        if f.exists() and f.is_file():
            mt = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
            self._serve_file(f, mt)
            return

        self.send_error(404)

    def _serve_file(self, path, content_type):
        try:
            size = path.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with open(path, "rb") as f:
                while chunk := f.read(131072):
                    self.wfile.write(chunk)
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, format, *args):
        status = args[1] if len(args) > 1 else ""
        if "200" not in str(status):
            super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4000)
    args = parser.parse_args()

    # Kill any existing viewer on same port
    import subprocess
    subprocess.run(["lsof", "-ti", f":{args.port}"], capture_output=True)

    with socketserver.TCPServer(("", args.port), Handler) as httpd:
        print(f"""
  FlytBase Site Intelligence Viewer
  ─────────────────────────────────
  Open:  http://localhost:{args.port}

  Assets:
    Orthomosaic:  {'found' if (OUTPUT / 'odm_orthophoto.jpg').exists() else 'MISSING'}
    3D Mesh:      {'found' if (OUTPUT / 'mesh.ply').exists() else 'MISSING'}
    DSM Preview:  {'found' if (OUTPUT / 'odm_dsm_preview.jpg').exists() else 'MISSING'}

  Press Ctrl+C to stop
""")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Stopped.")


if __name__ == "__main__":
    main()
