# Homepage Motion Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smooth the public homepage carousel transition and add tactile click feedback to front-facing controls and cards.

**Architecture:** Keep the existing `PopularCarousel` component API and add local transition state for the previous slide image. Use CSS Module animations for carousel layers and existing public CSS Modules/global CSS for pressed states. Do not add dependencies or change data fetching.

**Tech Stack:** Next.js App Router, React client component, CSS Modules, Vitest file-contract tests, PM2 preview.

## Global Constraints

- No admin UI changes.
- No carousel data model or ranking changes.
- No new animation library.
- No sound, haptics, or exaggerated game-style effects.
- No redesign of the homepage layout beyond motion and pressed states.
- Preserve autoplay, hover/focus pause, keyboard arrows, pointer swipe, dots, and CTA links.
- Preserve `prefers-reduced-motion` behavior.
- Build preview on port `3070` without changing production port `3060`.

---

## File Structure

- Modify `src/components/home/PopularCarousel.tsx`: Track previous slide image, render crossfade layers, key the text content for re-entry animation.
- Modify `src/components/home/PopularCarousel.module.css`: Add image layer crossfade, active text animation, carousel control pressed states, reduced-motion fallbacks.
- Modify public card/link CSS after inspection: Add minimal `:active` feedback where front-page movie cards and links are styled.
- Modify or add tests under `src/app` or `src/components/home`: Verify carousel transition structure and public pressed-state CSS contracts.

---

### Task 1: Carousel Crossfade And Text Motion

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/components/home/PopularCarousel.tsx`
- Modify: `src/components/home/PopularCarousel.module.css`

**Interfaces:**
- Consumes: `movies: CarouselMovie[]`, existing `activeIndex`, existing `reducedMotion` state.
- Produces: CSS class references `backdropLayer`, `previousBackdrop`, `activeBackdrop`, `contentMotion`, and `contentKey` behavior through keyed content wrapper.

- [ ] **Step 1: Write the failing carousel contract test**

Update `src/app/home-anime-contract.test.ts` to read the carousel CSS and assert the new transition hooks:

```ts
const carouselCss = readFileSync(join(root, 'src/components/home/PopularCarousel.module.css'), 'utf8');

