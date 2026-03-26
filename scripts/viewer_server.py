#!/usr/bin/env python3
"""
FlytBase 3D Model Web Viewer
==============================
Serves a Three.js-based viewer for point clouds and meshes.

Usage:
    python scripts/viewer_server.py                    # defaults to ./output
    python scripts/viewer_server.py --output ./output  # specify output dir
    python scripts/viewer_server.py --port 8080        # custom port
"""

import argparse
import http.server
import json
import os
import socketserver
from pathlib import Path


def create_viewer_html(output_dir):
    """Generate the Three.js viewer HTML."""

    # Check which files exist
    has_mesh = (output_dir / "mesh.ply").exists()
    has_pcd = (output_dir / "point_cloud.ply").exists()
    has_fused = (output_dir / "workspace" / "dense" / "fused.ply").exists()

    model_file = "mesh.ply" if has_mesh else ("point_cloud.ply" if has_pcd else "fused.ply")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlytBase 3D Viewer</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ background: #0a0a0f; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }}
        #canvas-container {{ width: 100vw; height: 100vh; }}
        canvas {{ display: block; }}

        #info-panel {{
            position: fixed;
            top: 16px;
            left: 16px;
            background: rgba(10, 10, 15, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 16px 20px;
            color: #e0e0e0;
            font-size: 13px;
            z-index: 100;
            min-width: 220px;
        }}
        #info-panel h2 {{
            font-size: 15px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 10px;
            letter-spacing: 0.3px;
        }}
        #info-panel .stat {{
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }}
        #info-panel .stat:last-child {{ border: none; }}
        .stat-label {{ color: #888; }}
        .stat-value {{ color: #4fc3f7; font-weight: 500; }}

        #controls {{
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(10, 10, 15, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            padding: 10px 20px;
            color: #888;
            font-size: 12px;
            z-index: 100;
        }}

        #toolbar {{
            position: fixed;
            top: 16px;
            right: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 100;
        }}
        .tool-btn {{
            background: rgba(10, 10, 15, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            color: #ccc;
            padding: 8px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }}
        .tool-btn:hover {{ background: rgba(79, 195, 247, 0.15); color: #4fc3f7; border-color: rgba(79, 195, 247, 0.3); }}
        .tool-btn.active {{ background: rgba(79, 195, 247, 0.2); color: #4fc3f7; border-color: #4fc3f7; }}

        #loading {{
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: #0a0a0f;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: opacity 0.5s;
        }}
        #loading.hidden {{ opacity: 0; pointer-events: none; }}
        .spinner {{
            width: 40px; height: 40px;
            border: 3px solid rgba(79, 195, 247, 0.2);
            border-top-color: #4fc3f7;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }}
        @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
        #loading p {{ color: #888; margin-top: 16px; font-size: 14px; }}
        #progress {{ color: #4fc3f7; font-size: 12px; margin-top: 8px; }}
    </style>
</head>
<body>
    <div id="loading">
        <div class="spinner"></div>
        <p>Loading 3D Model...</p>
        <div id="progress"></div>
    </div>

    <div id="info-panel">
        <h2>FlytBase 3D Viewer</h2>
        <div class="stat"><span class="stat-label">File</span><span class="stat-value" id="stat-file">—</span></div>
        <div class="stat"><span class="stat-label">Vertices</span><span class="stat-value" id="stat-verts">—</span></div>
        <div class="stat"><span class="stat-label">Faces</span><span class="stat-value" id="stat-faces">—</span></div>
        <div class="stat"><span class="stat-label">FPS</span><span class="stat-value" id="stat-fps">—</span></div>
    </div>

    <div id="toolbar">
        <button class="tool-btn" onclick="togglePointCloud()">Point Cloud</button>
        <button class="tool-btn" onclick="toggleMesh()">Mesh</button>
        <button class="tool-btn" onclick="toggleWireframe()">Wireframe</button>
        <button class="tool-btn" onclick="resetCamera()">Reset View</button>
        <button class="tool-btn" onclick="topDown()">Top-Down</button>
        <button class="tool-btn" onclick="screenshot()">Screenshot</button>
    </div>

    <div id="controls">
        Orbit: Left-click drag &nbsp;|&nbsp; Pan: Right-click drag &nbsp;|&nbsp; Zoom: Scroll &nbsp;|&nbsp; R: Reset
    </div>

    <div id="canvas-container"></div>

    <script type="importmap">
    {{
        "imports": {{
            "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
        }}
    }}
    </script>

    <script type="module">
        import * as THREE from 'three';
        import {{ OrbitControls }} from 'three/addons/controls/OrbitControls.js';
        import {{ PLYLoader }} from 'three/addons/loaders/PLYLoader.js';

        // Scene setup
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0f);
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0008);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
        const renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: true }});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true;
        controls.maxPolarAngle = Math.PI;
        controls.minDistance = 0.5;
        controls.maxDistance = 5000;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        scene.add(dirLight);
        const dirLight2 = new THREE.DirectionalLight(0x88aaff, 0.3);
        dirLight2.position.set(-50, 50, -50);
        scene.add(dirLight2);

        // Grid helper
        const gridHelper = new THREE.GridHelper(200, 50, 0x222233, 0x111122);
        scene.add(gridHelper);

        // State
        let pointCloudObj = null;
        let meshObj = null;
        let wireframeObj = null;
        let modelCenter = new THREE.Vector3();
        let modelRadius = 50;

        // Load model
        const loader = new PLYLoader();
        const modelFile = '{model_file}';

        document.getElementById('stat-file').textContent = modelFile;

        const manager = new THREE.LoadingManager();
        manager.onProgress = (url, loaded, total) => {{
            const pct = Math.round(loaded / total * 100);
            document.getElementById('progress').textContent = pct + '%';
        }};

        const plyLoader = new PLYLoader(manager);

        // Try loading mesh first, then point cloud
        const filesToTry = {json.dumps(
            ['mesh.ply', 'point_cloud.ply']
            if has_mesh else
            ['point_cloud.ply']
        )};

        async function loadModel() {{
            for (const file of filesToTry) {{
                try {{
                    const geometry = await new Promise((resolve, reject) => {{
                        plyLoader.load(
                            '/models/' + file,
                            resolve,
                            (xhr) => {{
                                if (xhr.total) {{
                                    const pct = Math.round(xhr.loaded / xhr.total * 100);
                                    document.getElementById('progress').textContent = pct + '%';
                                }}
                            }},
                            reject
                        );
                    }});

                    geometry.computeVertexNormals();
                    geometry.computeBoundingSphere();

                    const center = geometry.boundingSphere.center;
                    modelCenter.copy(center);
                    modelRadius = geometry.boundingSphere.radius;

                    const vertexCount = geometry.attributes.position.count;
                    const hasIndices = geometry.index !== null;
                    const faceCount = hasIndices ? geometry.index.count / 3 : 0;

                    document.getElementById('stat-file').textContent = file;
                    document.getElementById('stat-verts').textContent = vertexCount.toLocaleString();
                    document.getElementById('stat-faces').textContent = faceCount > 0 ? faceCount.toLocaleString() : 'N/A (points)';

                    const hasColors = geometry.attributes.color !== undefined;

                    if (hasIndices && faceCount > 0) {{
                        // It's a mesh
                        const material = new THREE.MeshStandardMaterial({{
                            vertexColors: hasColors,
                            color: hasColors ? 0xffffff : 0x4fc3f7,
                            side: THREE.DoubleSide,
                            flatShading: false,
                            metalness: 0.1,
                            roughness: 0.7,
                        }});
                        meshObj = new THREE.Mesh(geometry, material);
                        meshObj.castShadow = true;
                        meshObj.receiveShadow = true;
                        scene.add(meshObj);

                        // Wireframe overlay (hidden by default)
                        const wireMat = new THREE.MeshBasicMaterial({{
                            color: 0x4fc3f7,
                            wireframe: true,
                            transparent: true,
                            opacity: 0.1,
                        }});
                        wireframeObj = new THREE.Mesh(geometry, wireMat);
                        wireframeObj.visible = false;
                        scene.add(wireframeObj);
                    }}

                    // Always create point cloud view
                    const pointsMat = new THREE.PointsMaterial({{
                        size: modelRadius * 0.002,
                        vertexColors: hasColors,
                        color: hasColors ? 0xffffff : 0x4fc3f7,
                        sizeAttenuation: true,
                    }});
                    pointCloudObj = new THREE.Points(geometry, pointsMat);
                    pointCloudObj.visible = !meshObj;  // Show if no mesh
                    scene.add(pointCloudObj);

                    // Position camera
                    resetCamera();

                    // Hide loading
                    document.getElementById('loading').classList.add('hidden');
                    break;

                }} catch (e) {{
                    console.warn('Failed to load ' + file + ':', e);
                    continue;
                }}
            }}
        }}

        loadModel();

        // Controls
        window.togglePointCloud = () => {{
            if (pointCloudObj) {{
                pointCloudObj.visible = !pointCloudObj.visible;
                if (meshObj && pointCloudObj.visible) meshObj.visible = false;
            }}
        }};

        window.toggleMesh = () => {{
            if (meshObj) {{
                meshObj.visible = !meshObj.visible;
                if (pointCloudObj && meshObj.visible) pointCloudObj.visible = false;
            }}
        }};

        window.toggleWireframe = () => {{
            if (wireframeObj) wireframeObj.visible = !wireframeObj.visible;
        }};

        window.resetCamera = () => {{
            camera.position.set(
                modelCenter.x + modelRadius * 1.5,
                modelCenter.y + modelRadius * 1.0,
                modelCenter.z + modelRadius * 1.5
            );
            controls.target.copy(modelCenter);
            controls.update();
        }};

        window.topDown = () => {{
            camera.position.set(modelCenter.x, modelCenter.y + modelRadius * 2, modelCenter.z);
            controls.target.copy(modelCenter);
            controls.update();
        }};

        window.screenshot = () => {{
            renderer.render(scene, camera);
            const link = document.createElement('a');
            link.download = 'flytbase-3d-capture.png';
            link.href = renderer.domElement.toDataURL('image/png');
            link.click();
        }};

        document.addEventListener('keydown', (e) => {{
            if (e.key === 'r' || e.key === 'R') resetCamera();
        }});

        // FPS counter
        let frameCount = 0;
        let lastFpsTime = performance.now();

        function animate() {{
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);

            frameCount++;
            const now = performance.now();
            if (now - lastFpsTime >= 1000) {{
                document.getElementById('stat-fps').textContent = frameCount;
                frameCount = 0;
                lastFpsTime = now;
            }}
        }}
        animate();

        // Resize
        window.addEventListener('resize', () => {{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }});
    </script>
