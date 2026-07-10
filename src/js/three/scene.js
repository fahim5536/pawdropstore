import * as THREE from 'three';

try {
  const canvas = document.getElementById('threeCanvas');
  if (canvas) {
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 100
    );
    camera.position.z = 3;

    // Neon particle field
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      // Neon green #D2FF00
      colors[i * 3]     = 0.82;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 0.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', 
      new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', 
      new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Floating wireframe sphere
    const sphereGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xD2FF00,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(3, 0, -2);
    scene.add(sphere);

    // Mouse parallax
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    });

    // Animate
    const clock = new THREE.Clock();
    const animate = () => {
      try {
        const elapsed = clock.getElapsedTime();
        particles.rotation.y = elapsed * 0.03;
        particles.rotation.x = mouseY * 0.3;
        particles.rotation.z = mouseX * 0.3;
        sphere.rotation.y = elapsed * 0.2;
        sphere.rotation.x = elapsed * 0.1;
        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.05;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      } catch (err) {
        console.warn("Error in animation loop:", err);
      }
    };
    animate();

    window.addEventListener('resize', () => {
      try {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      } catch (err) {
        console.warn("Error handling resize:", err);
      }
    });
  }
} catch (error) {
  console.error("Three.js/WebGL particle background initialization failed:", error);
}
