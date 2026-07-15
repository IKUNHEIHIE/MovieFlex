# Azure Public Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Azure as a structurally distinct Ant Design public frontend while preserving the Ice Blue public experience and the existing admin UI.

**Architecture:** The persisted `active_theme` remains the server-side source of truth. The root layout selects an Azure-only public shell when `active_theme === 'azure'`; the shell supplies Ant Design tokens and public decorations while bypassing `/admin`. Public category URLs use canonical slugs, resolved to category IDs server-side, so visual navigation cannot depend on deployment-specific IDs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, Ant Design 6, NextAuth 5, Vitest 4, CSS Modules, Canvas.

## Global Constraints

- Keep `/admin` visually and behaviorally isolated from Azure public styling.
- Retain the current Ice Blue public structure when `active_theme` is `ice-blue`.
- Use `system_settings.active_theme` as the only theme selection source.
- Use canonical public slugs: `movie`, `tv-series`, `variety`, and `anime`; do not create hard-coded public category IDs.
- Preserve playback, authentication, favorites, history, telemetry, and recommendation contracts.
- Respect `prefers-reduced-motion` for all new motion.
- Keep the category cloud below the home-page primary content and at the end of the profile workspace.
- Stage only the files named in each task; do not commit unless the user explicitly requests it.

---

## File Structure

- `src/lib/categories/public-categories.ts`: canonical public category type guard, URL builder, and parent/child ID expansion.
- `src/lib/categories/public-categories.test.ts`: pure unit coverage for the category contract.
- `src/components/theme/PublicAppShell.tsx`: Azure-only public provider boundary with Ant Design tokens.
- `src/components/shared/CategoryCloud.tsx` and `CategoryCloud.module.css`: isolated canvas decoration plus accessible HTML category links.
- `src/components/shared/MovieCard.tsx` and `MovieCard.module.css`: shared, Azure-compatible movie card presentation.
- `src/components/user/UserWorkspace.tsx`: shared user page frame and navigation.
- `src/app/**/*.module.css`: route-local Azure composition and responsive rules; do not alter admin CSS.
- `src/app/layout.tsx`: server theme selection and stylesheet loading.
- `src/components/layout/Navbar.tsx`: canonical public category links.

### Task 1: Establish The Canonical Public Category Contract

**Files:**
- Create: `src/lib/categories/public-categories.ts`
- Create: `src/lib/categories/public-categories.test.ts`
- Modify: `src/app/movies/page.tsx`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/lib/collector/category.ts`
- Modify: `src/lib/collector/category.test.ts`

**Interfaces:**
- Produces: `type PublicCategorySlug = 'movie' | 'tv-series' | 'variety' | 'anime'`.
- Produces: `isPublicCategorySlug(value: string | undefined): value is PublicCategorySlug`.
- Produces: `resolvePublicCategoryIds(categories: PublicCategory[], slug: PublicCategorySlug): number[]`.
- Produces: `categoryHref(slug: PublicCategorySlug): string`.
- Consumes: `Category` rows with `id`, `slug`, and `parentId` from Prisma.

- [ ] **Step 1: Write failing pure-category tests**

```ts
import { describe, expect, it } from 'vitest';
import { categoryHref, isPublicCategorySlug, resolvePublicCategoryIds } from './public-categories';

const categories = [
  { id: 1, slug: 'movie', parentId: null },
  { id: 2, slug: 'action', parentId: 1 },
  { id: 13, slug: 'tv-series', parentId: null },
  { id: 14, slug: 'domestic', parentId: 13 },
  { id: 22, slug: 'variety', parentId: null },
  { id: 27, slug: 'anime', parentId: null },
];

describe('public category helpers', () => {
  it('builds stable URLs from slugs rather than database IDs', () => {
    expect(categoryHref('anime')).toBe('/movies?category=anime');
    expect(isPublicCategorySlug('tv-series')).toBe(true);
    expect(isPublicCategorySlug('13')).toBe(false);
  });

  it('includes the selected parent and its direct children', () => {
    expect(resolvePublicCategoryIds(categories, 'movie')).toEqual([1, 2]);
    expect(resolvePublicCategoryIds(categories, 'tv-series')).toEqual([13, 14]);
    expect(resolvePublicCategoryIds(categories, 'anime')).toEqual([27]);
  });
});
```

- [ ] **Step 2: Verify the tests fail because the module does not exist**

Run: `npm test -- --run src/lib/categories/public-categories.test.ts`

Expected: FAIL with a module resolution error for `./public-categories`.

- [ ] **Step 3: Implement the minimal canonical category helpers**

```ts
export const PUBLIC_CATEGORY_SLUGS = ['movie', 'tv-series', 'variety', 'anime'] as const;
export type PublicCategorySlug = (typeof PUBLIC_CATEGORY_SLUGS)[number];
export type PublicCategory = { id: number; slug: string; parentId: number | null };

