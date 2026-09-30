# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm ci
```

This installs dependencies from `package-lock.json`, using Node.js 22 (the version CI uses).

## Local Development

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory. Because `onBrokenLinks` is
set to `'throw'` in `docusaurus.config.ts`, a broken link fails the build — a clean build
doubles as the link check.

You can preview the built site locally with:

```bash
npm run serve
```

## Deployment

There is no manual deploy step. `.github/workflows/deploy-docs.yml` runs on every push to `main`
that changes `documentation/**` (or the workflow file itself), and can also be started by hand
via `workflow_dispatch`. It runs `npm ci` and `npm run build` in `documentation/`, then publishes
`documentation/build` to GitHub Pages with `actions/deploy-pages`.

The `deploy` script in `package.json` (Docusaurus's own `gh-pages` push) is not used.
