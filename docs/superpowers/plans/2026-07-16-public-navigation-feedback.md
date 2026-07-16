# Public Navigation Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add route-aware active states, pending feedback, and smoother category-page transitions for the five public top navigation links.

**Architecture:** Keep the existing `Navbar` component and global CSS structure. Use Next navigation hooks to derive active state from `pathname` and `type` search param, local pending state for immediate click feedback, and small CSS animations for header progress and movie listing entry. No route or data-fetching changes.

**Tech Stack:** Next.js App Router, React client component, `next/navigation`, CSS in `globals.css`, Vitest file-contract tests, PM2 preview.

## Global Constraints

- Update only the public navigation experience and the public movie listing transition feel.
- Cover these nav destinations: `/`, `/movies?type=1`, `/movies?type=10`, `/movies?type=19`, `/movies?type=24`.
- Preserve existing routes, query parameters, search form behavior, login/account dropdown behavior, and admin UI.
- Continue running the preview on port `3070` without changing production port `3060`.
- No route or data-fetching changes.
- No new animation library.
- No full-app page transition framework.
- No redesign of the header layout or mobile navigation structure.
- No admin navigation changes.
- Active links should expose `aria-current="page"`.
- Respect `prefers-reduced-motion: reduce`.

---

## File Structure

- Modify `src/app/home-anime-contract.test.ts`: Extend public UI contract tests for route-aware nav hooks, active/pending classes, nav progress CSS, and movie listing entry motion.
- Modify `src/components/layout/Navbar.tsx`: Define nav item metadata, use `usePathname`/`useSearchParams`, compute active/pending state, render explicit classes and `aria-current`.
- Modify `src/app/globals.css`: Replace `a:first-child` active styling with `.navLinkActive`, `.navLinkPending`, `.navProgress`, pressed/focus states, and reduced-motion fallback.
- Modify `src/app/movies/page.tsx`: Add a stable wrapper class/key for category listing entry animation.

---

### Task 1: Route-Aware Navbar State

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `usePathname(): string`, `useSearchParams().get('type'): string | null`.
- Produces: nav link classes `navLink`, `navLinkActive`, `navLinkPending`; progress element class `navProgress`; `aria-current="page"` for active link.

- [ ] **Step 1: Write failing route-aware nav contract test**

Add these reads and assertions to `src/app/home-anime-contract.test.ts`:

```ts
const navbar = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');

it('makes public navigation route-aware with pending feedback hooks', () => {
  expect(navbar).toContain('usePathname');
  expect(navbar).toContain('useSearchParams');
  expect(navbar).toContain('navItems.map');
  expect(navbar).toContain('navLinkActive');
  expect(navbar).toContain('navLinkPending');
  expect(navbar).toContain('aria-current={isActive ? \'page\' : undefined}');
  expect(navbar).toContain('className="navProgress"');
  expect(globalCss).not.toContain('.primaryNav a:first-child');
  expect(globalCss).toContain('.navLinkActive');
  expect(globalCss).toContain('.navLinkPending');
  expect(globalCss).toContain('.navProgress');
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because `Navbar` does not use `usePathname`, `useSearchParams`, nav metadata, active/pending classes, or `.navProgress` yet.

- [ ] **Step 3: Implement route-aware navbar**

In `src/components/layout/Navbar.tsx`, import `usePathname` and `useSearchParams` from `next/navigation`, add `useEffect`, and render nav items from metadata:

```tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const navItems = [
  { label: '首页', href: '/', match: { pathname: '/' } },
  { label: '电影', href: '/movies?type=1', match: { pathname: '/movies', type: '1' } },
  { label: '剧集', href: '/movies?type=10', match: { pathname: '/movies', type: '10' } },
  { label: '综艺', href: '/movies?type=19', match: { pathname: '/movies', type: '19' } },
  { label: '动漫', href: '/movies?type=24', match: { pathname: '/movies', type: '24' } },
];
```

Inside the component:

```tsx
const pathname = usePathname();
const searchParams = useSearchParams();
const currentType = searchParams.get('type');
const [pendingHref, setPendingHref] = useState<string | null>(null);

const isItemActive = (item: typeof navItems[number]) => {
  if (item.match.pathname !== pathname) return false;
  return item.match.type ? currentType === item.match.type : true;
};