it('animates popular carousel slide changes without hard cuts', () => {
  expect(carousel).toContain('previousMovie');
  expect(carousel).toContain('styles.previousBackdrop');
  expect(carousel).toContain('styles.activeBackdrop');
  expect(carousel).toContain('key={activeMovie.id}');
  expect(carouselCss).toContain('@keyframes backdropIn');
  expect(carouselCss).toContain('@keyframes backdropOut');
  expect(carouselCss).toContain('@media (prefers-reduced-motion: reduce)');
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because `previousMovie`, `activeBackdrop`, or key/animation strings are not present yet.

- [ ] **Step 3: Implement minimal carousel transition**

In `src/components/home/PopularCarousel.tsx`:

```tsx
const [previousMovie, setPreviousMovie] = useState<CarouselMovie | null>(null);
const previousIndex = useRef(0);
const transitionTimer = useRef<number | null>(null);

const goTo = (index: number) => {
  if (movies.length < 1) return;
  setActiveIndex((current) => {
    const nextIndex = (index + movies.length) % movies.length;
    if (nextIndex === current) return current;
    if (!reducedMotion) setPreviousMovie(movies[current] ?? null);
    previousIndex.current = current;
    return nextIndex;
  });
};
```

Add cleanup and delayed previous-layer clearing:

```tsx
useEffect(() => {
  if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  if (reducedMotion || !previousMovie) return;
  transitionTimer.current = window.setTimeout(() => setPreviousMovie(null), 720);
  return () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  };
}, [activeIndex, previousMovie, reducedMotion]);
```

Render the layers before veil:

```tsx
{previousMovie?.picUrl && <img className={`${styles.backdropLayer} ${styles.previousBackdrop}`} src={previousMovie.picUrl} alt="" aria-hidden="true" />}
{activeMovie.picUrl && <img className={`${styles.backdropLayer} ${styles.activeBackdrop}`} src={activeMovie.picUrl} alt="" aria-hidden="true" />}
```

Wrap content with the active movie key:

```tsx
<div key={activeMovie.id} className={`${styles.content} ${styles.contentMotion}`}>
```

- [ ] **Step 4: Implement CSS transition hooks**

In `src/components/home/PopularCarousel.module.css`, replace `.backdrop` with layered styles:

```css
.backdropLayer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 23%; filter: saturate(1.08) contrast(1.02); transform: scale(1.035); z-index: -3; }
.activeBackdrop { animation: backdropIn 680ms cubic-bezier(.2, .72, .18, 1) both; }
.previousBackdrop { animation: backdropOut 720ms cubic-bezier(.2, .72, .18, 1) both; }
.contentMotion { animation: rise .58s cubic-bezier(.2, .72, .18, 1) both; }
@keyframes backdropIn { from { opacity: 0; transform: scale(1.055); } to { opacity: 1; transform: scale(1.025); } }
@keyframes backdropOut { from { opacity: 1; transform: scale(1.025); } to { opacity: 0; transform: scale(1.01); } }
```

Update reduced motion:

```css
@media (prefers-reduced-motion: reduce) { .wave, .contentMotion, .activeBackdrop, .previousBackdrop { animation: none; }.playButton, .detailsButton, .controls button, .dots button { transition: none; } }
```

- [ ] **Step 5: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit carousel transition**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/components/home/PopularCarousel.tsx src/components/home/PopularCarousel.module.css
git commit -m "feat: smooth homepage carousel transitions"
```

---

### Task 2: Public Click Feedback

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/components/home/PopularCarousel.module.css`
- Modify: public-facing movie card CSS file discovered by searching for movie card classes.

**Interfaces:**
- Consumes: Existing CSS classes for public buttons, carousel controls, dots, and movie card links.
- Produces: CSS `:active` pressed states and reduced-motion-safe transitions.

- [ ] **Step 1: Locate public card/link styles**

Run: `grep`/Glob for `MovieCard`, `movieCard`, `card`, and `href={`/movie/`}` under `src/components` and `src/app`.

Expected: Identify the CSS Module or global CSS that controls front-page movie cards.

- [ ] **Step 2: Write failing CSS contract test**

Update `src/app/home-anime-contract.test.ts` with assertions for tactile pressed states:

```ts
it('adds tactile pressed states to public homepage controls', () => {
  expect(carouselCss).toContain('.playButton:active');
  expect(carouselCss).toContain('.detailsButton:active');
  expect(carouselCss).toContain('.controls button:active');
  expect(carouselCss).toContain('.dots button:active');
  expect(carouselCss).toContain('scale(.98)');
});
```

If the discovered movie card CSS is contract-tested in a separate file, add an assertion that the card CSS contains `:active` and `scale(.985)`.

- [ ] **Step 3: Run focused test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because active pressed states do not exist yet.

- [ ] **Step 4: Implement carousel pressed states**

In `src/components/home/PopularCarousel.module.css`, add:

```css
.playButton:active, .detailsButton:active { transform: translateY(1px) scale(.98); box-shadow: 0 7px 16px rgba(13, 66, 149, .22); }
.controls button:active { transform: translateY(1px) scale(.96); background: rgba(242, 251, 255, .38); }
.dots button:active { transform: scale(.86); background: rgba(255, 255, 255, .86); }
```

- [ ] **Step 5: Implement card/link pressed states**

In the discovered public card CSS, add minimal pressed feedback to the outer link/card class:

```css
.card:active { transform: translateY(1px) scale(.985); }
```

Use the actual class name in the file. If the class already has a hover transform, preserve the existing hover value and only add an active override.

- [ ] **Step 6: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit click feedback**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/components/home/PopularCarousel.module.css <discovered-public-card-css>
git commit -m "feat: add public click feedback"
```

---

### Task 3: Verification And 3070 Preview

**Files:**
- No source files expected after Tasks 1-2.

**Interfaces:**
- Consumes: Built Next.js app from `main` checkout.
- Produces: PM2 process serving the test artifact on port `3070`.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: all test files pass.

- [ ] **Step 2: Run production build with Webpack**

Run: `npx next build --webpack`

Expected: build exits successfully and lists `/` plus public routes.

- [ ] **Step 3: Start preview on 3070**

Run:

```bash
pm2 delete movieflex-home-preview || true
pm2 start node_modules/next/dist/bin/next --name movieflex-home-preview -- start --hostname 0.0.0.0 -p 3070
```

Expected: PM2 shows `movieflex-home-preview` online.

- [ ] **Step 4: Smoke test homepage**

Run: `curl -I --max-time 10 http://127.0.0.1:3070/`

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 5: Report preview URL**

Report `http://35.213.128.99:3070/` and include verification evidence.

---

## Plan Self-Review

- Spec coverage: Task 1 covers carousel crossfade, text motion, existing controls, and reduced motion. Task 2 covers front-facing click feedback. Task 3 covers tests, Webpack build, and port `3070` preview while preserving `3060`.
- Placeholder scan: No TBD/TODO placeholders remain. The only discovery step is bounded to finding the actual public card CSS before applying a concrete `:active` rule.
- Type consistency: `previousMovie` uses existing `CarouselMovie`; CSS class names are consistently referenced in Task 1 and tests.
