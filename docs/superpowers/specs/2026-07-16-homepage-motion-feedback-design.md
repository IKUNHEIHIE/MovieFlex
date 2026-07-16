# Homepage Motion And Click Feedback Design

## Goal

Improve the public homepage feel without changing content, routing, data queries, or the admin interface. The current popular carousel swaps the active image and copy immediately, which makes slide changes feel abrupt. Public clickable elements also lack a consistent pressed state, so clicks can feel unresponsive, especially on touch devices.

## Scope

- Enhance the homepage popular carousel transition.
- Add lightweight click feedback to public-facing interactive elements touched by the homepage experience.
- Preserve the existing carousel controls: autoplay, hover/focus pause, keyboard arrows, pointer swipe, dots, and CTA links.
- Preserve accessibility behavior, including focus-visible states and `prefers-reduced-motion` support.
- Build and run a preview on port `3070` for acceptance, without changing the existing production process on port `3060`.

## Out Of Scope

- No admin UI changes.
- No carousel data model or ranking changes.
- No new animation library.
- No sound, haptics, or exaggerated game-style effects.
- No redesign of the homepage layout beyond motion and pressed states.

## Carousel Transition Design

The carousel will use a soft crossfade between the previous and active slide image. When the active index changes, the previous image remains temporarily underneath or above the new image long enough for a controlled fade. The active image fades in while easing from a subtle scale, creating a smoother stage-light effect that matches the existing water-blue visual language.

The text panel will re-animate on slide changes with a short opacity and vertical-rise motion. The animation should be calm, around `550ms` to `700ms`, and should not block interaction. Buttons, dots, keyboard navigation, and swipe gestures remain available during the transition.

If `prefers-reduced-motion: reduce` is active, the component should avoid slide transition animation and continue to update content immediately.

## Click Feedback Design

Public interactive elements should feel pressed when clicked or tapped. The feedback should be subtle and consistent:

- Primary and secondary homepage carousel buttons slightly compress and lower on `:active`.
- Carousel arrow buttons and dots shorten their shadow or brighten less while pressed.
- Public movie cards and prominent front-page links gain a small pressed transform where existing styles allow it.
- Focus-visible styles remain clear and are not replaced by mouse-only hover states.
- Transitions are disabled or reduced under `prefers-reduced-motion: reduce`.

The target feel is refined and tactile, not bouncy or playful. Use CSS transforms such as `translateY(1px) scale(0.98)` and small shadow changes.

## Implementation Approach

Keep changes local to the existing public frontend structure:

- Update `src/components/home/PopularCarousel.tsx` to track the previous slide image during index changes and to key/retrigger copy animation.
- Update `src/components/home/PopularCarousel.module.css` with crossfade layers, text transition classes, active pressed states, and reduced-motion fallbacks.
- Inspect homepage/public card styles and add minimal `:active` feedback to the existing CSS modules or global public styles that own those elements.
- Avoid large refactors. Keep the carousel component recognizable and preserve its current public API.

## Testing

- Add or update regression tests that verify the carousel includes transition-layer structure and active transition classes.
- Add or update style contract tests for public click feedback styles.
- Run `npm test -- --run`.
- Run `npx next build --webpack`.
- Start a PM2 preview process on port `3070` and smoke test the homepage with HTTP `200`.

## Acceptance Criteria

- Switching carousel slides no longer appears as an instant hard cut.
- Text and background changes feel synchronized and calm.
- Homepage CTA controls, carousel controls, and public card/link interactions show visible pressed feedback.
- Keyboard navigation remains usable.
- Reduced-motion users do not get unnecessary animation.
- Port `3060` production remains untouched while the preview runs on `3070`.
