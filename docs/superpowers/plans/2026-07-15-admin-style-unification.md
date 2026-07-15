# Admin Style Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore all admin pages to a single `admin.module.css`-driven light operations style, add consistent hover/press feedback and page transitions, remove unused half-finished admin UI code, and simplify repeated frontend code.

**Architecture:** Keep `src/app/admin/layout.tsx` as the only real admin shell. Move shared admin visuals into `src/app/admin/admin.module.css`, then update each admin page/component to consume those classes instead of inline dark-theme styles or client-only helper components. Use one small client transition wrapper for page fade-in, and keep business logic in existing server components and route handlers.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, Prisma, Recharts, Framer Motion only where animation is already essential.

## Global Constraints

- Production builds must use `npx next build --webpack`.
- Do not reintroduce `admin-theme.css` into any admin page.
- Do not pass browser event handlers or render functions from Server Components to Client Components.
- Keep the admin shell light and consistent across pages.
- Prefer CSS class changes over inline style objects for shared admin UI.
- Remove admin frontend files that are no longer referenced after the migration.

---

### Task 1: Lock the admin regression surface with tests

**Files:**
- Modify: `src/app/admin/server-boundary.test.ts`
- Create: `src/app/admin/admin-style.test.ts`

**Interfaces:**
- Consumes: raw source text from admin pages and components.
- Produces: regression checks that ensure no admin page imports `admin-theme.css`, `AdminButton`, `AdminCard`, or `AdminTable`, and that server pages rely on `admin.module.css`.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pages = [
  'src/app/admin/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/movies/page.tsx',
  'src/app/admin/themes/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/admin/stats/movies/page.tsx',
  'src/app/admin/stats/categories/page.tsx',
  'src/app/admin/stats/users/page.tsx',
  'src/app/admin/stats/trends/page.tsx',
  'src/app/admin/catalog/sources/page.tsx',
  'src/app/admin/catalog/categories/page.tsx',
  'src/app/admin/catalog/page.tsx',
  'src/app/admin/mappings/page.tsx',
];

