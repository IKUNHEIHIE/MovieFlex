'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MouseTrail as MouseTrailEngine, type TrailConfig } from './mouse-trail';

interface MouseTrailProps {
  config?: Partial<TrailConfig>;
  enabled?: boolean;
}

export default function MouseTrail({ config, enabled = true }: MouseTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<MouseTrailEngine | null>(null);
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isVisible =
    enabled &&
    !reducedMotion &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/user') &&
    !pathname.startsWith('/movie/') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/register');

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    trailRef.current = new MouseTrailEngine(canvasRef.current, config);

    return () => {
      if (trailRef.current) {
        trailRef.current.destroy();
        trailRef.current = null;
      }
    };
  }, [config, isVisible]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  );
}
