'use client';

import { useEffect, useRef } from 'react';

interface MoleculeSceneProps {
  className?: string;
  accent?: string;
}

export function MoleculeScene({ className = '', accent = '#BF953F' }: MoleculeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frameId = 0;
    let tick = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      tick += 0.012;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.52;
      const nodes: Array<{ x: number; y: number }> = [];

      for (let index = 0; index < 28; index += 1) {
        const angle = index * 0.55 + tick;
        const radius = 36 + index * 2.4;
        nodes.push({
          x: centerX + Math.cos(angle) * radius * 0.55,
          y: centerY + Math.sin(angle * 1.2) * radius * 0.35 - index * 1.2,
        });
      }

      context.strokeStyle = `${accent}55`;
      context.lineWidth = 1;
      context.beginPath();
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index]!;
        if (index === 0) context.moveTo(node.x, node.y);
        else context.lineTo(node.x, node.y);
      }
      context.stroke();

      for (const node of nodes) {
        context.beginPath();
        context.fillStyle = accent;
        context.globalAlpha = 0.85;
        context.arc(node.x, node.y, 2.2, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }

      frameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [accent]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
