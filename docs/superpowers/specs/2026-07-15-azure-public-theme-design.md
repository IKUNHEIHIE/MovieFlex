# Azure Public Theme Design

## Purpose

Make `azure` a visibly distinct, production-ready public-facing theme instead
of a CSS token override. Retain the current `ice-blue` public experience and
leave the administration area unchanged.

## Scope

- Apply the Azure layout and Ant Design tokens only to public routes when the
  persisted active theme is `azure`.
- Keep `/admin` outside the Azure public shell.
- Use the existing theme setting (`system_settings.active_theme`) as the single
  source of truth. No client-side duplicate theme state is introduced.
- Bring the public home page, navigation, library, search, movie detail,
  authentication pages, user pages, shared movie cards, and category cloud into
  the Azure visual system.
- Correct public category links to use canonical category slugs and resolve
  their database IDs on the server. Do not retain hard-coded category IDs.

## Route And Theme Behavior

`RootLayout` reads `getActiveThemeKey()` on the server and emits the current
theme key as `data-theme`, along with its stylesheet.

When the key is `azure`, public routes use `PublicAppShell`. That shell provides
the Azure Ant Design `ConfigProvider` tokens, common public navigation, session
context, and public-only visual effects. It deliberately bypasses `/admin` so
the administration UI preserves its current operational layout and styling.

When the key is `ice-blue`, the application continues to render the existing
public shell and styles. Theme switching remains an admin-only mutation through
`PATCH /api/admin/themes/active`, then reloads the document so server-rendered
layout selection and stylesheet selection are both refreshed.

## Azure Visual System

Azure uses a light blue palette with `#3a8bbf` as the primary action color,
white elevated surfaces, cool-blue borders, and small-to-medium 4/8/12px
radii. Ant Design component tokens express those values for controls introduced
in the public pages; existing semantic CSS classes use the same CSS variables.

The public home page uses a restrained production layout: featured carousel,
recommendation rail, recent additions, category rails, and a category cloud at
the bottom. The cloud also appears in the user workspace, not in the initial
viewport. Blur/fade entrance motion is limited to the hero, category area, and
first recommendation rail. `prefers-reduced-motion` disables those animations
and hover movement.

## Categories

The public category contract uses `movie`, `tv-series`, `variety`, and `anime`.
`categoryHref()` creates public category URLs from those slugs. Server-side
resolution expands a canonical category to its direct children where required,
so links stay correct when database IDs differ across environments. Collection
logic also resolves category records by canonical slug and reports a missing
category configuration rather than assigning an unrelated ID.

## Components And Boundaries

- `PublicAppShell`: Azure-only public provider and shared layout boundary.
- `Navbar`: shared public navigation, updated to use canonical category links.
- `CategoryCloud`: isolated interactive Azure category presentation, rendered
  only on the home page footer and user workspace.
- `MovieCard`: shared presentation updated through a local CSS module to avoid
  global style coupling.
- Page-level CSS modules: Azure page composition and responsive behavior while
  preserving each route's existing data fetching and business logic.
- `public-categories`: canonical slugs, URL construction, and database ID
  resolution, independent from rendering code.

## Error Handling

If the active-theme lookup fails, the layout falls back to `ice-blue`, matching
the existing safety behavior. If a canonical category is absent, category
resolution returns an explicit configuration failure rather than silently using
an arbitrary numeric type ID. Public pages continue to render available content
when an optional rail has no movies.

## Verification

- Unit tests cover canonical slug-to-URL mapping and category ID expansion.
- Existing test suite must remain green after integration.
- Build must succeed with the workspace `.env` configuration.
- Browser verification compares `ice-blue` and `azure` at the same public URLs:
  home, library, search, movie detail, login, registration, profile, favorites,
  and history.
- Verify that Azure loads `/themes/azure/style.css`, renders the Azure public
  shell, and differs structurally as well as chromatically from Ice Blue.
- Verify `/admin` retains its current layout under both active theme values.
- Verify the reduced-motion media setting removes Azure entrance animations.

## Non-Goals

- Redesigning administration pages.
- Adding user-selectable per-session themes.
- Changing movie recommendation algorithms, authentication behavior, or movie
  data schemas beyond the category-resolution correction needed for public
  links.