export function isPublicCategorySlug(value: string | undefined): value is PublicCategorySlug {
  return Boolean(value && (PUBLIC_CATEGORY_SLUGS as readonly string[]).includes(value));
}

export function resolvePublicCategoryIds(categories: PublicCategory[], slug: PublicCategorySlug): number[] {
  const parent = categories.find((category) => category.slug === slug && category.parentId === null);
  return parent
    ? categories.filter((category) => category.id === parent.id || category.parentId === parent.id).map((category) => category.id)
    : [];
}

export function categoryHref(slug: PublicCategorySlug) {
  return `/movies?category=${slug}`;
}
```

- [ ] **Step 4: Make catalogue filtering consume the canonical contract**

In `src/app/movies/page.tsx`, parse `params.category`, fetch categories before constructing `where`, and use the resolved IDs only when a direct `type` is absent:

```ts
const publicCategory = isPublicCategorySlug(params.category) ? params.category : undefined;
const [categories, rawAreas, rawLanguages] = await Promise.all([/* existing category and filter queries */]);
const where: Prisma.MovieWhereInput = {};
if (typeId) where.typeId = typeId;
else if (publicCategory) {
  const ids = resolvePublicCategoryIds(categories, publicCategory);
  if (ids.length) where.typeId = { in: ids };
}
```

Keep `category` in `getQueryUrl`, and reset only `page` when a filter changes.

- [ ] **Step 5: Replace public numeric category URLs and collector lookup**

Use the new helper in the header and home links:

```tsx
<Link href={categoryHref('movie')}>电影</Link>
<Link href={categoryHref('tv-series')}>剧集</Link>
<Link href={categoryHref('variety')}>综艺</Link>
<Link href={categoryHref('anime')}>动漫</Link>
```

In `src/lib/collector/category.ts`, resolve the collector's canonical local category with `prisma.category.findUnique({ where: { slug } })`; do not use display names or fallback numeric IDs. Update its existing unit tests to assert that a canonical slug is queried and a missing row yields the existing configuration error path.

- [ ] **Step 6: Verify the category contract and affected collection behavior**

Run: `npm test -- --run src/lib/categories/public-categories.test.ts src/lib/collector/category.test.ts`

Expected: PASS.

- [ ] **Step 7: Inspect the intended diff**

Run: `git diff -- src/lib/categories src/app/movies/page.tsx src/components/layout/Navbar.tsx src/app/page.tsx src/lib/collector/category.ts src/lib/collector/category.test.ts`

Expected: only canonical URL and server category-resolution changes.

### Task 2: Add An Azure-Only Public Theme Boundary

**Files:**
- Create: `src/components/theme/PublicAppShell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `public/themes/azure/style.css`

**Interfaces:**
- Produces: `PublicAppShell({ children, themeKey }: { children: React.ReactNode; themeKey: string })`.
- Consumes: the server-resolved active theme key from `RootLayout`.
- Guarantees: Azure applies Ant Design tokens only to public routes; `/admin` is returned unwrapped by the Azure public provider.

- [ ] **Step 1: Write a small layout-selection test before extracting helpers**

Extract a pure helper in `src/lib/theme-registry.ts` and test it in `src/lib/theme-registry.test.ts`:

```ts
export function usesAzurePublicShell(themeKey: string) {
  return themeKey === 'azure';
}

it('enables the Azure public shell only for the Azure theme', () => {
  expect(usesAzurePublicShell('azure')).toBe(true);
  expect(usesAzurePublicShell('ice-blue')).toBe(false);
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npm test -- --run src/lib/theme-registry.test.ts`

Expected: FAIL because `usesAzurePublicShell` is not exported.

- [ ] **Step 3: Implement the helper and Azure public shell**

Create `PublicAppShell` using `ConfigProvider`, `App`, `SessionProvider`, `Navbar`, `MouseTrail`, and `Snowfall`. Apply these token values when `themeKey === 'azure'`:

