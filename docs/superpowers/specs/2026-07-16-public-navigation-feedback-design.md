# Public Navigation Feedback Design

## Goal

Make public top-navigation switches feel responsive for 首页, 电影, 剧集, 综艺, and 动漫. The current navigation only changes color on hover, and `a:first-child` makes 首页 look active even when the user is browsing category pages. Users need immediate feedback after clicking a navigation item and a clear indication of the currently active section.

## Scope

- Update only the public navigation experience and the public movie listing transition feel.
- Cover these nav destinations: `/`, `/movies?type=1`, `/movies?type=10`, `/movies?type=19`, `/movies?type=24`.
- Preserve existing routes, query parameters, search form behavior, login/account dropdown behavior, and admin UI.
- Continue running the preview on port `3070` without changing production port `3060`.

## Out Of Scope

- No route or data-fetching changes.
- No new animation library.
- No full-app page transition framework.
- No redesign of the header layout or mobile navigation structure.
- No admin navigation changes.

## Navigation State Design

`Navbar` will become route-aware using Next navigation hooks. It should compare the current pathname and `type` search parameter against a small nav item list. 首页 is active only when the current pathname is `/`. The four media categories are active only when the pathname is `/movies` and the `type` query matches their configured value.

Each nav link will receive an explicit class for active and pending states rather than relying on `a:first-child`. The active state should use a compact pill or underline treatment that fits the existing warm paper and water-blue frontend style.

## Pending Feedback Design

When a user clicks one of the five public nav links, that item should immediately enter a pending state. Pending feedback should be visible before the destination finishes rendering:

- Slight pressed transform.
- Brighter foreground color.
- A small animated underline or shimmer strip.
- A thin header-level loading light bar while a nav transition is pending.

The pending state should clear when the current route matches the clicked destination. If the user clicks the already-active route, the component should not show a stuck pending state.

## Movie Listing Transition Design

The `/movies` listing content should gain a subtle entry animation so category changes do not feel like a hard refresh. The animation should be restrained: a short opacity fade and small vertical rise on the filter/list container. Under `prefers-reduced-motion: reduce`, the animation should be removed.

## Accessibility

- Use native `Link` elements.
- Active links should expose `aria-current="page"`.
- Pending feedback should not rely on color alone; shape or motion should also change.
- Keep `:focus-visible` clearly visible.
- Respect `prefers-reduced-motion: reduce`.

## Testing

- Add a contract test that `Navbar` uses `usePathname` and `useSearchParams`.
- Add a contract test that nav links support active and pending class names.
- Add a CSS contract test for `.primaryNav a:active`, `.navLinkActive`, `.navLinkPending`, and `.navProgress`.
- Add a CSS contract test that movie listing content has a route-entry animation and reduced-motion fallback.
- Run `npm test -- --run`.
- Run `npx next build --webpack`.
- Restart the `movieflex-home-preview` PM2 process on port `3070` and smoke test `/`, `/movies?type=1`, `/movies?type=10`, `/movies?type=19`, and `/movies?type=24`.

## Acceptance Criteria

- 首页 is not highlighted when browsing the category pages.
- 电影, 剧集, 综艺, and 动漫 highlight correctly by `type` query value.
- Clicking a nav item produces immediate visual feedback before the route settles.
- Header shows a subtle loading indicator during pending nav transitions.
- `/movies` category switches feel smoother due to subtle content entry motion.
- Keyboard focus remains visible and reduced-motion users are respected.