</body>
</html>"""


class ModelHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that serves models and the viewer."""

    def __init__(self, *args, output_dir=None, **kwargs):
        self.output_dir = output_dir
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            html = create_viewer_html(self.output_dir)
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(html.encode())
        elif self.path.startswith("/models/"):
            filename = self.path.replace("/models/", "")
            # Check output dir and workspace/dense
            filepath = self.output_dir / filename
            if not filepath.exists():
                filepath = self.output_dir / "workspace" / "dense" / filename
            if filepath.exists():
                self.send_response(200)
                self.send_header("Content-type", "application/octet-stream")
                self.send_header("Content-Length", str(filepath.stat().st_size))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                with open(filepath, "rb") as f:
                    while chunk := f.read(65536):
                        self.wfile.write(chunk)
            else:
                self.send_error(404, f"Model file not found: {filename}")
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        # Quiet logging
        pass


def main():
    parser = argparse.ArgumentParser(description="FlytBase 3D Model Web Viewer")
    parser.add_argument("--output", default="./output", help="Output directory with model files")
    parser.add_argument("--port", type=int, default=3333, help="Server port (default: 3333)")
    args = parser.parse_args()

    output_dir = Path(args.output).resolve()

    if not output_dir.exists():
        print(f"Error: Output directory not found: {output_dir}")
        sys.exit(1)

    handler = lambda *a, **kw: ModelHandler(*a, output_dir=output_dir, **kw)

    with socketserver.TCPServer(("", args.port), handler) as httpd:
        print(f"\n  FlytBase 3D Viewer")
        print(f"  Serving: {output_dir}")
        print(f"  Open:    http://localhost:{args.port}")
        print(f"  Press Ctrl+C to stop\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Viewer stopped.")


if __name__ == "__main__":
    main()
