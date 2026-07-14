# Anime Mascot and Home Carousel Progress

## Completed

- Copied all six supplied Furina PNG pose assets without chroma-key processing; a local alpha check verified six RGBA images with transparent pixels.
- Added a four-item home carousel sourced by `viewCount DESC, id ASC`, including arrow keys, touch swipe, dots, pause-on-hover/focus and reduced-motion handling.
- Added the Furina water-ripple mascot with six rotating poses, ten stage-proud Chinese lines, 180ms press-to-drag behavior, viewport clamping and local position persistence.
- Mounted the mascot only in the public root layout; its client route guard excludes admin, dashboard and movie playback routes.
- Updated the public home rails into a rounded ice-blue anime theatre treatment.

## Test evidence

- RED: three initial focused suites failed because `home-carousel`, `furina-mascot` and public home integration did not exist.
- RED: the public-shell contract then failed for the missing carousel integration and mascot mount.
- GREEN: `npm test -- src/lib/home-carousel.test.ts src/app/home-anime-contract.test.ts src/components/mascot/furina-mascot.test.ts` passed: 3 files, 7 tests.

## Handoff

- Full suite, production build and service restart are intentionally left to the coordinating agent so parallel dashboard work can be included in one final verification/deploy.

## Review follow-up

- Replaced the dialogue list with the exact ten approved lines from the design specification.
- Added mobile dimensions of 128×166, timed speech expiration, low-frequency idle speech, automatic pose cycling, image-failure omission, and reduced-motion guards for all automatic behavior.
- Suppressed the mascot on login, registration, user-area and playback/admin/dashboard routes, and while editable controls are focused.
- Added distinct `立即播放` and `详情介绍` actions to every carousel slide.
- Follow-up focused verification: 3 files, 9 tests passed.

## Quality review follow-up

- Made storage reads/writes safe and deferred drag-position persistence until release; cleared ripple, speech and press timers during cleanup.
- Ensured native button keyboard activation is handled once while pointer clicks suppress their trailing synthetic click; pointer cancellation and lost capture are cleanup-only.
- Added active-index clamping for a shrinking carousel list and independent hover/focus pause state.
- Added a left-edge speech-bubble direction and focused behavior contracts; review-focused verification passed 3 files and 12 tests.

## Final quality follow-up

- Returned an explicitly narrowed `{ x, y }` coordinate after storage parsing so TypeScript can verify the mascot position contract.
- Replaced the persistent pointer-click suppression ref with `event.detail === 0`: pointer interaction runs from pointer-up, while keyboard activation runs once from the native button click. A missing trailing pointer click can no longer suppress a later keyboard action.
- Final focused verification passed 3 files and 13 tests; `npx tsc --noEmit` completed successfully.
