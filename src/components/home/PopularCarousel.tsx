'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { clampCarouselIndex } from '@/lib/home-carousel';
import styles from './PopularCarousel.module.css';

export type CarouselMovie = {
  id: number;
  title: string;
  picUrl: string | null;
  score: number;
  typeName: string | null;
  year: number | null;
  remarks: string | null;
  description: string | null;
};

function scoreLabel(score: number) { return score > 0 ? score.toFixed(1) : '8.0'; }

export default function PopularCarousel({ movies }: { movies: CarouselMovie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const hasSlides = movies.length > 0;
  const paused = isHovered || isFocused;
  const activeMovie = movies[activeIndex] ?? movies[0];
  const goTo = (index: number) => setActiveIndex((index + movies.length) % movies.length);
  const next = () => { if (movies.length > 1) goTo(activeIndex + 1); };
  const previous = () => { if (movies.length > 1) goTo(activeIndex - 1); };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- active slide must be clamped when server data shrinks.
    setActiveIndex((current) => clampCarouselIndex(current, movies.length));
  }, [movies.length]);

  useEffect(() => {
    if (paused || reducedMotion || movies.length < 2) return;
    const timer = window.setInterval(next, 6000);
    return () => window.clearInterval(timer);
  }, [activeIndex, paused, reducedMotion, movies.length]);

  if (!hasSlides || !activeMovie) {
    return <section className={styles.emptyHero}><p>热门影片正在登场</p><h1>稍候片刻，舞台即将亮起。</h1></section>;
  }

  return <section className={styles.carousel} aria-roledescription="轮播" aria-label="热门影视" tabIndex={0}
    onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); } if (event.key === 'ArrowRight') { event.preventDefault(); next(); } }}
    onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onFocus={() => setIsFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false); }}
    onPointerDown={(event) => { swipeStart.current = event.clientX; }}
    onPointerUp={(event) => { const start = swipeStart.current; swipeStart.current = null; if (start === null) return; const distance = event.clientX - start; if (Math.abs(distance) >= 44) distance < 0 ? next() : previous(); }}>
    {activeMovie.picUrl && <img className={styles.backdrop} src={activeMovie.picUrl} alt="" aria-hidden="true" />}
    <div className={styles.veil} />
    <div className={styles.wave} aria-hidden="true" />
    <div className={styles.frame} aria-hidden="true"><span>HYDRO STAGE</span><span>{String(activeIndex + 1).padStart(2, '0')} / {String(movies.length).padStart(2, '0')}</span></div>
    <div className={styles.content}>
      <p className={styles.eyebrow}>本周人气放映</p>
      <h1>{activeMovie.title}</h1>
      <div className={styles.details}><strong>{scoreLabel(activeMovie.score)}</strong><span>{activeMovie.typeName || '热门影片'}</span>{activeMovie.year && <span>{activeMovie.year}</span>}</div>
      <p className={styles.description}>{activeMovie.description || activeMovie.remarks || '一起走进这场值得反复回味的幻想放映。'}</p>
      <div className={styles.actions}><Link href={`/movie/${activeMovie.id}?autoplay=1`} className={styles.playButton}><span aria-hidden="true">▶</span> 立即播放</Link><Link href={`/movie/${activeMovie.id}`} className={styles.detailsButton}>详情介绍 <span aria-hidden="true">→</span></Link></div>
    </div>
    {movies.length > 1 && <><div className={styles.controls}><button type="button" onClick={previous} aria-label="上一部热门影片">←</button><button type="button" onClick={next} aria-label="下一部热门影片">→</button></div><div className={styles.dots} aria-label="选择热门影片">{movies.map((movie, index) => <button key={movie.id} type="button" onClick={() => goTo(index)} className={index === activeIndex ? styles.activeDot : ''} aria-label={`显示 ${movie.title}`} aria-current={index === activeIndex ? 'true' : undefined} />)}</div></>}
  </section>;
}
