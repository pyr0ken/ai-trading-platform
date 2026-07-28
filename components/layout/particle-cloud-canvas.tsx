'use client';

import React, { useEffect, useRef } from 'react';

export const ParticleCloudCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle pool setup
    const particleCount = Math.min(Math.floor((width * height) / 1800), 2200);
    const particles: Array<{
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      alpha: number;
      speed: number;
      offset: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.75 + 0.25,
        speed: Math.random() * 0.0015 + 0.0005,
        offset: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Deep dark base wash
      ctx.fillStyle = '#040406';
      ctx.fillRect(0, 0, width, height);

      // Render Electric Cobalt particles (#cc9166)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Organic wave motion
        const waveX = Math.sin(time * 0.8 + p.offset) * 20 + Math.cos(time * 0.3 + p.baseY * 0.01) * 15;
        const waveY = Math.cos(time * 0.6 + p.offset) * 15 + Math.sin(time * 0.4 + p.baseX * 0.01) * 12;

        p.x = p.baseX + waveX;
        p.y = p.baseY + waveY;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(31, 88, 242, ${p.alpha * (0.6 + 0.4 * Math.sin(time + p.offset))})`;
        ctx.fill();
      }

      // Draw subtle connecting constellation strands for clustered particles
      ctx.strokeStyle = 'rgba(31, 88, 242, 0.08)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i += 6) {
        const p1 = particles[i];
        for (let j = i + 1; j < i + 4 && j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 85) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 block"
    />
  );
};
