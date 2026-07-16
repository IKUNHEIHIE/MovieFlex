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
const moviesPage = readFileSync(join(root, 'src/app/movies/page.tsx'), 'utf8');
const movieDetailPage = readFileSync(join(root, 'src/app/movie/[id]/page.tsx'), 'utf8');
const episodeSelector = readFileSync(join(root, 'src/components/shared/EpisodeSelector.tsx'), 'utf8');
const profilePage = readFileSync(join(root, 'src/app/user/profile/page.tsx'), 'utf8');
const assistantHistoryPanel = readFileSync(join(root, 'src/components/user/AssistantHistoryPanel.tsx'), 'utf8');
const mascot = readFileSync(join(root, 'src/components/mascot/FurinaMascot.tsx'), 'utf8');
const assistantWidget = readFileSync(join(root, 'src/components/assistant/AiAssistantWidget.tsx'), 'utf8');
const assistantPage = readFileSync(join(root, 'src/app/user/assistant/page.tsx'), 'utf8');
const assistantProvider = readFileSync(join(root, 'src/lib/assistant-provider.ts'), 'utf8');

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

  it('passes public system branding settings into the navbar shell', () => {
    expect(rootLayout).toContain("import { getPublicSystemSettings } from '@/lib/system-settings'");
    expect(rootLayout).toContain('getPublicSystemSettings()');
    expect(rootLayout).toContain('<Navbar settings={publicSettings} />');
    expect(rootLayout).toContain('rel="icon" href={publicSettings.siteFaviconUrl}');
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

  it('keeps primary navigation visible on mobile as a horizontal scroll row', () => {
    expect(globalCss).not.toContain('.primaryNav { display: none; }');
    expect(globalCss).toContain('overflow-x: auto');
    expect(globalCss).toContain('scrollbar-width: none');
    expect(globalCss).toContain('.primaryNav::-webkit-scrollbar');
    expect(globalCss).toContain('flex-wrap: wrap');
  });

  it('softens movie category route changes with a listing entry animation', () => {
    expect(moviesPage).toContain('listingMotionKey');
    expect(moviesPage).toContain('className="movieListingShell"');
    expect(globalCss).toContain('.movieListingShell');
    expect(globalCss).toContain('@keyframes movieListingIn');
    expect(globalCss).toContain('prefers-reduced-motion: reduce');
  });

  it('collapses movie detail layout cleanly on mobile', () => {
    expect(movieDetailPage).toContain('className="detail-layout"');
    expect(movieDetailPage).not.toContain("gridTemplateColumns: '2fr 1fr'");
    expect(episodeSelector).toContain('className="episode-header"');
    expect(episodeSelector).toContain('className="source-tabs"');
    expect(globalCss).toContain('.detail-layout {');
    expect(globalCss).toContain('grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr)');
    expect(globalCss).toContain('.detail-layout { grid-template-columns: 1fr; gap: 18px; }');
    expect(globalCss).toContain('.intro-meta { flex-direction: column; }');
    expect(globalCss).toContain('.source-tabs { overflow-x: auto;');
  });

  it('keeps AI assistant history compact and last on the profile page', () => {
    expect(profilePage).toContain('take: 2');
    expect(profilePage).not.toContain('个 AI 会话');
    expect(profilePage.indexOf('MovieGridSection title={recommendations.title}')).toBeLessThan(profilePage.indexOf('<AssistantHistoryPanel conversations={aiConversations} />'));
  });

  it('renders profile AI history as a compact low-emphasis summary', () => {
    expect(assistantHistoryPanel).toContain('aria-label="AI 助手记录摘要"');
    expect(assistantHistoryPanel).toContain('padding: 16');
    expect(assistantHistoryPanel).toContain("fontSize: '1rem'");
    expect(assistantHistoryPanel).toContain('暂无 AI 对话记录，可从右下角助手开始。');
    expect(assistantHistoryPanel).toContain("whiteSpace: 'nowrap'");
    expect(assistantHistoryPanel).toContain("textOverflow: 'ellipsis'");
  });

  it('keeps pointer cancellation non-interactive and supports one keyboard activation path', () => {
    expect(mascot).toContain('onPointerCancel={cleanupPointer}');
    expect(mascot).toContain('onLostPointerCapture={cleanupPointer}');
    expect(mascot).toContain('onClick={activateMascot}');
    expect(mascot).toContain('shouldActivateMascotClick(event.detail)');
  });

  it('uses 观影小助手 as the user-visible assistant persona', () => {
    expect(assistantWidget).toContain('观影小助手');
    expect(assistantPage).toContain('观影小助手');
    expect(assistantProvider).toContain('名字是观影小助手');
    expect(assistantWidget).not.toContain('芙宁娜');
    expect(assistantPage).not.toContain('芙宁娜');
    expect(assistantProvider).not.toContain('名字是芙宁娜');
  });
});
