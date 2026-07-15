'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  update(): void;
  draw(): void;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 检查用户是否偏好减少动效
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId: number;

    const particleCount = 100;
    const connectDistance = 100;
    const mouseConnectRange = 180;
    const mouse = { x: null as number | null, y: null as number | null };

    // 粒子数组
    let particles: Particle[] = [];

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class ParticleItem implements Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.8;
        this.vy = (Math.random() - 0.5) * 1.8;
        this.radius = Math.random() * 1.2 + 0.8;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(255,255,255,0.6)';
        ctx!.fill();
      }
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new ParticleItem());
      }
    }
    initParticles();

    function drawLines() {
      // 粒子之间连线
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectDistance) {
            const opacity = 1 - dist / connectDistance;
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(255,255,255,${opacity * 0.25})`;
            ctx!.lineWidth = 0.4;
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.stroke();
          }
        }
      }

      // 鼠标交互
      if (mouse.x !== null && mouse.y !== null) {
        // 光晕
        const gradient = ctx!.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, mouseConnectRange
        );
        gradient.addColorStop(0, 'rgba(240,248,255,0.07)');
        gradient.addColorStop(1, 'rgba(240,248,255,0)');
        ctx!.beginPath();
        ctx!.arc(mouse.x, mouse.y, mouseConnectRange, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();

        // 粒子与鼠标连线
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseConnectRange) {
            const rate = 1 - dist / mouseConnectRange;
            const lineOpacity = rate * 0.75;
            const lineWidth = rate * 1.3 + 0.2;

            // 外层柔光
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(200, 230, 255, ${lineOpacity * 0.22})`;
            ctx!.lineWidth = lineWidth + 1.6;
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.stroke();

            // 主线
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
            ctx!.lineWidth = lineWidth;
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.stroke();
          }
        }
      }
    }

    function animate() {
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx!.fillRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      drawLines();
      animationId = requestAnimationFrame(animate);
    }

    animate();

    // 鼠标事件
    function handleMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function handleMouseOut() {
      mouse.x = null;
      mouse.y = null;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    // 清理
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