```ts
const publicTheme = {
  colorPrimary: '#3a8bbf', colorInfo: '#3a8bbf', colorSuccess: '#278a66',
  colorWarning: '#bc7824', colorError: '#d95252', colorBgLayout: '#edf5f8',
  colorBgContainer: '#ffffff', colorBorder: '#d4e8f2', colorBorderSecondary: '#dbeaf1',
  colorText: '#1c3039', colorTextSecondary: '#5e6d69', colorTextTertiary: '#7a827a',
  borderRadius: 8, borderRadiusLG: 12, borderRadiusSM: 4,
};
```

Use `usePathname()` inside the client shell. If the pathname starts with `/admin` or `themeKey !== 'azure'`, render the existing `SessionProvider`, navbar, effects, and `main` structure without `ConfigProvider`. Otherwise wrap the public content in `ConfigProvider` with `theme.defaultAlgorithm` and `<App>`.

- [ ] **Step 4: Pass the server active theme into the shell without duplicating state**

Change `src/app/layout.tsx` so it reads the theme once and passes it to the shell:

```tsx
const activeTheme = await getActiveThemeKey().catch(() => 'ice-blue');
return (
  <html lang="zh-CN" data-theme={activeTheme}>
    <head><link rel="stylesheet" href={`/themes/${activeTheme}/style.css`} /></head>
    <body><PublicAppShell themeKey={activeTheme}>{children}</PublicAppShell><FurinaMascot /></body>
  </html>
);
```

Move global public control rules to CSS variables, retaining only shared selectors in `globals.css`. Keep Azure-specific background gradients, surface treatments, and motion rules in `public/themes/azure/style.css`; do not add broad admin selectors there.

- [ ] **Step 5: Verify the unit test and inspect server-rendered theme evidence**

Run: `npm test -- --run src/lib/theme-registry.test.ts`

Expected: PASS.

Run a development server with `npm run dev -- -p 3060 -H 0.0.0.0`, then run:

```bash
mysql -N -B -u newmovie -pzNDKwxGmWBrhpSh5 -h 127.0.0.1 -P 3306 newmovie -e "SELECT \`key\`, \`value\` FROM system_settings WHERE \`key\` = 'active_theme';"
curl -sS http://127.0.0.1:3060/ | grep -o '/themes/[^"? ]*' | sort -u
```

Expected: `active_theme` and stylesheet path both report `azure` when Azure is active.

### Task 3: Introduce Reusable Azure Discovery Components

**Files:**
- Create: `src/components/shared/MovieCard.module.css`
- Create: `src/components/shared/CategoryCloud.tsx`
- Create: `src/components/shared/CategoryCloud.module.css`
- Modify: `src/components/shared/MovieCard.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`

**Interfaces:**
- Produces: `CategoryCloud({ categories }: { categories: { name: string; slug: string; href: string }[] })`.
- Produces: a CSS-module-based `MovieCard` retaining its current public `movie` prop contract.
- Consumes: `categoryHref()` and canonical public slugs.

- [ ] **Step 1: Write a component contract test for accessible category navigation**

Create `src/components/shared/CategoryCloud.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CategoryCloud from './CategoryCloud';

it('keeps each category available as a keyboard-accessible link', () => {
  render(<CategoryCloud categories={[{ name: '动漫', slug: 'anime', href: '/movies?category=anime' }]} />);
  expect(screen.getByRole('link', { name: '动漫' })).toHaveAttribute('href', '/movies?category=anime');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/components/shared/CategoryCloud.test.tsx`

Expected: FAIL because `CategoryCloud` does not exist.

- [ ] **Step 3: Implement the visual components without changing data contracts**

Implement `CategoryCloud` with accessible DOM links as its functional interface and an adjacent `canvas` only as a pointer-events decorative layer. In the effect:

```ts
if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

Use pointer capture for drag rotation and clean up the animation frame plus all pointer listeners. The component must not rely on the canvas to navigate.

Move the shared movie card's poster, title, metadata, score badge, hover elevation, focus outline, and missing-poster fallback into `MovieCard.module.css`. Preserve the existing component's link target, image `alt`, and movie fields.

- [ ] **Step 4: Compose the Azure home page around the existing data queries**

Keep the page's existing Prisma/recommendation queries and carousel. Replace only category URLs and composition:

```tsx
<div className={styles.blurFade} style={{ '--delay': '110ms' } as CSSProperties}>
  <MovieRail title={recommendationRail.title} href="/movies" movies={recommendationRail.movies} />
