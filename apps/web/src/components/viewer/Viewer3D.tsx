import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Props { output: any; }

export default function Viewer3D({ output }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !output?.download_url) return;

    // Cleanup previous
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d16);

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.01, 50000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.zoomSpeed = 1.5;
    controls.maxPolarAngle = Math.PI;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dir1.position.set(100, 200, 100);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xaaccff, 0.3);
    dir2.position.set(-100, 100, -100);
    scene.add(dir2);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.4));

    // Derive MTL URL from OBJ URL
    const objUrl = output.download_url;
    const basePath = objUrl.substring(0, objUrl.lastIndexOf('/') + 1);
    const mtlUrl = objUrl.replace(/mesh\.obj/, 'odm_textured_model_geo.mtl');

    const loadObj = (materials?: any) => {
      const objLoader = new OBJLoader();
      if (materials) objLoader.setMaterials(materials);

      objLoader.load(objUrl, (obj) => {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const radius = box.getSize(new THREE.Vector3()).length() / 2;

        scene.add(obj);

        controls.minDistance = radius * 0.05;
        controls.maxDistance = radius * 10;
        camera.position.set(center.x + radius * 0.8, center.y + radius * 0.6, center.z + radius * 0.8);
        controls.target.copy(center);
        controls.update();
      });
    };

    // Try loading MTL first, fall back to OBJ-only
    const mtlLoader = new MTLLoader();
    mtlLoader.load(mtlUrl, (materials) => {
      materials.preload();
      loadObj(materials);
    }, undefined, () => {
      // MTL failed — load OBJ without materials
      loadObj();
    });

    // Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };

    return () => {
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    };
  }, [output?._id]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#080d16' }}>
      {!output?.download_url && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fb-text-3)', fontSize: 13 }}>
          No 3D model available
        </div>
      )}
    </div>
  );
}