useEffect(() => {
  if (!pendingHref) return;
  const pendingItem = navItems.find((item) => item.href === pendingHref);
  if (pendingItem && isItemActive(pendingItem)) setPendingHref(null);
}, [pathname, currentType, pendingHref]);
```

Render nav links:

```tsx
<nav className="primaryNav" aria-label="主导航">
  {navItems.map((item) => {
    const isActive = isItemActive(item);
    const isPending = pendingHref === item.href && !isActive;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`navLink ${isActive ? 'navLinkActive' : ''} ${isPending ? 'navLinkPending' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setPendingHref(isActive ? null : item.href)}
      >
        {item.label}
      </Link>
    );
  })}
</nav>
{pendingHref && <span className="navProgress" aria-hidden="true" />}
```

- [ ] **Step 4: Implement nav CSS hooks**

In `src/app/globals.css`, replace `.primaryNav a:first-child, .primaryNav a:hover` with explicit route-aware styles:

```css
.primaryNav a { color: var(--color-text-secondary); font-size: 0.9rem; font-weight: 700; white-space: nowrap; transition: color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); }
.navLink { position: relative; padding: 7px 10px; border-radius: 999px; }
.navLink:hover, .navLinkActive { background: rgba(255, 255, 255, .72); color: var(--color-accent); box-shadow: inset 0 0 0 1px rgba(155, 73, 56, .12); }
.navLinkActive::after, .navLinkPending::after { position: absolute; right: 10px; bottom: 3px; left: 10px; height: 2px; border-radius: 99px; background: currentColor; content: ''; }
.primaryNav a:active, .navLinkPending { transform: translateY(1px) scale(.98); color: var(--color-accent); }
.navLinkPending::after { animation: navPulse 760ms ease-in-out infinite alternate; }
.navProgress { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; overflow: hidden; background: rgba(155, 73, 56, .08); }
.navProgress::after { display: block; width: 38%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, transparent, rgba(155, 73, 56, .85), transparent); animation: navProgress 920ms ease-in-out infinite; content: ''; }
@keyframes navPulse { from { opacity: .45; transform: scaleX(.66); } to { opacity: 1; transform: scaleX(1); } }
@keyframes navProgress { from { transform: translateX(-120%); } to { transform: translateX(280%); } }
```

- [ ] **Step 5: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS for the new route-aware nav contract.

- [ ] **Step 6: Commit route-aware navbar**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/components/layout/Navbar.tsx src/app/globals.css
git commit -m "feat: add route-aware navigation feedback"
```

---

### Task 2: Movie Category Entry Motion

**Files:**
- Modify: `src/app/home-anime-contract.test.ts`
- Modify: `src/app/movies/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing `typeId`, `sort`, `area`, `year`, `lang`, `pageSize`, `currentPage` values in `/movies` page.
- Produces: wrapper class `movieListingShell` and key `listingMotionKey` for route/category entry animation.

- [ ] **Step 1: Write failing movie-list motion contract test**

Add to `src/app/home-anime-contract.test.ts`:

```ts
const moviesPage = readFileSync(join(root, 'src/app/movies/page.tsx'), 'utf8');

it('softens movie category route changes with a listing entry animation', () => {
  expect(moviesPage).toContain('listingMotionKey');
  expect(moviesPage).toContain('className="movieListingShell"');
  expect(globalCss).toContain('.movieListingShell');
  expect(globalCss).toContain('@keyframes movieListingIn');
  expect(globalCss).toContain('prefers-reduced-motion: reduce');
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: FAIL because `movieListingShell`, `listingMotionKey`, and `movieListingIn` are not present.

- [ ] **Step 3: Implement movie listing wrapper**

In `src/app/movies/page.tsx`, after `getQueryUrl`, add:

```tsx
const listingMotionKey = [typeId || 'all', area || 'all', year || 'all', lang || 'all', sort, currentPage, pageSize].join('-');
```

Wrap the listing/filter content container:

```tsx
<div key={listingMotionKey} className="movieListingShell">
  ...existing filter and listing sections...
</div>
```

Keep the outer `.container` unchanged.

- [ ] **Step 4: Implement movie listing CSS**

In `src/app/globals.css`, add:

```css
.movieListingShell { animation: movieListingIn 360ms ease both; }
@keyframes movieListingIn { from { opacity: .68; transform: translateY(8px); } to { opacity: 1; transform: none; } }
```

Extend the reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) { .movie-card-link:active .glass, .movieListingShell { animation: none; transform: none; } }
```

- [ ] **Step 5: Run focused test to verify it passes**

Run: `npm test -- --run src/app/home-anime-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit movie listing motion**

Run:

```bash
git add src/app/home-anime-contract.test.ts src/app/movies/page.tsx src/app/globals.css
git commit -m "feat: soften movie category transitions"
```

---

### Task 3: Verification And 3070 Preview Refresh

**Files:**
- No source files expected after Tasks 1-2.

**Interfaces:**
- Consumes: built Next.js app from the current preview worktree.
- Produces: refreshed `movieflex-home-preview` PM2 process on port `3070`.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run Webpack production build**

Run: `npx next build --webpack`

Expected: build exits successfully and lists `/`, `/movies`, and existing routes. If the worktree has no `.env`, use the existing ignored `.env` symlink already created for this worktree.

- [ ] **Step 3: Restart preview on 3070**

Run:

```bash
pm2 restart movieflex-home-preview --update-env
```

Expected: PM2 shows `movieflex-home-preview` online and still using `-p 3070`.

- [ ] **Step 4: Smoke test target public routes**

Run:

```bash
curl -I --max-time 10 http://127.0.0.1:3070/
curl -I --max-time 10 'http://127.0.0.1:3070/movies?type=1'
curl -I --max-time 10 'http://127.0.0.1:3070/movies?type=10'
curl -I --max-time 10 'http://127.0.0.1:3070/movies?type=19'
curl -I --max-time 10 'http://127.0.0.1:3070/movies?type=24'
```

Expected: all return `HTTP/1.1 200 OK`.

---

## Plan Self-Review

- Spec coverage: Task 1 covers route-aware active state, pending feedback, `aria-current`, header progress, and removal of first-child false active styling. Task 2 covers `/movies` listing entry motion and reduced-motion fallback. Task 3 covers tests, Webpack build, PM2 preview, and all five route smoke tests.
- Placeholder scan: No TBD/TODO placeholders remain. All paths, class names, commands, and expected outcomes are explicit.
- Type consistency: `navItems`, `pendingHref`, `isItemActive`, `listingMotionKey`, `movieListingShell`, `navLinkActive`, `navLinkPending`, and `navProgress` are used consistently across tasks.
