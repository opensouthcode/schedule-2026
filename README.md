# OpenSouthCode 2026 schedule

Interactive React schedule for OpenSouthCode 2026, designed for GitHub Pages.

Based on official source from https://www.opensouthcode.org/conferences/opensouthcode2026/schedule

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Update the schedule

The app uses the official OpenSouthCode XML schedule directly from
`src/data/schedule.xml`. If the upstream schedule changes, replace that file
and rebuild:

```bash
curl -fsSL https://www.opensouthcode.org/conferences/opensouthcode2026/schedule \
  -o src/data/schedule.xml
npm run build
```

No code changes are needed as long as the XML keeps the same structure
(`day > room > event`) and the same time/duration formats.

## Publish

The included GitHub Actions workflow builds the app on pushes to `main`, uploads
`dist` as a GitHub Pages artifact, and deploys it with GitHub Pages Actions. The
site is published at:

https://opensouthcode.github.io/schedule-2026/

Manual publishing with `npm run deploy` is not needed for the normal workflow.