describe('admin style unification', () => {
  it('does not import the half-finished dark theme or helper components', () => {
    for (const page of pages) {
      const source = readFileSync(join(process.cwd(), page), 'utf8');
      expect(source, page).not.toMatch(/admin-theme\.css/);
      expect(source, page).not.toMatch(/AdminButton|AdminCard|AdminTable/);
    }
  });

  it('keeps the real admin shell on admin.module.css', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/admin/layout.tsx'), 'utf8');
    expect(source).toContain("./admin.module.css");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/admin-style.test.ts`

Expected: FAIL because the existing pages still import `admin-theme.css` and helper components.

- [ ] **Step 3: Write minimal implementation**

Add the test file first, then continue with Tasks 2-5 to make it pass.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/admin-style.test.ts`

Expected: PASS after migration.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/admin-boundary.test.ts src/app/admin/admin-style.test.ts
git commit -m "test: lock admin style regression surface"
```

### Task 2: Expand `admin.module.css` into the single admin style system

**Files:**
- Modify: `src/app/admin/admin.module.css`
- Modify: `src/app/admin/layout.tsx`
- Create: `src/components/admin/AdminPageTransition.tsx`

**Interfaces:**
- Consumes: CSS classes from `admin.module.css`.
- Produces: shared classes for toolbar, inputs, buttons, metric cards, chart panels, table wrappers, badges, and page transition animation.

- [ ] **Step 1: Add the missing shared classes**

Implement the new classes in `admin.module.css`:

```css
.pageStack { display: grid; gap: 22px; }
.toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.toolbarActions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.searchForm { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.input, .select, .textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
.input:focus-visible, .select:focus-visible, .textarea:focus-visible { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(79, 125, 243, .16); }
.input:hover, .select:hover, .textarea:hover { border-color: #c7d4ea; }
.button, .buttonSecondary, .buttonGhost, .buttonDanger, .linkButton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 13px; border-radius: 8px; border: 1px solid transparent; font-weight: 700; text-decoration: none; cursor: pointer; transition: transform .14s ease, box-shadow .14s ease, background .14s ease, border-color .14s ease, color .14s ease; }
.button:hover, .buttonSecondary:hover, .buttonGhost:hover, .buttonDanger:hover, .linkButton:hover { transform: translateY(-1px); }
.button:active, .buttonSecondary:active, .buttonGhost:active, .buttonDanger:active, .linkButton:active { transform: translateY(0) scale(.99); }
.button:focus-visible, .buttonSecondary:focus-visible, .buttonGhost:focus-visible, .buttonDanger:focus-visible, .linkButton:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(79, 125, 243, .18); }
.button { background: var(--blue); color: #fff; box-shadow: 0 8px 18px rgba(79, 125, 243, .18); }
.button:hover { background: #3f6fe1; box-shadow: 0 10px 22px rgba(79, 125, 243, .24); }
.buttonSecondary { background: #eef3fb; color: var(--blue); border-color: #d9e3f5; }
.buttonSecondary:hover { background: #e5edf9; }
.buttonGhost { background: transparent; color: var(--muted); border-color: var(--line); }
.buttonGhost:hover { background: #f7faff; color: var(--ink); }
.buttonDanger { background: #fff4f4; color: #b42318; border-color: #f6d5d2; }
.buttonDanger:hover { background: #ffe9e7; }
.linkButton { background: var(--blue); color: #fff; }
.linkButtonSecondary { composes: buttonSecondary; }
.metricCard { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 20px; box-shadow: 0 8px 24px rgba(43, 74, 132, .045); transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
.metricCard:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(43, 74, 132, .08); border-color: #d7e2f2; }
.metricCard span { display: block; color: var(--muted); font-size: .78rem; }
.metricCard strong { display: block; margin-top: 8px; font-size: 1.65rem; }
.chartPanel { padding: 22px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: 0 8px 24px rgba(43, 74, 132, .045); }
.tableWrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.tableRowHover tbody tr { transition: background .14s ease; }
.tableRowHover tbody tr:hover { background: #f7faff; }
.tableActions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.badge { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; background: #eef3fb; color: var(--blue); font-size: .72rem; font-weight: 700; }
.muted { color: var(--muted); }
.stack { display: grid; gap: 18px; }
.adminPageTransition { animation: adminPageIn .22s ease both; }
@keyframes adminPageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .adminPageTransition, .button, .buttonSecondary, .buttonGhost, .buttonDanger, .linkButton, .metricCard { animation: none; transition: none; } }
```

- [ ] **Step 2: Wrap the admin shell children with the transition component**

Update `src/app/admin/layout.tsx` to render:

```tsx
import AdminPageTransition from '@/components/admin/AdminPageTransition';

return <div className={styles.shell}>
  <OperationsSidebar />
  <main className={styles.main}>
    <div className={styles.ribbon}><strong>MovieFlex Operations</strong><span>采集与内容运营</span></div>
    <AdminPageTransition>{children}</AdminPageTransition>
  </main>
</div>;
```

- [ ] **Step 3: Run the style regression test**

Run: `npm test -- src/app/admin/admin-style.test.ts`

Expected: still fail until the pages are migrated.

- [ ] **Step 4: Run the build and smoke check later after all page updates**

Run: `npx next build --webpack`

Expected: success after Tasks 3-5.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/admin.module.css src/app/admin/layout.tsx src/components/admin/AdminPageTransition.tsx
git commit -m "feat: unify admin shell and interactions"
```

### Task 3: Normalize the admin content pages to the shared style system

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/app/admin/movies/page.tsx`
- Modify: `src/app/admin/themes/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/catalog/page.tsx`
- Modify: `src/app/admin/catalog/sources/page.tsx`
- Modify: `src/app/admin/catalog/categories/page.tsx`
- Modify: `src/app/admin/mappings/page.tsx`
- Modify: `src/app/admin/movies/new/page.tsx`
- Modify: `src/app/admin/movies/[id]/page.tsx`
- Modify: `src/components/admin/MovieEditForm.tsx`
- Modify: `src/components/admin/CollectSourceManager.tsx`
- Modify: `src/components/admin/MappingManager.tsx`
- Modify: `src/components/admin/HealthMonitor.tsx`
- Modify: `src/components/admin/UserManager.tsx`
- Modify: `src/components/admin/ThemeButton.tsx` if button classes need alignment

**Interfaces:**
- Consumes: `admin.module.css` classes from the shell.
- Produces: all admin pages and shared admin components using the same panel, table, button, input, and layout classes.

- [ ] **Step 1: Write the migration pass by page**

Apply these concrete rules:

```tsx
// Replace half-finished theme imports
import '../admin-theme.css';
// or
import '../../admin-theme.css';

// Use the shell CSS module instead
import styles from './admin.module.css';
```

```tsx
// Replace helper components that are being removed
import AdminButton from '@/components/admin/AdminButton';
import AdminCard from '@/components/admin/AdminCard';
import AdminTable from '@/components/admin/AdminTable';

// Use native elements with shared classes instead
<Link href="/admin/movies/new" className={styles.linkButton}>新增影片</Link>
<button className={styles.buttonSecondary}>搜索</button>
<section className={styles.panel}>...</section>
```

```tsx
// Replace inline table shell styles
<div className={styles.tableWrap}>
  <table className={`${styles.table} ${styles.tableRowHover}`}>
```

```tsx
// Replace inline filter layout
<div className={styles.toolbar}>
  <form className={styles.searchForm}>...</form>
  <div className={styles.toolbarActions}>...</div>
</div>
```

- [ ] **Step 2: Migrate `/admin/movies` first**

Target shape:

```tsx
import styles from '../admin.module.css';

<section className={styles.panel}>
  <div className={styles.toolbar}>
    <form action="/admin/movies" className={styles.searchForm}>
      <input className={styles.input} ... />
      <button className={styles.buttonSecondary} type="submit">搜索</button>
    </form>
    <Link href="/admin/movies/new" className={styles.linkButton}>新增影片</Link>
  </div>
  <div className={styles.tableWrap}>
    <table className={`${styles.table} ${styles.tableRowHover}`}>
```

- [ ] **Step 3: Migrate themes, users, catalog, mappings, dashboard, and overview pages**

Use the same shared classes for cards, tables, and filters. Keep existing data fetching and route behavior unchanged.

- [ ] **Step 4: Migrate the stats pages away from the dark-theme component stack**

Replace the repeated dark gradient metric blocks with `styles.metricCard`, `styles.chartPanel`, `styles.toolbar`, and a shared tooltip helper where needed.

- [ ] **Step 5: Run the page style test**

Run: `npm test -- src/app/admin/admin-style.test.ts`

Expected: pass once all page imports and helper references are removed.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/dashboard/page.tsx src/app/admin/movies/page.tsx src/app/admin/themes/page.tsx src/app/admin/users/page.tsx src/app/admin/catalog/page.tsx src/app/admin/catalog/sources/page.tsx src/app/admin/catalog/categories/page.tsx src/app/admin/mappings/page.tsx src/app/admin/movies/new/page.tsx src/app/admin/movies/[id]/page.tsx src/components/admin/MovieEditForm.tsx src/components/admin/CollectSourceManager.tsx src/components/admin/MappingManager.tsx src/components/admin/HealthMonitor.tsx src/components/admin/UserManager.tsx src/components/admin/ThemeButton.tsx
git commit -m "refactor: normalize admin pages onto shared styles"
```

### Task 4: Remove unused half-finished admin UI code

**Files:**
- Delete: `src/app/admin/admin-theme.css`
- Delete: `src/app/admin/admin-layout.tsx`
- Delete: `src/components/admin/AdminButton.tsx`
- Delete: `src/components/admin/AdminCard.tsx`
- Delete: `src/components/admin/AdminTable.tsx`
- Delete: `src/components/admin/LoadingSpinner.tsx`
- Delete: `src/components/admin/PageTransition.tsx`

**Interfaces:**
- Consumes: no remaining imports from the migrated pages.
- Produces: a smaller admin component surface with only the pieces still used by the real shell and pages.

- [ ] **Step 1: Verify nothing still imports the files**

Run: `rg -n "AdminButton|AdminCard|AdminTable|LoadingSpinner|PageTransition|admin-theme\.css|admin-layout" src/app src/components`

Expected: no matches except possibly in historical docs or generated artifacts.

- [ ] **Step 2: Delete the unused files**

Remove the files listed above only after the grep returns clean.

- [ ] **Step 3: Run the page style test again**

Run: `npm test -- src/app/admin/admin-style.test.ts`

Expected: pass and confirm no stale references remain.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/admin-theme.css src/app/admin/admin-layout.tsx src/components/admin/AdminButton.tsx src/components/admin/AdminCard.tsx src/components/admin/AdminTable.tsx src/components/admin/LoadingSpinner.tsx src/components/admin/PageTransition.tsx
git commit -m "chore: remove unused admin design system"
```

### Task 5: Verify the admin frontend end to end

**Files:**
- Modify: `src/app/admin/admin-style.test.ts` if any final mismatch is discovered.

**Interfaces:**
- Consumes: the migrated admin pages and shared CSS classes.
- Produces: verified build, verified tests, and verified admin login rendering.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npx next build --webpack`

Expected: build passes with no App Router or client boundary errors.

- [ ] **Step 3: Restart and verify production**

Run: `pm2 restart movieflex && pm2 save`

Expected: production app comes back online.

- [ ] **Step 4: Log in with the provided admin account and inspect key pages**

Verify these routes after login:

- `/admin`
- `/admin/movies`
- `/admin/themes`
- `/admin/users`
- `/admin/dashboard`
- `/admin/stats/movies`
- `/admin/stats/categories`
- `/admin/stats/users`
- `/admin/stats/trends`
- `/admin/catalog/sources`
- `/admin/catalog/categories`
- `/admin/mappings`

Expected:

- Same shell and spacing across all pages.
- Buttons show hover/press feedback.
- Page navigation shows a light transition.
- No stale dark-theme imports or broken layouts.

- [ ] **Step 5: Final review and handoff**

Confirm there are no unused admin frontend imports left in active code, and summarize any residual non-blocking follow-ups only if they remain.
