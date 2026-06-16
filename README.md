# OpenSouthCode 2026 schedule

Interactive React schedule for OpenSouthCode 2026, designed for GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publish

The included GitHub Actions workflow builds the app on pushes to `main` and
force-publishes `dist` to the `gh-pages` branch. Manual publishing is also
available with:

```bash
npm run deploy
```