# Agent notes

- This is a Vite/React single-page app. The GitHub Pages base path is `/schedule-2026/` in `vite.config.js`; do not remove it.
- Schedule data is committed as `src/data/schedule.xml` and parsed in `src/main.jsx` with `DOMParser`. Updating the schedule should normally mean replacing only that XML file, as long as the upstream `day > room > event` shape remains unchanged.
- The visual timeline is duration-based: `minuteHeight` controls vertical density, event `top`/`height` are computed from start/duration, and each day intentionally adds one empty hour after the last session.
- Card interaction is deliberately different for mouse/touch:
  - hover expands a card only visually;
  - first click/tap expands a card;
  - second click/tap on the same expanded card opens details;
  - star clicks must not bubble to the card.
- On click/keyboard expansion, the card scrolls into view after the grow animation. Do not run that scroll for hover expansion.
- Starred sessions are stored in `localStorage` under `opensouthcode-2026-starred-sessions`; the toolbar star filters by that state while dimming non-matches instead of hiding cards.
- Phone/mobile behavior matters. Test with Chrome device emulation or a real phone when changing toolbar layout, horizontal page overflow, card expansion, or the details modal.
- The modal uses `window.visualViewport` CSS variables to fit mobile browser viewports correctly. Preserve that logic when changing modal sizing.
- GitHub Pages deploys from `main` using the Pages Actions workflow in `.github/workflows/deploy.yml`; there is no `gh-pages` branch.
