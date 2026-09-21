import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface LabBackgroundAnimationProps {
  className?: string;
}

export default function LabBackgroundAnimation({
  className = "w-full h-full",
}: LabBackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 8;

    // WebGL Renderer with alpha transparency
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    // Lab Core (Outer Wireframe Icosahedron)
    const coreGeometry = new THREE.IcosahedronGeometry(1.5, 2);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x38f2ff,
      emissive: 0x38f2ff,
      emissiveIntensity: 0.5,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    // Inner solid glowing core
    const innerCoreGeom = new THREE.SphereGeometry(0.8, 32, 32);
    const innerCoreMat = new THREE.MeshPhongMaterial({
      color: 0x38f2ff,
      emissive: 0x38f2ff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    const innerCore = new THREE.Mesh(innerCoreGeom, innerCoreMat);
    scene.add(innerCore);

    // Orbiting Nodes Group
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    interface OrbitNode {
      mesh: THREE.Mesh;
      line: THREE.Line;
      angle: number;
      speed: number;
    }

    const nodes: OrbitNode[] = [];
    const numNodes = 6;
    const nodeGeom = new THREE.SphereGeometry(0.15, 16, 16);
    const nodeMat = new THREE.MeshPhongMaterial({
      color: 0x38f2ff,
      emissive: 0x38f2ff,
      emissiveIntensity: 2.0,
    });
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38f2ff,
      transparent: true,
      opacity: 0.35,
    });

    for (let i = 0; i < numNodes; i++) {
      const node = new THREE.Mesh(nodeGeom, nodeMat);
      const angle = (i / numNodes) * Math.PI * 2;
      const radius = 3.5;
      node.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.5,
        Math.sin(angle) * radius
      );

      // Connecting line from origin (0,0,0) to node position
      const points = [new THREE.Vector3(0, 0, 0), node.position.clone()];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeom, lineMat);

      nodeGroup.add(node);
      nodeGroup.add(line);
      nodes.push({
        mesh: node,
        line: line,
        angle: angle,
        speed: 0.005 + Math.random() * 0.01,
      });
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38f2ff, 2.5, 12);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      core.rotation.y += 0.005;
      core.rotation.x += 0.003;
      innerCore.scale.setScalar(1 + Math.sin(time * 2) * 0.05);

      nodes.forEach((node, i) => {
        node.angle += node.speed;
        const radius = 3.5 + Math.sin(time + i) * 0.5;
        node.mesh.position.set(
          Math.cos(node.angle) * radius,
          Math.sin(node.angle * 0.5) * radius * 0.3,
          Math.sin(node.angle) * radius
        );

        // Update line endpoint
        const positions = node.line.geometry.attributes.position.array as Float32Array;
        positions[3] = node.mesh.position.x;
        positions[4] = node.mesh.position.y;
        positions[5] = node.mesh.position.z;
        node.line.geometry.attributes.position.needsUpdate = true;
      });

      nodeGroup.rotation.y += 0.002;

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);

      coreGeometry.dispose();
      coreMaterial.dispose();
      innerCoreGeom.dispose();
      innerCoreMat.dispose();
      nodeGeom.dispose();
      nodeMat.dispose();
      lineMat.dispose();

      nodes.forEach((n) => {
        n.line.geometry.dispose();
      });

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
