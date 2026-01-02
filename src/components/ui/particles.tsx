"use client";

import React, { useEffect, useRef, useState } from "react";
import { Renderer, Camera, Geometry, Program, Mesh } from "ogl";
import { useTheme } from "next-themes";

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vRandom = random;
    vColor = color;
    
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    
    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor, 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor, circle);
    }
  }
`;

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { theme } = useTheme();
  // Key to force remount after WebGL context restore
  const [contextKey, setContextKey] = useState(0);

  const getDefaultColors = (): [number, number, number][] => {
    if (theme === "dark") {
      return [
        [1.0, 1.0, 1.0], // 순수 흰색
        [0.9, 0.9, 0.9], // 밝은 회색
        [0.8, 0.8, 0.8], // 회색
      ];
    } else {
      return [
        [0.0, 0.0, 0.0], // 순수 검은색
        [0.1, 0.1, 0.1], // 어두운 회색
        [0.2, 0.2, 0.2], // 회색
      ];
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Try to create WebGL renderer - may fail after browser idle reclaims context
    let renderer: Renderer;
    try {
      renderer = new Renderer({ depth: false, alpha: true });
    } catch (error) {
      // WebGL context creation failed - gracefully degrade
      console.warn("⚠️ Particles: WebGL unavailable, skipping render", error);
      return;
    }

    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener("resize", resize, false);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = { x, y };
    };

    if (moveParticlesOnHover) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    const handleBeforeUnload = () => {
      if (gl?.canvas) {
        gl.canvas.style.opacity = "0";
        gl.canvas.style.visibility = "hidden";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const count = particleCount;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const palette =
      particleColors && particleColors.length > 0
        ? particleColors.map(hexToRgb)
        : getDefaultColors();

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set(
        [Math.random(), Math.random(), Math.random(), Math.random()],
        i * 4,
      );
      const col = palette[Math.floor(Math.random() * palette.length)];
      colors.set(col, i * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    });

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let animationFrameId: number | null = null;
    let lastTime = performance.now();
    let elapsed = 0;
    let isAnimationPaused = false;

    const update = (t: number) => {
      if (isAnimationPaused) return;

      animationFrameId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta * speed;

      program.uniforms.uTime.value = elapsed * 0.001;

      if (moveParticlesOnHover) {
        particles.position.x = -mouseRef.current.x * particleHoverFactor;
        particles.position.y = -mouseRef.current.y * particleHoverFactor;
      } else {
        particles.position.x = 0;
        particles.position.y = 0;
      }

      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * speed;
      }

      renderer.render({ scene: particles, camera });
    };

    // Handle WebGL context loss gracefully (common after browser idle)
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (process.env.NODE_ENV === "development") {
        console.info("ℹ️ Particles: WebGL context lost (browser idle recovery)");
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    };

    const handleContextRestored = () => {
      if (process.env.NODE_ENV === "development") {
        console.info("ℹ️ Particles: WebGL context restored - reinitializing");
      }
      // Force useEffect to re-run by updating state
      setContextKey((k) => k + 1);
    };

    // Handle pause/resume from idle detection
    const handleIdleStart = () => {
      isAnimationPaused = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (process.env.NODE_ENV === "development") {
        console.info("ℹ️ Particles: Animation paused (idle)");
      }
    };

    const handleIdleEnd = () => {
      // Only resume if not already running and context is valid (F7 fix)
      if (animationFrameId !== null) return; // Already running
      if (!gl?.canvas) return; // Context lost

      isAnimationPaused = false;
      lastTime = performance.now(); // Reset timing to avoid jump
      animationFrameId = requestAnimationFrame(update);
      if (process.env.NODE_ENV === "development") {
        console.info("ℹ️ Particles: Animation resumed");
      }
    };

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    window.addEventListener("idle:start", handleIdleStart);
    window.addEventListener("idle:end", handleIdleEnd);

    animationFrameId = requestAnimationFrame(update);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      window.removeEventListener("idle:start", handleIdleStart);
      window.removeEventListener("idle:end", handleIdleEnd);
      window.removeEventListener("resize", resize);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (moveParticlesOnHover) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      if (gl.canvas) {
        gl.canvas.style.opacity = "0";
        gl.canvas.style.visibility = "hidden";
      }

      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
    };
  }, [
    particleCount,
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    theme,
    contextKey, // Re-run effect when context is restored
  ]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} />
  );
};

export default Particles;