</div>
<div className={styles.categoryCloud}>
  <CategoryCloud categories={[
    { name: '电影', slug: 'movie', href: categoryHref('movie') },
    { name: '剧集', slug: 'tv-series', href: categoryHref('tv-series') },
    { name: '综艺', slug: 'variety', href: categoryHref('variety') },
    { name: '动漫', slug: 'anime', href: categoryHref('anime') },
  ]} />
</div>
```

Keep the cloud after all rails. In `page.module.css`, limit `blurFade` to the first recommendation rail and define a `prefers-reduced-motion` rule that forces `opacity: 1`, clears `filter` and `transform`, and removes animations.

- [ ] **Step 5: Verify component behavior and non-animated mode**

Run: `npm test -- --run src/components/shared/CategoryCloud.test.tsx`

Expected: PASS.

Inspect the responsive and reduced-motion CSS in `src/app/page.module.css` and `src/components/shared/CategoryCloud.module.css`; every animation must have an explicit reduced-motion override.

### Task 4: Apply Azure Composition To Catalogue, Search, Detail, And Authentication

**Files:**
- Create: `src/app/movies/movies.module.css`
- Create: `src/app/search/search.module.css`
- Create: `src/app/movie/[id]/movie-detail.module.css`
- Create: `src/app/auth.module.css`
- Modify: `src/app/movies/page.tsx`
- Modify: `src/app/search/page.tsx`
- Modify: `src/app/movie/[id]/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`
- Modify: `src/components/home/PopularCarousel.tsx`
- Modify: `src/components/home/PopularCarousel.module.css`

**Interfaces:**
- Consumes: the existing route search parameters, server data queries, auth actions, playback components, and `MovieCard` contract.
- Produces: route-local Azure layout classes with no admin selectors.

- [ ] **Step 1: Capture existing public-route behavior before styling changes**

Run the existing suite and record its result:

Run: `npm test -- --run`

Expected: the baseline test total passes, except for already documented unrelated failures if any.

Inspect each route's existing form action, query parsing, movie link, playback component props, favorite action, and error message. Styling work must not change those contracts.

- [ ] **Step 2: Move each route's visual composition to a local module**

Use the following stable page roots, preserving existing children and event handlers:

```tsx
// catalogue
<div className={`container public-page ${styles.page}`}>...</div>

// search
<main className={`container public-page ${styles.page}`}>...</main>

// authentication
<main className={styles.authPage}><section className={styles.authCard}>...</section></main>

