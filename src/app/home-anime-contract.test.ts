import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const homePage = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
const rootLayout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
const adminLayout = readFileSync(join(root, 'src/app/admin/layout.tsx'), 'utf8');
const navbar = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
const carousel = readFileSync(join(root, 'src/components/home/PopularCarousel.tsx'), 'utf8');
const carouselCss = readFileSync(join(root, 'src/components/home/PopularCarousel.module.css'), 'utf8');
const homeCss = readFileSync(join(root, 'src/app/page.module.css'), 'utf8');
const globalCss = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const mascot = readFileSync(join(root, 'src/components/mascot/FurinaMascot.tsx'), 'utf8');

describe('anime public home contract', () => {
  it('uses a dedicated popular carousel populated from four view-ranked movies', () => {
    expect(homePage).toContain("import PopularCarousel from '@/components/home/PopularCarousel'");
    expect(homePage).toContain('orderBy: [{ viewCount: \'desc\' }, { id: \'asc\' }]');
    expect(homePage).toContain('take: 4');
    expect(homePage).toContain('<PopularCarousel movies={popularMovies} />');
  });

  it('mounts the mascot in the public shell rather than the admin shell', () => {
    expect(rootLayout).toContain("import FurinaMascot from '@/components/mascot/FurinaMascot'");
    expect(rootLayout).toContain('<FurinaMascot />');
    expect(adminLayout).not.toContain('FurinaMascot');
  });

  it('gives every featured movie distinct play and details actions', () => {
    expect(carousel).toContain('立即播放');
    expect(carousel).toContain('详情介绍');
    expect(carousel).toContain('?autoplay=1');
  });

  it('animates popular carousel slide changes without hard cuts', () => {
    expect(carousel).toContain('previousMovie');
    expect(carousel).toContain('styles.previousBackdrop');
    expect(carousel).toContain('styles.activeBackdrop');
    expect(carousel).toContain('key={activeMovie.id}');
    expect(carouselCss).toContain('@keyframes backdropIn');
    expect(carouselCss).toContain('@keyframes backdropOut');
    expect(carouselCss).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('adds tactile pressed states to public homepage controls', () => {
    expect(carouselCss).toContain('.playButton:active');
    expect(carouselCss).toContain('.detailsButton:active');
    expect(carouselCss).toContain('.controls button:active');
    expect(carouselCss).toContain('.dots button:active');
    expect(carouselCss).toContain('scale(.98)');
    expect(homeCss).toContain('.movieCard:active');
    expect(homeCss).toContain('.moreLink:active');
    expect(homeCss).toContain('scale(.985)');
    expect(globalCss).toContain('.movie-card-link:active .glass');
  });

  it('makes public navigation route-aware with pending feedback hooks', () => {
    expect(navbar).toContain('usePathname');
    expect(navbar).toContain('useSearchParams');
    expect(navbar).toContain('navItems.map');
    expect(navbar).toContain('navLinkActive');
    expect(navbar).toContain('navLinkPending');
    expect(navbar).toContain("aria-current={isActive ? 'page' : undefined}");
    expect(navbar).toContain('className="navProgress"');
    expect(globalCss).not.toContain('.primaryNav a:first-child');
    expect(globalCss).toContain('.navLinkActive');
    expect(globalCss).toContain('.navLinkPending');
    expect(globalCss).toContain('.navProgress');
  });

  it('keeps pointer cancellation non-interactive and supports one keyboard activation path', () => {
    expect(mascot).toContain('onPointerCancel={cleanupPointer}');
    expect(mascot).toContain('onLostPointerCapture={cleanupPointer}');
    expect(mascot).toContain('onClick={activateMascot}');
    expect(mascot).toContain('shouldActivateMascotClick(event.detail)');
  });
});
