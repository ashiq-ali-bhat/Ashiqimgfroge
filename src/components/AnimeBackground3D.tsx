import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimeTheme } from '../types';

import twilightImg from '../assets/images/anime_sky_landscape_1788518299808.jpg';
import sakuraImg from '../assets/images/anime_sakura_shrine_1788518320600.jpg';
import sunsetImg from '../assets/images/anime_sunset_meadow_1788521038885.jpg';
import cyberImg from '../assets/images/anime_cyber_city_1788521056249.jpg';
import celestialImg from '../assets/images/anime_celestial_night_1788521088258.jpg';

interface AnimeBackground3DProps {
  theme: AnimeTheme;
}

export const AnimeBackground3D: React.FC<AnimeBackground3DProps> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- 1. Sakura Petals (Custom 3D Mesh Geometry) ---
    // A curved leaf/petal shape
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(0.5, 0.5, 0.8, 1.2, 0.4, 2.0);
    petalShape.bezierCurveTo(0.2, 2.3, -0.2, 2.3, -0.4, 2.0);
    petalShape.bezierCurveTo(-0.8, 1.2, -0.5, 0.5, 0, 0);

    const petalGeometry = new THREE.ShapeGeometry(petalShape, 12);
    // Add subtle curvature to petal vertices in Z
    const pos = petalGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setZ(i, Math.sin((y / 2) * Math.PI) * 0.25);
    }
    petalGeometry.computeVertexNormals();

    const petalCount = 75;
    const petals: {
      mesh: THREE.Mesh;
      speedY: number;
      speedX: number;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      swayOffset: number;
    }[] = [];

    const petalGroup = new THREE.Group();
    scene.add(petalGroup);

    const petalColor = theme === 'sakura' 
      ? 0xffb7c5 
      : theme === 'night' 
        ? 0xa78bfa 
        : theme === 'sunset'
          ? 0xfbbf24
          : theme === 'cyber'
            ? 0x22d3ee
            : 0xf472b6;

    const petalMaterial = new THREE.MeshBasicMaterial({
      color: petalColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < petalCount; i++) {
      const mesh = new THREE.Mesh(petalGeometry, petalMaterial.clone());
      const scale = 0.3 + Math.random() * 0.45;
      mesh.scale.set(scale, scale, scale);

      mesh.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 40
      );

      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.random() * 0.5;

      petalGroup.add(mesh);

      petals.push({
        mesh,
        speedY: 0.04 + Math.random() * 0.05,
        speedX: (Math.random() - 0.5) * 0.02,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.03,
        rotSpeedZ: (Math.random() - 0.5) * 0.02,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }

    // --- 2. Glowing Anime Sparkle Motes (Points) ---
    const sparkleCount = 140;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleScales = new Float32Array(sparkleCount);

    for (let i = 0; i < sparkleCount; i++) {
      sparklePositions[i * 3] = (Math.random() - 0.5) * 70;
      sparklePositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      sparkleScales[i] = 1 + Math.random() * 2.5;
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.2, 'rgba(244, 114, 182, 0.8)');
      grad.addColorStop(0.5, 'rgba(192, 132, 252, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const sparkleTexture = new THREE.CanvasTexture(canvas);

    const sparkleMat = new THREE.PointsMaterial({
      size: 1.8,
      map: sparkleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8,
    });

    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    // --- 3. Floating 3D Prismatic Crystal Objects (Anime Magitech Accents) ---
    const crystalsGroup = new THREE.Group();
    scene.add(crystalsGroup);

    const crystalGeos = [
      new THREE.OctahedronGeometry(1.6, 0),
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.TetrahedronGeometry(1.8, 0),
    ];

    const crystalMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const geo = crystalGeos[i % crystalGeos.length];
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xec4899 : 0x818cf8,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (i - 2.5) * 12,
        (Math.sin(i) * 10),
        -10 + Math.cos(i) * 15
      );
      crystalsGroup.add(mesh);
      crystalMeshes.push(mesh);
    }

    // --- Mouse Move Handler for 3D Camera Tilt ---
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = normX * 4;
      mouseRef.current.targetY = normY * 3;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      camera.position.x = mouseRef.current.x;
      camera.position.y = mouseRef.current.y;
      camera.lookAt(0, 0, 0);

      // Animate Sakura Petals
      petals.forEach((p) => {
        p.mesh.position.y -= p.speedY;
        p.mesh.position.x += Math.sin(elapsedTime * 1.5 + p.swayOffset) * 0.03 + p.speedX;
        p.mesh.rotation.x += p.rotSpeedX;
        p.mesh.rotation.y += p.rotSpeedY;
        p.mesh.rotation.z += p.rotSpeedZ;

        // Reset if drifted below viewport
        if (p.mesh.position.y < -26) {
          p.mesh.position.y = 26;
          p.mesh.position.x = (Math.random() - 0.5) * 60;
        }
      });

      // Animate Sparkles
      sparkles.rotation.y = elapsedTime * 0.02;
      sparkles.rotation.x = Math.sin(elapsedTime * 0.03) * 0.05;

      // Animate 3D Crystals
      crystalMeshes.forEach((c, idx) => {
        c.rotation.x += 0.005 * (idx % 2 === 0 ? 1 : -1);
        c.rotation.y += 0.007;
        c.position.y += Math.sin(elapsedTime * 1.2 + idx) * 0.01;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      petalGeometry.dispose();
      sparkleGeo.dispose();
      sparkleMat.dispose();
      sparkleTexture.dispose();
    };
  }, [theme]);

  // Image source based on theme
  const getThemeBackground = () => {
    switch (theme) {
      case 'sakura':
        return sakuraImg;
      case 'sunset':
        return sunsetImg;
      case 'cyber':
        return cyberImg;
      case 'night':
        return celestialImg;
      case 'twilight':
      default:
        return twilightImg;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Anime Visual Background Layer with Subtle Zoom/Pan */}
      <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
        <img
          key={theme}
          src={getThemeBackground()}
          alt="Anime Landscape"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 filter brightness-75 contrast-110 saturate-125 transform transition-transform duration-1000 ease-out"
        />
        {/* Dynamic theme ambient overlay gradients */}
        {theme === 'twilight' && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-purple-950/40 to-slate-950/90 mix-blend-multiply" />
        )}
        {theme === 'sakura' && (
          <div className="absolute inset-0 bg-gradient-to-b from-sky-950/60 via-pink-950/30 to-slate-950/85" />
        )}
        {theme === 'sunset' && (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/60 via-orange-950/25 to-slate-950/85" />
        )}
        {theme === 'cyber' && (
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/60 via-indigo-950/50 to-slate-950/90 mix-blend-multiply" />
        )}
        {theme === 'night' && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-indigo-950/60 to-slate-950/95" />
        )}
        {/* Vignette edge darkening */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(2,6,23,0.85)_100%)]" />
      </div>

      {/* 3D Three.js Sakura & Sparkles Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-10 opacity-90" />
    </div>
  );
};