// detail
<div className={`container public-page ${styles.page}`}>...</div>
```

Define surfaces, grids, filter panels, empty states, mobile breakpoints, and focus-visible styling in the new CSS modules. Use existing CSS variables and Ant Design tokens rather than hard-coding a second palette. Align `PopularCarousel` to Azure surface/border/overlay values without altering its accessible carousel controls or timing.

- [ ] **Step 3: Ensure Azure has a visibly distinct layout while Ice Blue remains compatible**

Scope the new visual enhancements through the Azure shell and theme stylesheet. Do not remove semantic class names used by the existing Ice Blue stylesheet. The new modules may establish Azure's card spacing, page headings, filter surface, auth composition, and detail hierarchy, but must render legibly with the default variables when Ice Blue is active.

- [ ] **Step 4: Run route and type verification**

Run: `npm test -- --run`

Expected: PASS, with no regression in public route tests.

Run: `npx tsc --noEmit`

Expected: zero new errors. If the known `NextRequest` fixture errors or missing `RouteContext` errors remain, record them separately with file paths; do not change unrelated admin/collection tests in this task.

### Task 5: Build The Azure User Workspace

**Files:**
- Create: `src/components/user/UserWorkspace.tsx`
- Create: `src/app/user/user.module.css`
- Modify: `src/app/user/profile/page.tsx`
- Modify: `src/app/user/favorites/page.tsx`
- Modify: `src/app/user/history/page.tsx`
- Modify: `src/app/user/layout.tsx`
- Modify: `src/components/user/FavoriteButton.tsx`
- Modify: `src/components/user/HistoryDeleteButton.tsx`

**Interfaces:**
- Produces: `UserWorkspace({ children, active }: { children: React.ReactNode; active: 'profile' | 'favorites' | 'history' })`.
- Consumes: existing NextAuth session, user route guards, favorite/history mutations, and `CategoryCloud`.
- Guarantees: user routes preserve their existing authentication redirect and API behavior.

- [ ] **Step 1: Write the workspace navigation test**

Create `src/components/user/UserWorkspace.test.tsx` using a mock for `@/lib/auth/auth` that returns `{ user: { username: 'demo' } }`:

```tsx
render(await UserWorkspace({ active: 'favorites', children: <p>收藏内容</p> }));
expect(screen.getByRole('link', { name: '我的收藏' })).toHaveAttribute('href', '/user/favorites');
expect(screen.getByRole('link', { name: '我的收藏' })).toHaveClass('active');
expect(screen.getByText('收藏内容')).toBeInTheDocument();
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- --run src/components/user/UserWorkspace.test.tsx`

Expected: FAIL because `UserWorkspace` does not exist.

- [ ] **Step 3: Implement the workspace shell and compose the user pages**

Implement the exact interface with profile, favorites, and history links. Keep session lookup server-side:

```tsx
const session = await auth();
const user = session!.user as { username?: string; email?: string };
```

Wrap each page's existing content in `UserWorkspace` with its matching `active` value. Keep existing API calls in `FavoriteButton` and `HistoryDeleteButton`; update only the classes and feedback presentation. Render the existing `CategoryCloud` after profile content using the same four canonical public links.

- [ ] **Step 4: Add responsive workspace styling and test it**

Use `user.module.css` for sidebar/content desktop layout, a single-column small-screen layout, focus-visible navigation, poster-card favorites, and progress-rich history rows. No user route should depend on a canvas for navigation.

Run: `npm test -- --run src/components/user/UserWorkspace.test.tsx src/components/shared/CategoryCloud.test.tsx`

Expected: PASS.

### Task 6: Integrate, Build, And Perform Browser-Level Theme Verification

**Files:**
- Modify: files from Tasks 1 through 5 only when verification exposes a directly related defect.
- Test: `src/lib/categories/public-categories.test.ts`, `src/lib/theme-registry.test.ts`, `src/components/shared/CategoryCloud.test.tsx`, `src/components/user/UserWorkspace.test.tsx`, plus the existing suite.

**Interfaces:**
- Consumes: the complete Azure public shell, page modules, and category contract.
- Produces: verified Azure/Ice Blue theme switching evidence and a record of unrelated validation blockers.

- [ ] **Step 1: Run focused tests first**

Run:

```bash
npm test -- --run src/lib/categories/public-categories.test.ts src/lib/theme-registry.test.ts src/components/shared/CategoryCloud.test.tsx src/components/user/UserWorkspace.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run repository verification**

Run:

```bash
npm test -- --run
npm run lint
npx tsc --noEmit
npm run build
```

Expected: the test suite and build pass. For lint/type checks, distinguish pre-existing failures from new failures by comparing against the baseline and report the exact paths; do not suppress lint rules or use TypeScript ignores.

- [ ] **Step 3: Start the application and verify server-rendered theme selection**

Run: `npm run dev -- -p 3060 -H 0.0.0.0`

With `active_theme = azure`, run:

```bash
curl -sS http://127.0.0.1:3060/ | grep -o '/themes/[^"? ]*' | sort -u
curl -sS http://127.0.0.1:3060/ | grep -o 'data-theme="[^"]*"' | sort -u
```

Expected: `/themes/azure/style.css` and `data-theme="azure"`.

- [ ] **Step 4: Perform browser screenshot verification at desktop and mobile widths**

For Azure, inspect `/`, `/movies?category=anime`, `/search?q=test`, `/movie/1`, `/login`, `/register`, `/user/profile`, `/user/favorites`, and `/user/history`. Verify:

```text
- Azure shell has the light-blue background, white surfaces, Azure primary action color, and Ant Design control styling.
- Home category cloud occurs after content rails, and its links navigate without relying on the canvas.
- Reduced-motion simulation removes rail/cloud entrance motion.
- User workspace is responsive and keeps all original actions available.
- Admin pages retain their prior operational UI.
```

Switch `active_theme` to `ice-blue` through the admin API/UI, reload the document, and repeat `/`, `/movies?category=anime`, `/movie/1`, and `/admin`. Verify the Ice Blue public structure remains usable and `/admin` is unchanged. Restore `active_theme` to `azure` after comparison.

- [ ] **Step 5: Inspect the final intended diff without touching unrelated work**

Run: `git status --short` and `git diff --check`.

Expected: no whitespace errors; no unrelated user changes were reverted, staged, or modified.
