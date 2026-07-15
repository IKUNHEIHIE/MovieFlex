export type TrailShape = 'star' | 'circle' | 'square' | 'heart' | 'triangle' | 'diamond';
export type ColorMode = 'single' | 'gradient' | 'rainbow';

export interface TrailConfig {
  shape: TrailShape;
  colorMode: ColorMode;
  color1: string;
  color2: string;
  particleSize: number;
  particleLife: number;
  particleDensity: number;
  spreadRange: number;
  particleOpacity: number;
  glow: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  birthTime: number;
  life: number;
  maxLife: number;
  birthHue: number;
  size: number;
}

const DENSITY_MAP: Record<number, number> = { 1: 15, 2: 30, 3: 50, 4: 80, 5: 120 };

export const DEFAULT_CONFIG: TrailConfig = {
  shape: 'star',
  colorMode: 'single',
  color1: '#5aa3d1',
  color2: '#3a8bbf',
  particleSize: 9,
  particleLife: 2,
  particleDensity: 2,
  spreadRange: 29,
  particleOpacity: 0.95,
  glow: true,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 100, g: 100, b: 100 };
}

function interpolateColor(c1: string, c2: string, f: number): { r: number; g: number; b: number } {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return { r: Math.round(a.r + (b.r - a.r) * f), g: Math.round(a.g + (b.g - a.g) * f), b: Math.round(a.b + (b.b - a.b) * f) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255), g: Math.round(hue2rgb(p, q, h) * 255), b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255) };
}

function getColor(p: Particle, lifeRatio: number, config: TrailConfig): string {
  if (config.colorMode === 'rainbow') {
    const hue = (p.birthHue + (Date.now() - p.birthTime) * 0.03) % 360;
    const rgb = hslToRgb(hue, 0.9, 0.55);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${config.particleOpacity * lifeRatio})`;
  } else if (config.colorMode === 'gradient') {
    const rgb = interpolateColor(config.color1, config.color2, 1 - lifeRatio);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${config.particleOpacity * lifeRatio})`;
  } else {
    const rgb = hexToRgb(config.color1);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${config.particleOpacity * lifeRatio})`;
  }
}

function drawShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: TrailShape): void {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'star':
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const ox = x + Math.cos(a) * size;
        const oy = y + Math.sin(a) * size;
        i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
        const ia = a + (2 * Math.PI) / 10;
        ctx.lineTo(x + Math.cos(ia) * size * 0.38, y + Math.sin(ia) * size * 0.38);
      }
      ctx.closePath();
      break;
    case 'heart':
      ctx.moveTo(x, y + size * 0.3);
      ctx.bezierCurveTo(x - size, y - size * 0.6, x - size * 1.05, y + size * 0.5, x, y + size * 1.05);
      ctx.bezierCurveTo(x + size * 1.05, y + size * 0.5, x + size, y - size * 0.6, x, y + size * 0.3);
      break;
    case 'triangle':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.87, y + size * 0.5);
      ctx.lineTo(x - size * 0.87, y + size * 0.5);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      break;
    default:
      ctx.arc(x, y, size, 0, Math.PI * 2);
  }
  ctx.fill();
}

export class MouseTrail {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mouseX = -100;
  private mouseY = -100;
  private mouseInPage = false;
  private animId: number | null = null;
  private lastFrameTime = 0;
  private config: TrailConfig;

  constructor(canvas: HTMLCanvasElement, config: Partial<TrailConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.resize();
    this.bindEvents();
    this.lastFrameTime = performance.now();
    this.animId = requestAnimationFrame(this.animate.bind(this));
  }

  private bindEvents(): void {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseleave', this.handleMouseLeave);
    document.addEventListener('mouseenter', this.handleMouseEnter);
    document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd);
    window.addEventListener('resize', this.handleResize);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.mouseInPage = true;
  }

  private handleMouseLeave(): void {
    this.mouseInPage = false;
  }

  private handleMouseEnter(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.mouseInPage = true;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches[0]) {
      this.mouseX = e.touches[0].clientX;
      this.mouseY = e.touches[0].clientY;
      this.mouseInPage = true;
    }
  }

  private handleTouchEnd(): void {
    this.mouseInPage = false;
  }

  private handleResize(): void {
    this.resize();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  private animate(ts: number): void {
    if (!this.lastFrameTime) this.lastFrameTime = ts;
    let dt = (ts - this.lastFrameTime) / 1000;
    if (dt <= 0) dt = 0.016;
    if (dt > 0.1) dt = 0.1;
    this.lastFrameTime = ts;

    if (this.mouseInPage) {
      const density = DENSITY_MAP[this.config.particleDensity] || 50;
      const ppf = Math.max(1, Math.round(density * dt));
      for (let s = 0; s < ppf; s++) {
        const ox = this.mouseX + (Math.random() - 0.5) * 2;
        const oy = this.mouseY + (Math.random() - 0.5) * 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * this.config.spreadRange * 0.8 + this.config.spreadRange * 0.2;
        this.particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          birthTime: Date.now(),
          life: this.config.particleLife,
          maxLife: this.config.particleLife,
          birthHue: Math.random() * 360,
          size: this.config.particleSize * (0.7 + Math.random() * 0.6),
        });
      }
    }

    const now = Date.now();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life = Math.max(0, p.maxLife - (now - p.birthTime) / 1000);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    const maxP = this.config.particleDensity * 60;
    while (this.particles.length > maxP) this.particles.shift();

    const w = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const h = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    this.ctx.clearRect(0, 0, w, h);

    if (this.config.glow) {
      this.ctx.shadowBlur = this.config.particleSize * 1.5;
      this.ctx.shadowColor = this.config.color1;
    }

    for (const p of this.particles) {
      const lr = p.life / p.maxLife;
      this.ctx.fillStyle = getColor(p, lr, this.config);
      drawShape(this.ctx, p.x, p.y, p.size * lr, this.config.shape);
    }
    this.ctx.shadowBlur = 0;

    this.animId = requestAnimationFrame(this.animate.bind(this));
  }

  destroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseleave', this.handleMouseLeave);
    document.removeEventListener('mouseenter', this.handleMouseEnter);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('resize', this.handleResize);
  }
}
